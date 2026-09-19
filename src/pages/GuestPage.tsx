import { useEffect, useRef, useState } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";

/**
 * /guest: straight into a sample wedding, no sign-up. Signs in anonymously, has
 * PlusOne build the sample (once per guest), and opens it.
 */
export function GuestPage() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const start = useMutation(api.demo.start);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const asked = useRef(false);
  const opened = useRef(false);

  useEffect(() => {
    if (isLoading || isAuthenticated || asked.current) return;
    asked.current = true;
    void signIn("anonymous").catch(() => setError("We couldn't open the sample wedding. Try again in a moment."));
  }, [isLoading, isAuthenticated, signIn]);

  useEffect(() => {
    if (!isAuthenticated || opened.current) return;
    opened.current = true;
    void start()
      .then((weddingId) => navigate(`/w/${weddingId}`, { replace: true }))
      .catch(() => setError("We couldn't open the sample wedding. Try again in a moment."));
  }, [isAuthenticated, start, navigate]);

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
