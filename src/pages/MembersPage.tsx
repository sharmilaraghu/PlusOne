import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useOutletContext } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";

type WeddingData = NonNullable<FunctionReturnType<typeof api.weddings.get>>;
type Role = "owner" | "planner" | "viewer";

export function MembersPage() {
  const { wedding, role } = useOutletContext<WeddingData>();
  const weddingId = wedding._id as Id<"weddings">;
  const members = useQuery(api.members.list, { weddingId })?.map((m) => ({ _id: m.member._id, role: m.member.role, name: m.user?.name, email: m.user?.email }));
  const createInvite = useMutation(api.invites.create);
  const setRole = useMutation(api.members.setRole);
  const remove = useMutation(api.members.remove);
  const [inviteRole, setInviteRole] = useState<Role>("planner");
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canInvite = role === "owner" || role === "planner";

  async function invite() {
    const { token } = await createInvite({ weddingId, role: inviteRole, email: email.trim() || undefined });
    const url = `${window.location.origin}/join/${token}`;
    setLink(url);
    setCopied(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl">People</h1>
        <p className="text-sm text-muted">Partners plan, parents watch, everyone sees changes the moment they happen.</p>
      </header>

      {canInvite && (
        <section className="card p-5">
          <h2 className="text-lg">Invite someone</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
            <input className="input" type="email" placeholder="Email (optional, we'll send the link from your wedding inbox)" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Invitee email" />
            <select className="input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)} aria-label="Role">
              <option value="planner">Planner — can edit and send</option>
              <option value="viewer">Viewer — read only</option>
            </select>
            <button className="btn-primary" onClick={() => void invite()}>Create link</button>
          </div>
          {link && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-sand p-3 text-sm">
              <code className="min-w-0 flex-1 truncate">{link}</code>
              <button
                className="btn-ghost btn-sm"
                onClick={() => {
                  void navigator.clipboard.writeText(link).then(() => setCopied(true));
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </section>
      )}

      <section className="card p-5">
        <h2 className="text-lg">Who's here</h2>
        {members === undefined ? (
          <p className="mt-2 text-sm text-muted">Loading…</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {members.map((m) => (
              <li key={m._id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">{m.name ?? m.email ?? "Member"}</p>
                  {m.name && m.email && <p className="text-xs text-muted">{m.email}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {role === "owner" && m.role !== "owner" ? (
                    <>
                      <select className="input w-auto py-1 text-xs" value={m.role} onChange={(e) => void setRole({ memberId: m._id, role: e.target.value as Role })} aria-label={`Role for ${m.email ?? "member"}`}>
                        <option value="planner">planner</option>
                        <option value="viewer">viewer</option>
                      </select>
                      <button className="text-xs text-bad hover:underline" onClick={() => void remove({ memberId: m._id })}>Remove</button>
                    </>
                  ) : (
                    <span className="chip bg-sand text-muted">{m.role}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
