import { Link } from "react-router-dom";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";

export function AssistantPage() {
  return (
    <div className="mx-auto w-full max-w-[46rem]">
      <PageHeader title="Assistant" meta="Ask anything about your plan, from what is left to book to what a florist usually costs." />
      <EmptyState
        icon="heart"
        title="The assistant is on its way"
        body="It will know your dates, guests and budget, answer questions about the traditions you're planning, and start a vendor search or draft an email when you ask it to."
        action={<Link to="../vendors" className="btn-ghost">Research vendors yourself</Link>}
      />
    </div>
  );
}
