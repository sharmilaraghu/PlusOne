import { useOutletContext } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

type WeddingData = NonNullable<FunctionReturnType<typeof api.weddings.get>>;

export function GuestsPage() {
  const { stats } = useOutletContext<WeddingData>();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl">Guests</h1>
      <p className="mt-1 text-sm text-muted">
        {stats.guestCounts?.yes ?? 0} yes · {stats.guestCounts?.no ?? 0} no · {stats.guestCounts?.maybe ?? 0} maybe · {stats.guestCounts?.pending ?? 0} pending
      </p>
      <div className="card mt-6 p-6 text-sm text-muted">Guest list, email invites and plain-language RSVPs arrive here next.</div>
    </div>
  );
}
