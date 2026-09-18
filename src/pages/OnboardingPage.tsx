import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { CultureTemplate } from "../../convex/lib/validators";
import { CURRENCIES, TRADITIONS, VIBES, rebalance, rowsForTemplate, type FunctionRow } from "../components/onboarding/shared";
import { addDaysIso, money, shortDate } from "../lib/format";
import { Icon } from "../components/ui/Icon";

const STEPS = ["The couple", "The days", "Your guests", "The budget", "The feel"];

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
  }

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
      });
      navigate(`/w/${weddingId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main id="main" className="mx-auto w-full max-w-[52rem] px-5 py-10">
      <Link to="/" className="text-sm text-muted hover:text-accent">← My weddings</Link>
      <h1 className="mt-4 text-[2.2rem] leading-tight">
        Tell us about <em>{name}</em>
      </h1>

      <ol className="mt-6 flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`h-1 flex-1 rounded-full transition ${i === step ? "bg-accent" : i < step ? "bg-accent/40" : "bg-line"}`}
          />
        ))}
      </ol>
      <p className="mt-2.5 text-sm text-quiet">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
        {step >= 1 && rows.length > 0 && (
          <button type="button" className="ml-3 text-accent underline underline-offset-2" onClick={() => setStep(4)}>
            Use the defaults
          </button>
        )}
      </p>

      <div className="card mt-5 p-6 md:p-7">
        {step === 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Partner" id="pa"><input id="pa" className="input" value={form.partnerA} onChange={(e) => set("partnerA", e.target.value)} placeholder="Anita" /></Field>
            <Field label="Partner" id="pb"><input id="pb" className="input" value={form.partnerB} onChange={(e) => set("partnerB", e.target.value)} placeholder="Sam" /></Field>
            <Field label="First day" id="sd">
              <input id="sd" type="date" className="input" value={form.startDate} onChange={(e) => { set("startDate", e.target.value); if (rows.length) setRows(rowsForTemplate(form.template, e.target.value, form.endDate || e.target.value, form.totalBudget)); }} />
            </Field>
            <Field label="Last day" id="ed" hint="Leave blank for a single day.">
              <input id="ed" type="date" className="input" min={form.startDate} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </Field>
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

        {step === 4 && (
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
                <li>Each function lists the vendors it needs, ready to research.</li>
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
