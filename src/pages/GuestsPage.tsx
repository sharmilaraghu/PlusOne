import { Link, useOutletContext } from "react-router-dom";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";

type WeddingData = NonNullable<FunctionReturnType<typeof api.weddings.get>>;

export function GuestsPage() {
  const { stats } = useOutletContext<WeddingData>();
  const counts = stats.guestCounts;

  return (
    <div className="mx-auto w-full max-w-[46rem]">
      <PageHeader
        title="Guests"
        meta={`${counts?.yes ?? 0} yes · ${counts?.no ?? 0} no · ${counts?.maybe ?? 0} maybe · ${counts?.pending ?? 0} waiting to reply`}
      />
      <EmptyState
        icon="guests"
        title="Your guest list lives here"
        body="Add your guests, send the invitations from your wedding inbox, and PlusOne reads the replies. Guests answer in their own words, and the counts and dietary notes update themselves."
        action={<Link to="../vendors" className="btn-ghost">Find vendors meanwhile</Link>}
      />
    </div>
  );
}
