import { useState } from "react";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Icon } from "./ui/Icon";
import { usePrivacy } from "../lib/privacy";

type Draft = FunctionReturnType<typeof api.outreach.listDrafts>[number]["message"] & {
  vendor: FunctionReturnType<typeof api.outreach.listDrafts>[number]["vendor"];
};

/**
 * The one confirmation in the whole outreach flow.
 *
 * The couple sees exactly who will be emailed and one letter in full, presses send once,
 * and PlusOne takes it from there: it sends every email itself, follows up with anyone
 * who goes quiet, and reads the replies back into quotes. There is no per-email approval
 * step. A couple who would rather read each one first turns that on in Settings, which
 * is what `editable` switches this panel to.
 */
export function ConfirmOutreach({
  slotId,
  drafts,
  editable,
  onSent,
}: {
  slotId: Id<"vendorSlots">;
  drafts: Draft[];
  /** True in "let me read each email first" mode: every letter is shown and can be edited. */
  editable: boolean;
  onSent: (queued: number) => void;
}) {
  const privacy = usePrivacy();
  const sendAll = useMutation(api.outreach.sendAllForSlot);
  const discard = useMutation(api.outreach.discardDraftsForSlot);
  const updateDraft = useMutation(api.outreach.updateDraft);
  const [busy, setBusy] = useState<"send" | "discard" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(drafts[0]?._id ?? null);

  const reachable = drafts.filter((d) => d.toAddress);
  const unreachable = drafts.filter((d) => !d.toAddress);
  const sample = drafts.find((d) => d._id === openId) ?? drafts[0];

  async function send() {
    setBusy("send");
    setError(null);
    try {
      const result = await sendAll({ slotId });
      setSkipped(result.skipped);
      onSent(result.queued);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Those emails could not be sent.");
    } finally {
      setBusy(null);
    }
  }

  async function throwAway() {
    if (!window.confirm(`Throw away ${drafts.length === 1 ? "this email" : `these ${drafts.length} emails`}? Nothing has been sent.`)) return;
    setBusy("discard");
    setError(null);
    try {
      await discard({ slotId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Those drafts could not be discarded.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="confirm-h" className="card overflow-hidden">
      <div className="border-b border-line bg-accent-soft/40 px-6 py-5">
        <h3 id="confirm-h" className="display text-[1.3rem]">
          {editable ? `Read ${drafts.length === 1 ? "the email" : `the ${drafts.length} emails`} before they go` : "Ready when you are"}
        </h3>
        <p className="mt-1 text-sm text-muted">
          {editable
            ? "You asked to read each one first. Edit anything you like, then send."
            : `PlusOne will email ${reachable.length === 1 ? "this vendor" : `these ${reachable.length} vendors`} from your wedding inbox, then chase anyone who goes quiet and read the replies back to you.`}
        </p>
      </div>

      <div className="px-6 py-5">
        <ul className="grid gap-2 sm:grid-cols-2">
          {drafts.map((d) => (
            <li key={d._id}>
              <button
                type="button"
                onClick={() => setOpenId(d._id)}
                aria-pressed={d._id === sample?._id}
                className={`flex w-full items-center justify-between gap-3 rounded-[12px] border px-3.5 py-2.5 text-left transition ${
                  d._id === sample?._id ? "border-accent bg-accent-soft/50" : "border-line hover:bg-accent-soft/30"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{d.vendor.name}</span>
                  <span className="block truncate font-mono text-[11px] text-quiet">
                    {privacy.email(d.toAddress) || "no email address yet"}
                  </span>
                </span>
                {d.toAddress ? (
                  <Icon name="check" size={15} className="shrink-0 text-ok" />
                ) : (
                  <span className="chip-warn shrink-0">skipped</span>
                )}
              </button>
            </li>
          ))}
        </ul>

        {unreachable.length > 0 && (
          <p className="mt-3 text-sm text-warn">
            {unreachable.length === 1
              ? `${unreachable[0].vendor.name} has no email address yet, so nothing goes to them. Add one on their card and send again.`
              : `${unreachable.length} of these have no email address yet and will be left out. Add addresses on their cards and send again.`}
          </p>
        )}

        {sample && (
          <div className="mt-5">
            <p className="label mb-2">
              {editable ? `To ${sample.vendor.name}` : `What PlusOne wrote to ${sample.vendor.name}`}
            </p>
            {editable ? (
              <>
                <input
                  className="input font-medium"
                  defaultValue={sample.subject}
                  key={`${sample._id}-subject`}
                  aria-label="Subject"
                  onBlur={(e) => e.target.value !== sample.subject && void updateDraft({ messageId: sample._id, subject: e.target.value })}
                />
                <textarea
                  className="input mt-2 min-h-56 leading-relaxed"
                  defaultValue={sample.bodyText}
                  key={`${sample._id}-body`}
                  aria-label="Email body"
                  onBlur={(e) => e.target.value !== sample.bodyText && void updateDraft({ messageId: sample._id, bodyText: e.target.value })}
                />
              </>
            ) : (
              <article className="card-quiet px-5 py-4">
                <p className="font-medium">{sample.subject}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">{privacy.text(sample.bodyText)}</p>
              </article>
            )}
            {!editable && drafts.length > 1 && (
              <p className="mt-2 text-xs text-quiet">
                The other {drafts.length - 1} {drafts.length === 2 ? "email is" : "emails are"} written the same way, each one
                about that vendor in particular. Pick a name above to read it.
              </p>
            )}
          </div>
        )}

        {skipped.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm text-warn">
            {skipped.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        )}
        {error && <p role="alert" className="mt-4 text-sm text-bad">{error}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button className="btn-primary" disabled={busy !== null || reachable.length === 0} onClick={() => void send()}>
            {busy === "send"
              ? "Sending…"
              : reachable.length === 1
                ? "Send it"
                : `Send all ${reachable.length}`}
          </button>
          <button className="btn-quiet" disabled={busy !== null} onClick={() => void throwAway()}>
            {busy === "discard" ? "Discarding…" : "Not yet"}
          </button>
          {!editable && (
            <p className="text-xs text-quiet">You only confirm once. Nothing else needs you after this.</p>
          )}
        </div>
      </div>
    </section>
  );
}
