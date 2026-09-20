import { useEffect, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";

/**
 * /guest: straight into a fresh sample wedding, no sign-up.
 *
 * A guest arriving again gets a clean sample rather than whatever the last visitor
 * left behind, so the link can be handed to several people in a row. Someone with a
 * real account keeps theirs: they are only shown the sample, never signed out of it.
 */
export function GuestPage() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const start = useMutation(api.demo.start);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  // Each step happens once per visit, whatever React does with re-renders.
  const cleared = useRef(false);
  const signedIn = useRef(false);
  const opened = useRef(false);

  useEffect(() => {
    if (isLoading || opened.current) return;
    const failed = () => setError("We couldn't open the sample wedding. Try again in a moment.");
    // Someone with a real account keeps it; only a leftover guest is cleared out.
    const isGuest = me !== null && me !== undefined && !me.email && !me.name;

    if (isAuthenticated && isGuest && !cleared.current) {
      cleared.current = true;
      void signOut().catch(failed);
      return;
    }
    if (!isAuthenticated && !signedIn.current) {
      signedIn.current = true;
      // The guest we are about to create is this visit's, not a leftover, so it must
      // never be cleared out by the branch above.
      cleared.current = true;
      void signIn("anonymous").catch(failed);
      return;
    }
    if (isAuthenticated && me !== undefined) {
      opened.current = true;
      void start()
        .then((weddingId) => navigate(`/w/${weddingId}`, { replace: true }))
        .catch(failed);
    }
  }, [isLoading, isAuthenticated, me, signIn, signOut, start, navigate]);

  return (
    <main id="main" className="grid min-h-screen place-items-center px-5 text-center">
      <div>
        <p className="display text-4xl tracking-tight">
          Plus<span className="text-accent">One</span>
        </p>
        {error ? (
          <>
            <p role="alert" className="mt-4 text-bad">{error}</p>
            <Link to="/signin" className="btn-quiet mt-5">Back to sign in</Link>
          </>
        ) : (
          <p className="mt-4 text-muted">Setting the table for a sample wedding…</p>
        )}
      </div>
    </main>
  );
}
