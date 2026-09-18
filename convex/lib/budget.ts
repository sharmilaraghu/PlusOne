import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { allocateSlotBudgets, splitByWeights } from "./templates";

/**
 * The one place the plan's money maths lives.
 *
 * `weddings.create` seeds a wedding so that the functions' budgets add up to the
 * wedding total, and each vendor need's budget is drawn from the functions it
 * serves. Every later edit — removing a function, re-splitting the functions'
 * budgets, removing a need, changing the total — has to leave that true, so they
 * all come back here instead of re-deriving the sums.
 *
 * After this runs:
 *   sum(events.budget) === wedding.totalBudget === sum(slots.budget) === sum(budgetLines.planned)
 * (the slot sums hold whenever the wedding has at least one vendor need).
 *
 * `committed` and `paid` on a budget line are the couple's real money and are
 * never touched here.
 */
export async function rebalanceWeddingBudget(
  ctx: MutationCtx,
  weddingId: Id<"weddings">,
  /** Optional new weights per function; anything omitted keeps its current budget as its weight. */
  eventWeights?: Map<Id<"events">, number>,
): Promise<void> {
  const wedding = await ctx.db.get(weddingId);
  if (!wedding) return;

  const events = (
    await ctx.db
      .query("events")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", weddingId))
      .take(50)
  ).sort((a, b) => a.order - b.order);

  // Each need's weight is read off what it spends per function it serves, so a
  // need serving a single function keeps its standing when the functions' budgets
  // move — weighting by the raw budget would shrink it a little more every edit.
  const oldEventBudget = new Map(events.map((e) => [e._id, e.budget]));

  // ---- 1. The functions' budgets always add up to the wedding total ---------
  const eventBudgets: number[] = [];
  let eventBudgetsMoved = false;
  if (events.length > 0) {
    let weights = events.map((e) => eventWeights?.get(e._id) ?? e.budget);
    if (weights.every((w) => w <= 0)) weights = events.map(() => 1);
    const split = splitByWeights(wedding.totalBudget, weights);
    for (let i = 0; i < events.length; i++) {
      eventBudgets.push(split[i]);
      if (events[i].budget !== split[i]) {
        await ctx.db.patch(events[i]._id, { budget: split[i] });
        eventBudgetsMoved = true;
      }
    }
  }

  // ---- 2. Each need's budget is drawn from the functions it serves ----------
  const slots = await ctx.db
    .query("vendorSlots")
    .withIndex("by_weddingId", (q) => q.eq("weddingId", weddingId))
    .take(200);
  if (slots.length === 0) return;

  const eventIndexById = new Map(events.map((e, i) => [e._id, i]));
  const slotPlans = slots.map((slot) => {
    const eventIndexes = slot.eventIds
      .map((id) => eventIndexById.get(id))
      .filter((i): i is number => i !== undefined);
    const servedBefore = slot.eventIds.reduce((a, id) => a + (oldEventBudget.get(id) ?? 0), 0);
    const pct = servedBefore > 0 ? slot.budget / servedBefore : slot.budget > 0 ? slot.budget : 1;
    return { pct, eventIndexes };
  });

  // Nothing moved and the needs already add up: leave their budgets exactly as
  // they are (re-deriving them would nudge the numbers for no reason) and only
  // make sure the budget lines still mirror them.
  const target = eventBudgets.reduce((a, b) => a + b, 0);
  const inSync = slots.reduce((a, s) => a + s.budget, 0) === target;
  const alloc = !eventBudgetsMoved && inSync ? slots.map((s) => s.budget) : allocateSlotBudgets(eventBudgets, slotPlans);

  // A function nobody serves yet (or a rounding crumb) would otherwise leave the
  // needs adding up to less than the wedding total; spread it over the needs.
  const allocated = alloc.reduce((a, b) => a + b, 0);
  const leftover = Math.round(target - allocated);
  if (leftover > 0) {
    const extra = splitByWeights(leftover, slotPlans.map((p) => p.pct));
    for (let i = 0; i < alloc.length; i++) alloc[i] += extra[i];
  }

  // ---- 3. Mirror onto the slots and their budget lines ----------------------
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const budget = alloc[i];
    if (slot.budget !== budget) await ctx.db.patch(slot._id, { budget });
    const eventId = slot.eventIds.length === 1 ? slot.eventIds[0] : undefined;
    const line = await ctx.db
      .query("budgetLines")
      .withIndex("by_slotId", (q) => q.eq("slotId", slot._id))
      .first();
    if (line) {
      await ctx.db.patch(line._id, { planned: budget, eventId });
    } else {
      await ctx.db.insert("budgetLines", {
        weddingId,
        slotId: slot._id,
        eventId,
        label: slot.title,
        planned: budget,
        committed: 0,
        paid: 0,
      });
    }
  }
}
