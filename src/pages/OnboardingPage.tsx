import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { CultureTemplate } from "../../convex/lib/validators";
import {
  CURRENCIES,
  TRADITIONS,
  VIBES,
  extraNeeds,
  needsForTemplate,
  rebalance,
  rowsForTemplate,
  type FunctionRow,
  type NeedRow,
} from "../components/onboarding/shared";
import { addDaysIso, money, shortDate } from "../lib/format";
import { Icon } from "../components/ui/Icon";

/** Named, so the couple can see where they are and how much is left. */
const STEPS = ["The couple", "The days", "Your guests", "The budget", "Who you need", "The feel"];

/** One photograph per step, so the form feels like a wedding and not a tax return. */
const PLATES = [
  { src: "/onboarding-1.jpg", alt: "A couple laughing together in a courtyard before their ceremony" },
  { src: "/onboarding-1.jpg", alt: "A couple laughing together in a courtyard before their ceremony" },
  { src: "/onboarding-2.jpg", alt: "A long banquet table laid with linen and garden roses" },
  { src: "/onboarding-2.jpg", alt: "A long banquet table laid with linen and garden roses" },
  { src: "/onboarding-3.jpg", alt: "Guests dancing under string lights at a reception" },
  { src: "/onboarding-3.jpg", alt: "Guests dancing under string lights at a reception" },
];

const FEEL_STEP = 5;
const NEEDS_STEP = 4;

