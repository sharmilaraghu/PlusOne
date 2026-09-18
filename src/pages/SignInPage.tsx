import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "react-router-dom";

export function SignInPage({ redirectTo }: { redirectTo?: string }) {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signUp");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  void redirectTo;

  return (
    <main id="main" className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <p className="display text-4xl tracking-tight">
          Plus<span className="text-accent">One</span>
        </p>
        <h1 className="mt-4 text-2xl">Your AI copilot for the perfect wedding.</h1>
        <p className="mt-2 text-sm text-muted">
          PlusOne finds vendors on the open web, emails them from your own wedding inbox, reads their quotes, and keeps every
          event, dollar and guest in one live plan. <Link to="/how-it-works" className="underline">How it works</Link>
        </p>
        <form
          className="card mt-6 space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setBusy(true);
            const form = new FormData(e.currentTarget);
            form.set("flow", flow);
            void signIn("password", form)
              .catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err);
                setError(
                  /InvalidAccountId|InvalidSecret|Invalid password/i.test(msg)
                    ? "That email and password don't match."
                    : /already exists/i.test(msg)
                      ? "An account with this email already exists. Try signing in."
                      : "Could not sign you in. Check the details and try again.",
                );
              })
              .finally(() => setBusy(false));
          }}
        >
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete={flow === "signUp" ? "new-password" : "current-password"} minLength={8} required className="input" />
            {flow === "signUp" && <p className="mt-1 text-xs text-muted">At least 8 characters.</p>}
          </div>
          {error && <p role="alert" aria-live="polite" className="text-sm text-bad">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "One moment…" : flow === "signUp" ? "Create account" : "Sign in"}
          </button>
          <button
            type="button"
            className="w-full text-center text-sm text-muted hover:text-ink"
            onClick={() => setFlow(flow === "signUp" ? "signIn" : "signUp")}
          >
            {flow === "signUp" ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>
        </form>
      </div>
    </main>
  );
}
