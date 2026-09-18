import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";

type Template = "hindu" | "muslim" | "sikh" | "western" | "jewish" | "fusion" | "custom";

const templates: { id: Template; name: string; days: string; blurb: string }[] = [
  { id: "hindu", name: "Hindu", days: "Mehndi · Sangeet · Haldi · Ceremony · Reception", blurb: "Gujarati, Punjabi, South Indian, Bengali and more." },
  { id: "muslim", name: "Muslim", days: "Mehndi · Nikah · Walima", blurb: "Officiants and vendors who know Islamic traditions." },
  { id: "sikh", name: "Sikh", days: "Mehndi · Sangeet · Anand Karaj · Reception", blurb: "Gurdwara ceremony plus the celebrations around it." },
  { id: "western", name: "Western", days: "Rehearsal dinner · Ceremony · Reception", blurb: "Classic three-part weekend." },
  { id: "jewish", name: "Jewish", days: "Shabbat dinner · Chuppah & reception · Sheva Brachot", blurb: "From Friday night through the week of blessings." },
  { id: "fusion", name: "Fusion", days: "Welcome party · Ceremony 1 · Ceremony 2 · Reception", blurb: "Two families, two traditions, one plan." },
  { id: "custom", name: "Custom", days: "Name your own days", blurb: "Start from one ceremony and add events later." },
];

const currencies = ["USD", "INR", "GBP", "EUR", "CAD", "AUD", "AED", "SGD"];

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
    country: "",
    template: "hindu" as Template,
    currency: "USD",
    totalBudget: 40000,
    inspirationUrl: "",
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const name = useMemo(() => {
    const a = form.partnerA.trim();
    const b = form.partnerB.trim();
    return a && b ? `${a} & ${b}` : a || b || "Our wedding";
  }, [form.partnerA, form.partnerB]);

  const canNext = step === 0 ? form.partnerA && form.partnerB && form.startDate && form.city : step === 1 ? !!form.template : form.totalBudget > 0;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const weddingId = await create({
        name,
        partnerA: form.partnerA.trim(),
        partnerB: form.partnerB.trim(),
        startDate: form.startDate,
        endDate: form.endDate || form.startDate,
        city: form.city.trim(),
        country: form.country.trim() || undefined,
        currency: form.currency,
        totalBudget: Number(form.totalBudget),
        template: form.template,
        inspirationUrl: form.inspirationUrl.trim() || undefined,
      });
      navigate(`/w/${weddingId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <main id="main" className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/" className="text-sm text-muted hover:text-ink">← My weddings</Link>
      <h1 className="mt-4 text-3xl">Tell us about {name}</h1>
      <ol className="mt-4 flex gap-2 text-xs text-muted" aria-label="Steps">
        {["The couple", "The days", "The budget"].map((s, i) => (
          <li key={s} className={`rounded-full px-3 py-1 ${i === step ? "bg-accent text-white" : i < step ? "bg-accent-soft text-accent" : "bg-sand"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <div className="card mt-6 p-6">
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="pa">Partner</label>
              <input id="pa" className="input" value={form.partnerA} onChange={(e) => set("partnerA", e.target.value)} placeholder="Priya" />
            </div>
            <div>
              <label className="label" htmlFor="pb">Partner</label>
              <input id="pb" className="input" value={form.partnerB} onChange={(e) => set("partnerB", e.target.value)} placeholder="Sam" />
            </div>
            <div>
              <label className="label" htmlFor="sd">First day</label>
              <input id="sd" type="date" className="input" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="ed">Last day</label>
              <input id="ed" type="date" className="input" value={form.endDate} min={form.startDate} onChange={(e) => set("endDate", e.target.value)} />
              <p className="mt-1 text-xs text-muted">Leave blank for a single day.</p>
            </div>
            <div>
              <label className="label" htmlFor="city">City</label>
              <input id="city" className="input" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Austin" />
            </div>
            <div>
              <label className="label" htmlFor="country">Country</label>
              <input id="country" className="input" value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="United States" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="text-sm text-muted">Pick the tradition closest to yours. PlusOne lays out the days and the vendors each one needs. You can rename or add events later.</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => set("template", t.id)}
                    aria-pressed={form.template === t.id}
                    className={`w-full rounded-xl border p-4 text-left transition ${form.template === t.id ? "border-accent bg-accent-soft" : "border-line hover:bg-sand"}`}
                  >
                    <p className="font-medium">{t.name}</p>
                    <p className="mt-1 text-xs text-accent">{t.days}</p>
                    <p className="mt-1 text-xs text-muted">{t.blurb}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="budget">Total budget</label>
              <input id="budget" type="number" min={1000} step={500} className="input" value={form.totalBudget} onChange={(e) => set("totalBudget", Number(e.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="cur">Currency</label>
              <select id="cur" className="input" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                {currencies.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="insp">Inspiration link (optional)</label>
              <input id="insp" type="url" className="input" value={form.inspirationUrl} onChange={(e) => set("inspirationUrl", e.target.value)} placeholder="A Pinterest board, blog post or venue page" />
              <p className="mt-1 text-xs text-muted">PlusOne reads it and writes a short style brief that shapes vendor searches and emails.</p>
            </div>
            <div className="sm:col-span-2 rounded-xl bg-sand p-4 text-sm">
              <p className="font-medium">What happens next</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                <li>Your days and a first budget split appear instantly.</li>
                <li>A dedicated wedding inbox is created so vendors and guests reply to one place.</li>
                <li>Each vendor need gets a slot you can research with one click.</li>
              </ul>
            </div>
          </div>
        )}

        {error && <p role="alert" className="mt-4 text-sm text-bad">{error}</p>}

        <div className="mt-6 flex items-center justify-between">
          <button type="button" className="btn-ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>Back</button>
          {step < 2 ? (
            <button type="button" className="btn-primary" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>Continue</button>
          ) : (
            <button type="button" className="btn-primary" onClick={() => void submit()} disabled={!canNext || busy}>
              {busy ? "Building your plan…" : "Create my plan"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