export function OnboardingPage() {
  const navigate = useNavigate();
  const create = useMutation(api.weddings.create);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    partnerA: "",
    partnerB: "",
    startDate: "",
    endDate: "",
    city: "",
    area: "",
    country: "",
    template: "hindu" as CultureTemplate,
    currency: "USD",
    totalBudget: 40000,
    inspirationUrl: "",
    stylePalette: "",
    styleFormality: "smart" as "relaxed" | "smart" | "formal",
  });
  const [vibes, setVibes] = useState<string[]>([]);
  const [rows, setRows] = useState<FunctionRow[]>([]);
  const [needs, setNeeds] = useState<NeedRow[]>([]);
  const [undecided, setUndecided] = useState(false);
  const set = <K extends keyof typeof form>(k: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: value }));

  const name = useMemo(() => {
    const a = form.partnerA.trim();
    const b = form.partnerB.trim();
    return a && b ? `${a} & ${b}` : a || b || "Our wedding";
  }, [form.partnerA, form.partnerB]);

  const start = form.startDate;
  const end = form.endDate || form.startDate;
  const allocated = rows.reduce((sum, r) => sum + (Number(r.budget) || 0), 0);
  const left = form.totalBudget - allocated;
  const guestPeak = rows.reduce((max, r) => Math.max(max, Number(r.guestCount) || 0), 0);

  /** Choosing a tradition fills in every later step, so the defaults path is three clicks. */
  function chooseTemplate(template: CultureTemplate) {
    set("template", template);
    setRows(rowsForTemplate(template, start, end, form.totalBudget));
    setNeeds(needsForTemplate(template));
  }

  function patchNeed(key: string, patch: Partial<NeedRow>) {
    setNeeds((ns) => ns.map((n) => (n.key === key ? { ...n, ...patch } : n)));
  }

  /** "We're still deciding" pencils in a date a year out rather than blocking them. */
  function pencilInADate(on: boolean) {
    setUndecided(on);
    if (!on) return;
    const iso = addDaysIso(new Date().toISOString().slice(0, 10), 365);
    set("startDate", iso);
    if (rows.length) setRows(rowsForTemplate(form.template, iso, form.endDate || iso, form.totalBudget));
  }

  const wanted = needs.filter((n) => n.state !== "none");
  const bookedCount = needs.filter((n) => n.state === "booked").length;
  const committedAlready = needs
    .filter((n) => n.state === "booked")
    .reduce((sum, n) => sum + (Number(n.committed) || 0), 0);

  function patchRow(key: string, patch: Partial<FunctionRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  const canContinue =
    step === 0
      ? Boolean(form.partnerA.trim() && form.partnerB.trim() && form.startDate && form.city.trim())
      : step === 1
        ? rows.length > 0 && rows.every((r) => r.name.trim() && r.date)
        : step === 3
          ? form.totalBudget > 0
          : step === NEEDS_STEP
            ? wanted.length > 0
            : true;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const weddingId = await create({
        name,
        partnerA: form.partnerA.trim(),
        partnerB: form.partnerB.trim(),
        startDate: start,
        endDate: end,
        city: form.city.trim(),
        area: form.area.trim() || undefined,
        country: form.country.trim() || undefined,
        currency: form.currency,
        totalBudget: Number(form.totalBudget),
        template: form.template,
        inspirationUrl: form.inspirationUrl.trim() || undefined,
        styleVibes: vibes.length ? vibes : undefined,
        stylePalette: form.stylePalette.trim() || undefined,
        styleFormality: form.styleFormality,
        events: rows.map((r) => ({
          name: r.name.trim(),
          date: r.date,
          guestCount: Number(r.guestCount) || 0,
          budget: Number(r.budget) || 0,
        })),
        needs: wanted.length
          ? wanted.map((n) => ({
              category: n.category,
              title: n.title.trim(),
              pct: n.pct,
              eventNames: n.eventNames,
              booked: n.state === "booked",
              committed: n.state === "booked" ? Number(n.committed) || undefined : undefined,
            }))
          : undefined,
      });
      navigate(`/w/${weddingId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main id="main" className="mx-auto grid w-full max-w-[86rem] gap-8 px-5 py-8 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:py-10">
      {/* The photograph carries the feeling; the form carries the work. */}
      <figure className="relative hidden overflow-hidden rounded-[20px] bg-line lg:block">
        <img
          src={PLATES[step].src}
          alt={PLATES[step].alt}
          className="h-full w-full object-cover"
          loading="eager"
        />
      </figure>

      <div className="min-w-0">
        <Link to="/" className="text-sm text-muted hover:text-accent">← My weddings</Link>
        <h1 className="mt-4 text-[2.2rem] leading-tight">
          Tell us about <em>{name}</em>
        </h1>

        <ol className="mt-6 flex flex-wrap gap-x-5 gap-y-2" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
          {STEPS.map((label, i) => (
            <li key={label} className="min-w-0">
              <button
                type="button"
                disabled={i > step && rows.length === 0}
                onClick={() => setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className={`border-b-2 pb-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-45 ${
                  i === step
                    ? "border-accent font-medium text-accent"
                    : i < step
                      ? "border-accent/30 text-muted hover:text-accent"
                      : "border-line text-quiet hover:text-muted"
                }`}
              >
                <span className="tabular-nums">{i + 1}.</span> {label}
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-quiet">
          None of this is final — you can change every bit of it once you are inside.
          {step >= 1 && rows.length > 0 && (
            <button type="button" className="ml-3 text-accent underline underline-offset-2" onClick={() => setStep(FEEL_STEP)}>
              Use the defaults
            </button>
          )}
        </p>

      <div className="card mt-5 p-6 md:p-7">
        {step === 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Your name" id="pa"><input id="pa" className="input" value={form.partnerA} onChange={(e) => set("partnerA", e.target.value)} placeholder="Anita" /></Field>
            <Field label="Your partner" id="pb"><input id="pb" className="input" value={form.partnerB} onChange={(e) => set("partnerB", e.target.value)} placeholder="Sam" /></Field>
            <Field label="First day" id="sd">
              <input id="sd" type="date" className="input" value={form.startDate} onChange={(e) => { set("startDate", e.target.value); if (rows.length) setRows(rowsForTemplate(form.template, e.target.value, form.endDate || e.target.value, form.totalBudget)); }} />
            </Field>
            <Field label="Last day" id="ed" hint="Leave blank for a single day.">
              <input id="ed" type="date" className="input" min={form.startDate} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </Field>
            <label className="flex items-start gap-2.5 text-sm text-muted sm:col-span-2">
              <input type="checkbox" className="mt-1" checked={undecided} onChange={(e) => pencilInADate(e.target.checked)} />
              <span>
                We're still deciding on a date.
                {undecided && form.startDate && (
                  <span className="block text-xs text-quiet">
                    Pencilled in for {shortDate(form.startDate)} so PlusOne can get going. Change it whenever you like.
                  </span>
                )}
              </span>
            </label>
            <Field label="City" id="city"><input id="city" className="input" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Austin" /></Field>
            <Field label="Neighbourhood" id="area" hint="Optional. Narrows vendor searches, e.g. Bandra West.">
              <input id="area" className="input" value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="East Austin" />
            </Field>
            <Field label="Country" id="country"><input id="country" className="input" value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="United States" /></Field>
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="text-sm leading-relaxed text-muted">
              Pick the tradition closest to yours and PlusOne fills in the functions. Rename them, move them, or add your own.
            </p>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {TRADITIONS.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => chooseTemplate(t.id)}
                    aria-pressed={form.template === t.id && rows.length > 0}
                    className={`w-full rounded-[14px] border p-4 text-left transition ${
                      form.template === t.id && rows.length > 0 ? "border-accent bg-accent-soft" : "border-line bg-cream hover:bg-accent-soft/50"
                    }`}
                  >
                    <p className="display text-lg">{t.name}</p>
                    <p className="mt-0.5 text-xs text-accent">{t.days}</p>
                    <p className="mt-1 text-xs leading-relaxed text-quiet">{t.blurb}</p>
                  </button>
                </li>
              ))}
            </ul>

            {rows.length > 0 && (
              <div className="mt-7 border-t border-line pt-5">
                <p className="label">Your functions</p>
                <ul className="grid gap-2">
                  {rows.map((r) => (
                    <li key={r.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                      <input aria-label="Function name" className="input" value={r.name} onChange={(e) => patchRow(r.key, { name: e.target.value })} />
                      <input aria-label={`Date for ${r.name}`} type="date" className="input w-[10.5rem]" value={r.date} min={start} onChange={(e) => patchRow(r.key, { date: e.target.value })} />
                      <button
                        type="button"
                        className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-accent-soft hover:text-accent disabled:opacity-40"
                        onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                        disabled={rows.length <= 1}
                        aria-label={`Remove ${r.name}`}
                      >
                        <Icon name="close" size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn-quiet btn-sm mt-3"
                  onClick={() =>
                    setRows((rs) => [
                      ...rs,
                      { key: `own-${Date.now()}`, name: "", date: addDaysIso(start || new Date().toISOString().slice(0, 10), rs.length), guestCount: 100, budget: 0 },
                    ])
                  }
                >
                  <Icon name="plus" size={15} /> Add a function
                </button>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-sm leading-relaxed text-muted">How many people are you expecting at each one? Rough numbers are fine.</p>
            <ul className="mt-4 grid gap-2">
              {rows.map((r) => (
                <li key={r.key} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line py-2.5 last:border-0">
                  <span>
                    <span className="display text-lg">{r.name}</span>
                    <span className="ml-2 text-xs text-quiet">{shortDate(r.date)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <input
                      aria-label={`Guests at ${r.name}`}
                      type="number"
                      min={0}
                      step={10}
                      className="input w-28 text-right"
                      value={r.guestCount}
                      onChange={(e) => patchRow(r.key, { guestCount: Number(e.target.value) })}
                    />
                    <span className="text-xs text-quiet">guests</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted">Your largest day is <strong className="text-ink">{guestPeak} guests</strong>. Venues and caterers are quoted against that.</p>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="grid gap-5 sm:grid-cols-[1fr_9rem]">
              <Field label="Total budget" id="budget">
                <input
                  id="budget"
                  type="number"
                  min={0}
                  step={500}
                  className="input"
                  value={form.totalBudget}
                  onChange={(e) => {
                    const total = Number(e.target.value);
                    set("totalBudget", total);
                    setRows((rs) => (rs.length ? rebalance(rs, total) : rs));
                  }}
                />
              </Field>
              <Field label="Currency" id="cur">
                <select id="cur" className="input" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            <p className="label mt-6">Split across your functions</p>
            <ul className="grid gap-2">
              {rows.map((r) => (
                <li key={r.key} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line py-2.5 last:border-0">
                  <span>
                    <span className="display text-lg">{r.name}</span>
                    <span className="ml-2 text-xs text-quiet">{r.guestCount} guests</span>
                  </span>
                  <input
                    aria-label={`Budget for ${r.name}`}
                    type="number"
                    min={0}
                    step={100}
                    className="input w-36 text-right"
                    value={r.budget}
                    onChange={(e) => patchRow(r.key, { budget: Number(e.target.value) })}
                  />
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className={`text-sm ${Math.abs(left) < 1 ? "text-muted" : "text-warn"}`}>
                {Math.abs(left) < 1
                  ? "Your split adds up exactly."
                  : left > 0
                    ? `${money(left, form.currency)} left to allocate.`
                    : `${money(-left, form.currency)} over your total.`}
              </p>
              <button type="button" className="btn-quiet btn-sm" onClick={() => setRows((rs) => rebalance(rs, form.totalBudget))}>
                Rebalance the rest
              </button>
            </div>
            <p className="mt-2 text-xs text-quiet">However you leave it, PlusOne scales the split to your total, so you can't get stuck here.</p>
          </div>
        )}

        {step === NEEDS_STEP && (
          <div>
            <p className="text-sm leading-relaxed text-muted">
              Here is everyone a {form.template === "custom" ? "wedding" : `${TRADITIONS.find((t) => t.id === form.template)?.name ?? ""} wedding`}{" "}
              usually needs. Tell us which ones you're still looking for. Anything you've already booked, PlusOne leaves alone —
              it won't go searching or emailing, and what you've spent counts against your budget straight away.
            </p>

            <ul className="mt-5 divide-y divide-line">
              {needs.map((n) => (
                <li key={n.key} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className={`text-[0.98rem] ${n.state === "none" ? "text-quiet line-through" : ""}`}>{n.title}</p>
                    {n.state === "booked" && (
                      <label className="mt-1.5 flex items-center gap-2 text-xs text-quiet">
                        Already spent
                        <input
                          type="number"
                          min={0}
                          step={100}
                          className="input w-32 py-1 text-right text-xs"
                          aria-label={`What you have already spent on ${n.title}`}
                          placeholder="optional"
                          value={n.committed}
                          onChange={(e) => patchNeed(n.key, { committed: e.target.value === "" ? "" : Number(e.target.value) })}
                        />
                        {form.currency}
                      </label>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1 justify-self-start sm:justify-self-end" role="group" aria-label={n.title}>
                    {([
                      { value: "looking" as const, label: "Looking" },
                      { value: "booked" as const, label: "Booked" },
                      { value: "none" as const, label: "Not having one" },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={n.state === opt.value}
                        onClick={() => patchNeed(n.key, { state: opt.value })}
                        className={`rounded-full px-3.5 py-1.5 text-xs transition ${
                          n.state === opt.value
                            ? "bg-accent text-paper"
                            : "bg-cream text-muted shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-accent-soft hover:text-accent"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>

            {extraNeeds(needs).length > 0 && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="label">Anything else?</p>
                <ul className="flex flex-wrap gap-2">
                  {extraNeeds(needs).map((c) => (
                    <li key={c.title}>
                      <button
                        type="button"
                        title={c.hint}
                        onClick={() =>
                          setNeeds((ns) => [
                            ...ns,
                            { key: `extra-${c.title}-${Date.now()}`, category: c.category, title: c.title, state: "looking", committed: "" },
                          ])
                        }
                        className="rounded-full bg-cream px-3.5 py-1.5 text-sm text-muted shadow-[inset_0_0_0_1px_var(--color-line)] transition hover:bg-accent-soft hover:text-accent"
                      >
                        + {c.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-5 text-sm text-muted">
              {wanted.length === 0 ? (
                <span className="text-warn">Pick at least one, or there is nothing for PlusOne to go and find.</span>
              ) : (
                <>
                  PlusOne will go looking for{" "}
                  <strong className="text-ink">{wanted.length - bookedCount}</strong>{" "}
                  {wanted.length - bookedCount === 1 ? "vendor" : "vendors"}
                  {bookedCount > 0 && <> and leave the {bookedCount} you've booked alone</>}
                  {committedAlready > 0 && <>, counting {money(committedAlready, form.currency)} as already spent</>}.
                </>
              )}
            </p>
          </div>
        )}

        {step === FEEL_STEP && (
          <div className="grid gap-6">
            <div>
              <p className="label">The feel you're after</p>
              <ul className="flex flex-wrap gap-2">
                {VIBES.map((vibe) => {
                  const on = vibes.includes(vibe);
                  return (
                    <li key={vibe}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => setVibes((vs) => (on ? vs.filter((v) => v !== vibe) : [...vs, vibe]))}
                        className={`rounded-full px-3.5 py-1.5 text-sm transition ${on ? "bg-accent text-paper" : "bg-cream text-ink shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-accent-soft"}`}
                      >
                        {vibe}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <Field label="Colours" id="palette" hint="However you'd describe them.">
              <input id="palette" className="input" value={form.stylePalette} onChange={(e) => set("stylePalette", e.target.value)} placeholder="Sage and cream, with brass" />
            </Field>

            <div>
              <p className="label">How formal?</p>
              <div className="flex flex-wrap gap-2">
                {(["relaxed", "smart", "formal"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={form.styleFormality === f}
                    onClick={() => set("styleFormality", f)}
                    className={`rounded-full px-4 py-2 text-sm capitalize transition ${form.styleFormality === f ? "bg-accent text-paper" : "bg-cream text-ink shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-accent-soft"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-quiet">This sets the tone of the emails PlusOne writes to vendors.</p>
            </div>

            <Field label="Inspiration link" id="insp" hint="Optional. A Pinterest board, a blog post or a venue page.">
              <input id="insp" type="url" className="input" value={form.inspirationUrl} onChange={(e) => set("inspirationUrl", e.target.value)} placeholder="https://…" />
            </Field>

            <div className="rounded-[14px] bg-accent-soft/60 p-4 text-sm">
              <p className="display text-base">What happens next</p>
              <ul className="mt-2 grid gap-1 text-muted">
                <li>Your {rows.length} functions appear with their guests and budgets.</li>
                <li>A wedding inbox is created, so vendor replies land in one place.</li>
                <li>
                  {wanted.length - bookedCount} vendor {wanted.length - bookedCount === 1 ? "need is" : "needs are"} ready to
                  research{bookedCount > 0 ? `, and the ${bookedCount} you've booked are marked as done` : ""}.
                </li>
              </ul>
            </div>
          </div>
        )}

        {error && <p role="alert" className="mt-5 text-sm text-bad">{error}</p>}

        <div className="mt-7 flex items-center justify-between gap-3">
          <button type="button" className="btn-quiet" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="btn-primary"
              disabled={!canContinue}
              onClick={() => {
                if (step === 0 && rows.length === 0) chooseTemplate(form.template);
                setStep((s) => s + 1);
              }}
            >
              Continue <Icon name="arrow" size={17} />
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={() => void submit()} disabled={busy || rows.length === 0}>
              {busy ? "Building your plan…" : "Create my plan"}
            </button>
          )}
        </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-quiet">{hint}</p>}
    </div>
  );
}
