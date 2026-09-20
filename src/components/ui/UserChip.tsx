import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { usePrivacy } from "../../lib/privacy";

/** Who is signed in: their Google photo or initial, and their name (or email when there is no name). */
export function UserChip({ className = "" }: { className?: string }) {
  const me = useQuery(api.users.me);
  const privacy = usePrivacy();
  if (!me) return null;
  // A name if they gave one, otherwise one made from their address — never the address.
  const label = me.name?.trim() || me.nameFromEmail || "Guest";
  const initial = label.charAt(0).toUpperCase();
  return (
    <div
      title={me.email ? `Signed in as ${privacy.email(me.email)}` : undefined}
      className={`inline-flex h-9 min-w-0 items-center gap-2 rounded-full bg-paper/90 py-1 pl-1 pr-3.5 text-xs text-ink shadow-[inset_0_0_0_1px_var(--color-line)] backdrop-blur-sm ${className}`}
    >
      {me.image ? (
        <img src={me.image} alt="" referrerPolicy="no-referrer" className="h-7 w-7 shrink-0 rounded-full object-cover" />
      ) : (
        <span aria-hidden="true" className="display grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft text-sm text-accent">
          {initial}
        </span>
      )}
      <span className="truncate">
        <span className="sr-only">Signed in as </span>
        {label}
      </span>
    </div>
  );
}
