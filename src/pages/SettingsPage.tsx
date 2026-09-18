import { useState } from "react";
import { useMutation } from "convex/react";
import { useOutletContext } from "react-router-dom";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { CURRENCIES, VIBES } from "../components/onboarding/shared";
import { PageHeader } from "../components/ui/PageHeader";

type WeddingData = NonNullable<FunctionReturnType<typeof api.weddings.get>>;
type Formality = "relaxed" | "smart" | "formal";

export function SettingsPage() {
  const { wedding, role } = useOutletContext<WeddingData>();
  const update = useMutation(api.weddings.update);
  const canEdit = role !== "viewer";

  const [form, setForm] = useState({
    name: wedding.name,
    partnerA: wedding.partnerA,
    partnerB: wedding.partnerB,
    startDate: wedding.startDate,
    endDate: wedding.endDate,
    city: wedding.city,
    area: wedding.area ?? "",
    country: wedding.country ?? "",
    currency: wedding.currency,
    totalBudget: wedding.totalBudget,
    stylePalette: wedding.stylePalette ?? "",
    styleFormality: (wedding.styleFormality ?? "smart") as Formality,
    inspirationUrl: wedding.inspirationUrl ?? "",
  });
  const [vibes, setVibes] = useState<string[]>(wedding.styleVibes ?? []);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => { setForm((f) => ({ ...f, [k]: v })); setState("idle"); };

  async function save() {
    setState("saving");
    setError(null);
    try {
      await update({
        weddingId: wedding._id as Id<"weddings">,
        patch: {
          name: form.name.trim(),
          partnerA: form.partnerA.trim(),
          partnerB: form.partnerB.trim(),
          startDate: form.startDate,
          endDate: form.endDate,
          city: form.city.trim(),
          area: form.area.trim(),
          country: form.country.trim(),
          currency: form.currency,
          totalBudget: Number(form.totalBudget),
          stylePalette: form.stylePalette.trim(),
          styleFormality: form.styleFormality,
          styleVibes: vibes,
          inspirationUrl: form.inspirationUrl.trim(),
        },
      });
      setState("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't save. Try again.");
      setState("idle");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[46rem]">
      <PageHeader title="Wedding settings" meta="Everything you told us at the start, and anything you've changed your mind about since." />

      <section className="card p-6 md:p-7">
        <h2 className="display text-xl">The wedding</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Name" id="s-name"><input id="s-name" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="City" id="s-city"><input id="s-city" className="input" value={form.city} onChange={(e) => set("city", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="Partner" id="s-pa"><input id="s-pa" className="input" value={form.partnerA} onChange={(e) => set("partnerA", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="Partner" id="s-pb"><input id="s-pb" className="input" value={form.partnerB} onChange={(e) => set("partnerB", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="First day" id="s-sd"><input id="s-sd" type="date" className="input" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="Last day" id="s-ed"><input id="s-ed" type="date" className="input" min={form.startDate} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="Neighbourhood" id="s-area" hint="Narrows vendor searches to one part of the city.">
            <input id="s-area" className="input" value={form.area} onChange={(e) => set("area", e.target.value)} disabled={!canEdit} placeholder="East Austin" />
          </Field>
          <Field label="Country" id="s-country"><input id="s-country" className="input" value={form.country} onChange={(e) => set("country", e.target.value)} disabled={!canEdit} /></Field>
        </div>
      </section>

      <section className="card mt-5 p-6 md:p-7">
        <h2 className="display text-xl">The budget</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_9rem]">
          <Field label="Total budget" id="s-budget" hint="Changing this re-spreads the split across your functions.">
            <input id="s-budget" type="number" min={0} step={500} className="input" value={form.totalBudget} onChange={(e) => set("totalBudget", Number(e.target.value))} disabled={!canEdit} />
          </Field>
          <Field label="Currency" id="s-cur">
            <select id="s-cur" className="input" value={form.currency} onChange={(e) => set("currency", e.target.value)} disabled={!canEdit}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section className="card mt-5 p-6 md:p-7">
        <h2 className="display text-xl">The feel</h2>
        <p className="mt-1 text-sm text-muted">This shapes how vendors are searched for and how PlusOne writes to them.</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {VIBES.map((vibe) => {
            const on = vibes.includes(vibe);
            return (
              <li key={vibe}>
                <button
                  type="button"
                  disabled={!canEdit}
                  aria-pressed={on}
                  onClick={() => { setVibes((vs) => (on ? vs.filter((v) => v !== vibe) : [...vs, vibe])); setState("idle"); }}
                  className={`rounded-full px-3.5 py-1.5 text-sm transition ${on ? "bg-accent text-paper" : "bg-cream text-ink shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-accent-soft"}`}
                >
                  {vibe}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-5 grid gap-4">
          <Field label="Colours" id="s-palette"><input id="s-palette" className="input" value={form.stylePalette} onChange={(e) => set("stylePalette", e.target.value)} disabled={!canEdit} placeholder="Sage and cream, with brass" /></Field>
          <div>
            <p className="label">How formal?</p>
            <div className="flex flex-wrap gap-2">
              {(["relaxed", "smart", "formal"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  disabled={!canEdit}
                  aria-pressed={form.styleFormality === f}
                  onClick={() => set("styleFormality", f)}
                  className={`rounded-full px-4 py-2 text-sm capitalize transition ${form.styleFormality === f ? "bg-accent text-paper" : "bg-cream text-ink shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-accent-soft"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <Field label="Inspiration link" id="s-insp" hint="A Pinterest board, a blog post or a venue page.">
            <input id="s-insp" type="url" className="input" value={form.inspirationUrl} onChange={(e) => set("inspirationUrl", e.target.value)} disabled={!canEdit} placeholder="https://…" />
          </Field>
        </div>
      </section>

      {error && <p role="alert" className="mt-4 text-sm text-bad">{error}</p>}

      {canEdit && (
        <div className="mt-6 flex items-center gap-4">
          <button type="button" className="btn-primary" onClick={() => void save()} disabled={state === "saving"}>
            {state === "saving" ? "Saving…" : "Save changes"}
          </button>
          <span aria-live="polite" className="text-sm text-muted">{state === "saved" ? "Saved." : ""}</span>
        </div>
      )}
    </div>
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
