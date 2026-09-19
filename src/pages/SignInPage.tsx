import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "react-router-dom";
import { ConvexError } from "convex/values";

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
        <div className="card mt-6 space-y-4 p-6">
        <button
          type="button"
          disabled={busy}
          className="btn-quiet w-full gap-3 bg-white text-ink"
          onClick={() => {
            setError(null);
            setBusy(true);
            // Come back to this exact page (e.g. an invite link) after Google.
            void signIn("google", { redirectTo: window.location.pathname + window.location.search }).catch(() => {
              setError("Could not reach Google. Try again.");
              setBusy(false);
            });
          }}
        >
          <GoogleMark />
          Continue with Google
        </button>
        <div className="flex items-center gap-3 text-xs text-quiet" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          or with email
          <span className="h-px flex-1 bg-line" />
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setBusy(true);
            const form = new FormData(e.currentTarget);
            form.set("flow", flow);
            void signIn("password", form)
              .catch((err: unknown) => {
                if (err instanceof ConvexError && typeof err.data === "string") {
                  setError(err.data);
                  return;
                }
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
        <p className="mt-5 text-center text-sm text-muted">
          Just looking?{" "}
          <Link to="/guest" className="text-accent underline underline-offset-2">
            Try it as a guest
          </Link>{" "}
          with a sample wedding. No sign-up.
        </p>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
