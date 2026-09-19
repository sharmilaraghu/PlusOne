import { useState } from "react";
import { useMutation } from "convex/react";
import { useOutletContext } from "react-router-dom";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { CURRENCIES, VIBES } from "../components/onboarding/shared";
import { PageHeader } from "../components/ui/PageHeader";
import { CountrySelect } from "../components/ui/CountrySelect";
import { MASKED_EMAIL, setHideEmails, useHideEmails } from "../lib/privacy";

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
    inspirationNotes: wedding.inspirationNotes ?? "",
    sendMode: (wedding.sendMode ?? "auto") as "auto" | "review",
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
          inspirationNotes: form.inspirationNotes.trim(),
          sendMode: form.sendMode,
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
          <Field label="Country" id="s-country"><CountrySelect id="s-country" value={form.country} onChange={(c) => set("country", c)} disabled={!canEdit} /></Field>
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
          <Field label="In your words" id="s-notes" hint="Anything a vendor should know about the look and feel.">
            <textarea id="s-notes" rows={3} className="input resize-y" value={form.inspirationNotes} onChange={(e) => set("inspirationNotes", e.target.value)} disabled={!canEdit} placeholder="Long tables under the olive trees, lots of candles, nothing too matchy" />
          </Field>
        </div>
      </section>

      <section className="card mt-5 p-6 md:p-7">
        <h2 className="display text-xl">The emails</h2>
        <p className="mt-1 text-sm text-muted">
          Once you have confirmed a shortlist, who presses send.
        </p>
        <div className="mt-4 grid gap-3">
          {([
            {
              value: "auto" as const,
              title: "PlusOne sends them",
              body: "You confirm the shortlist once, having seen who is being written to and one letter in full. Everything after that — sending, chasing anyone who goes quiet, reading the replies into quotes — happens without you.",
            },
            {
              value: "review" as const,
              title: "Let me read each email first",
              body: "Every letter is shown before anything is sent, and you can change any of it.",
            },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={!canEdit}
              aria-pressed={form.sendMode === opt.value}
              onClick={() => set("sendMode", opt.value)}
              className={`rounded-[14px] border px-5 py-4 text-left transition ${
                form.sendMode === opt.value ? "border-accent bg-accent-soft/50" : "border-line bg-cream hover:bg-accent-soft/30"
              }`}
            >
              <span className="block font-medium">{opt.title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-muted">{opt.body}</span>
            </button>
          ))}
        </div>
      </section>

      <PrivacySection />

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

/** Applies at once and only to this browser: nothing to save, nobody else affected. */
function PrivacySection() {
  const hide = useHideEmails();
  return (
    <section className="card mt-5 p-6 md:p-7" aria-labelledby="privacy-h">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-[36rem]">
          <h2 id="privacy-h" className="display text-xl">Hide email addresses</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Shows every email address as {MASKED_EMAIL}: yours, your guests', your vendors', and any inside emails
            and activity. Handy when you're sharing your screen or recording a demo. It only changes what this
            browser shows; the emails themselves are untouched.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={hide}
          aria-labelledby="privacy-h"
          onClick={() => setHideEmails(!hide)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${hide ? "bg-accent" : "bg-line"}`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-paper shadow transition-all ${hide ? "left-6" : "left-1"}`}
          />
        </button>
      </div>
    </section>
  );
}
