import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Icon } from "../components/ui/Icon";
import { MASKED_EMAIL, setHideEmails, useHideEmails, usePrivacy } from "../lib/privacy";

/** Everything about you rather than about one wedding: your name, how you sign in, privacy. */
export function AccountPage() {
  const me = useQuery(api.users.me);
  const setName = useMutation(api.users.setName);
  const { signOut } = useAuthActions();
  const privacy = usePrivacy();
  const hide = useHideEmails();
  const [draft, setDraft] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  if (me === undefined) return <main id="main" className="page px-5 py-10 text-muted">Loading…</main>;
  const name = draft ?? me?.name ?? "";
  const isGuest = !me?.email && !me?.name;

  return (
    <main id="main" className="page px-5 py-10 md:px-8">
      <Link to="/" className="btn-quiet btn-sm gap-1.5 bg-cream">
        <Icon name="arrow" size={15} className="rotate-180" />
        My weddings
      </Link>
      <h1 className="mt-4 text-[2.2rem] leading-tight">Your <em>account</em></h1>
      <p className="mt-1 text-sm text-muted">Your details, not any one wedding's. Vendors never see any of this.</p>

      <section className="card mt-6 p-6 md:p-7" aria-labelledby="name-h">
        <h2 id="name-h" className="display text-xl">Your name</h2>
        <p className="mt-1 text-sm text-muted">
          Shown at the top of PlusOne and beside everything you do, so the people you plan with see a name rather than
          an email address.
        </p>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setState("saving");
            void setName({ name })
              .then(() => setState("saved"))
              .catch(() => setState("idle"));
          }}
        >
          <input
            className="input max-w-[20rem]"
            value={name}
            onChange={(e) => {
              setDraft(e.target.value);
              setState("idle");
            }}
            placeholder="Anita"
            aria-label="Your name"
          />
          <button type="submit" className="btn-primary btn-sm" disabled={state === "saving" || !name.trim()}>
            {state === "saving" ? "Saving…" : "Save"}
          </button>
          <span aria-live="polite" className="self-center text-sm text-muted">{state === "saved" ? "Saved." : ""}</span>
        </form>
      </section>

      <section className="card mt-5 p-6 md:p-7" aria-labelledby="signin-h">
        <h2 id="signin-h" className="display text-xl">How you sign in</h2>
        {isGuest ? (
          <p className="mt-1 text-sm text-muted">
            You're looking around as a guest, so there's nothing to sign in with. Plan your own wedding and you can
            create an account then.
          </p>
        ) : (
          <>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Email</span>
              <span className="font-mono text-[0.95rem]">{privacy.email(me?.email) ?? "—"}</span>
              {me?.image && <span className="chip-quiet">Google</span>}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Your email address is how PlusOne knows you, so it can't be changed here yet. To use a different one,
              create an account with it and invite yourself to your wedding from the People tab.
            </p>
          </>
        )}
        <button onClick={() => void signOut()} className="btn-quiet btn-sm mt-4 gap-1.5">
          <Icon name="signout" size={15} />
          Sign out
        </button>
      </section>

      <section className="card mt-5 p-6 md:p-7" aria-labelledby="privacy-h">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-[36rem]">
            <h2 id="privacy-h" className="display text-xl">Hide email addresses</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Shows every email address as {MASKED_EMAIL}: yours, your guests', your vendors', and any inside emails and
              activity. Handy when you're sharing your screen or recording. It only changes what this browser shows.
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
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-paper shadow transition-all ${hide ? "left-6" : "left-1"}`} />
          </button>
        </div>
      </section>
    </main>
  );
}
