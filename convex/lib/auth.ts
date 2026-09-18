import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { ActivityType, Role } from "./validators";

const ROLE_RANK: Record<Role, number> = { viewer: 0, planner: 1, owner: 2 };

/** Throws a readable ConvexError when the caller is not signed in. */
export async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Please sign in to continue.");
  return userId;
}

/**
 * Verifies the caller is a member of the wedding with at least `minRole`.
 * Role order: viewer < planner < owner.
 */
export async function requireMember(
  ctx: QueryCtx | MutationCtx,
  weddingId: Id<"weddings">,
  minRole: Role = "viewer",
): Promise<{ userId: Id<"users">; member: Doc<"members">; wedding: Doc<"weddings"> }> {
  const userId = await requireUserId(ctx);
  const member = await ctx.db
    .query("members")
    .withIndex("by_weddingId_and_userId", (q) => q.eq("weddingId", weddingId).eq("userId", userId))
    .unique();
  if (!member) throw new ConvexError("You are not a member of this wedding.");
  if (ROLE_RANK[member.role] < ROLE_RANK[minRole]) {
    throw new ConvexError(`This action requires the ${minRole} role (you are a ${member.role}).`);
  }
  const wedding = await ctx.db.get(weddingId);
  if (!wedding) throw new ConvexError("Wedding not found.");
  return { userId, member, wedding };
}

/** Human label for the acting user, used in the activity feed. */
export async function actorLabelFor(ctx: QueryCtx | MutationCtx, userId: Id<"users">): Promise<string> {
  const user = await ctx.db.get(userId);
  return user?.name ?? user?.email ?? "Someone";
}

export async function logActivity(
  ctx: MutationCtx,
  args: {
    weddingId: Id<"weddings">;
    actorUserId?: Id<"users">;
    actorLabel?: string;
    type: ActivityType;
    text: string;
    refs?: {
      vendorId?: Id<"vendors">;
      threadId?: Id<"threads">;
      slotId?: Id<"vendorSlots">;
      guestId?: Id<"guests">;
      eventId?: Id<"events">;
    };
  },
): Promise<Id<"activity">> {
  const actorLabel =
    args.actorLabel ?? (args.actorUserId ? await actorLabelFor(ctx, args.actorUserId) : "PlusOne");
  return await ctx.db.insert("activity", {
    weddingId: args.weddingId,
    actorUserId: args.actorUserId,
    actorLabel,
    type: args.type,
    text: args.text,
    refs: args.refs,
  });
}

/** Clamp a client-supplied limit to a sane integer range. */
export function clampLimit(limit: number | undefined, fallback: number, max: number): number {
  if (limit === undefined || !Number.isFinite(limit)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(limit)));
}
