import { useState } from "react";
import { Authenticated, Unauthenticated, AuthLoading, useMutation, useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { SignInPage } from "./SignInPage";

export function JoinPage() {
  const { token = "" } = useParams<{ token: string }>();
  const preview = useQuery(api.invites.preview, { token });
  const accept = useMutation(api.invites.accept);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  if (preview === undefined) return <main id="main" className="grid min-h-screen place-items-center text-muted">Checking your invite…</main>;
  if (preview === null)
    return (
      <main id="main" className="grid min-h-screen place-items-center p-6 text-center">
        <p>This invite link is no longer valid.</p>
      </main>
    );

  return (
    <>
      <AuthLoading>
        <main id="main" className="grid min-h-screen place-items-center text-muted">Loading…</main>
      </AuthLoading>
      <Unauthenticated>
        <div className="mx-auto max-w-md px-4 pt-8 text-center">
          <p className="text-sm text-muted">
            You've been invited to help plan <span className="font-medium text-ink">{preview.weddingName}</span> as a {preview.role}. Create an account or sign in to join.
          </p>
        </div>
        <SignInPage />
      </Unauthenticated>
      <Authenticated>
        <main id="main" className="grid min-h-screen place-items-center px-4">
          <div className="card max-w-md p-8 text-center">
            <p className="display text-2xl">{preview.weddingName}</p>
            <p className="mt-2 text-sm text-muted">
              {preview.partnerA} and {preview.partnerB} invited you as a <span className="font-medium text-ink">{preview.role}</span>.
            </p>
            {error && <p role="alert" className="mt-3 text-sm text-bad">{error}</p>}
            <button
              className="btn-primary mt-6"
              onClick={() => {
                setError(null);
                accept({ token })
                  .then((weddingId) => navigate(`/w/${weddingId}`))
                  .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not join."));
              }}
            >
              Join the plan
            </button>
          </div>
        </main>
      </Authenticated>
    </>
  );
}
