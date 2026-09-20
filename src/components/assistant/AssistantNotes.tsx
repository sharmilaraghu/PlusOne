import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Icon } from "../ui/Icon";
import { usePrivacy } from "../../lib/privacy";

/** What PlusOne is keeping in mind, so nothing is remembered out of sight. */
export function AssistantNotes({ weddingId, canEdit }: { weddingId: Id<"weddings">; canEdit: boolean }) {
  const notes = useQuery(api.assistant.notes, { weddingId });
  const forget = useMutation(api.assistant.forgetNote);
  const privacy = usePrivacy();
  if (!notes || notes.length === 0) return null;
  return (
    <section className="mt-4 rounded-[14px] bg-accent-soft/50 px-4 py-3" aria-labelledby="notes-h">
      <p id="notes-h" className="flex items-center gap-1.5 text-xs text-accent">
        <Icon name="heart" size={13} />
        What PlusOne remembers
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {notes.map((note) => (
          <li key={note} className="flex items-center gap-1.5 rounded-full bg-paper px-3 py-1 text-xs text-ink">
            {privacy.text(note)}
            {canEdit && (
              <button
                type="button"
                aria-label={`Forget: ${note}`}
                className="text-quiet hover:text-accent"
                onClick={() => void forget({ weddingId, note })}
              >
                <Icon name="close" size={11} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
