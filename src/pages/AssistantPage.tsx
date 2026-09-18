import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useOutletContext } from "react-router-dom";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { PageHeader } from "../components/ui/PageHeader";
import { Icon } from "../components/ui/Icon";

type WeddingData = NonNullable<FunctionReturnType<typeof api.weddings.get>>;

const OPENERS = [
  "What should we book next?",
  "How much of our budget is left?",
  "Find us a florist",
  "What happens on the day itself?",
];

export function AssistantPage() {
  const { wedding, role } = useOutletContext<WeddingData>();
  const weddingId = wedding._id as Id<"weddings">;
  const history = useQuery(api.assistant.history, { weddingId });
  const ask = useMutation(api.assistant.ask);
  const clear = useMutation(api.assistant.clear);
  const canEdit = role !== "viewer";

  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history?.length, history?.[history.length - 1]?.status]);

  async function send(question: string) {
    const q = question.trim();
    if (!q) return;
    setText("");
    setError(null);
    try {
      await ask({ weddingId, content: q });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't send.");
    }
  }

  const empty = history !== undefined && history.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-[48rem] flex-col">
      <PageHeader
        title="Assistant"
        meta="It knows your days, your budget and every vendor you have found."
        action={
          history && history.length > 0 && canEdit ? (
            <button className="btn-quiet btn-sm" onClick={() => void clear({ weddingId })}>
              Clear
            </button>
          ) : undefined
        }
      />

      {empty && (
        <div className="card px-6 py-7 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
            <Icon name="heart" size={22} />
          </span>
          <h2 className="mt-3 display text-[1.35rem]">Ask anything about your wedding</h2>
          <p className="mx-auto mt-2 max-w-[28rem] text-sm leading-relaxed text-muted">
            It answers from your own plan — what is booked, what is left, what you have spent — and it can start a vendor
            search or add something you have forgotten. It never sends an email; that always goes through you.
          </p>
          <ul className="mt-5 flex flex-wrap justify-center gap-2">
            {OPENERS.map((o) => (
              <li key={o}>
                <button
                  className="rounded-full bg-cream px-3.5 py-1.5 text-sm text-muted shadow-[inset_0_0_0_1px_var(--color-line)] transition hover:bg-accent-soft hover:text-accent"
                  onClick={() => void send(o)}
                  disabled={!canEdit}
                >
                  {o}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {history === undefined ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <ul className="grid gap-3">
          {history.map((m) => (
            <li
              key={m._id}
              className={
                m.role === "user"
                  ? "max-w-[85%] self-end rounded-[16px] rounded-br-[4px] bg-accent px-4 py-3 text-paper"
                  : "max-w-[92%] self-start rounded-[16px] rounded-bl-[4px] border border-line bg-cream px-4 py-3"
              }
            >
              {m.status === "thinking" ? (
                <span className="flex items-center gap-2 text-sm text-quiet">
                  <span className="inline-flex gap-1" aria-hidden="true">
                    <i className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                    <i className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:150ms]" />
                    <i className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:300ms]" />
                  </span>
                  Thinking about your plan…
                </span>
              ) : (
                <p className={`whitespace-pre-wrap text-[0.95rem] leading-relaxed ${m.role === "user" ? "" : "text-ink"}`}>
                  {m.content}
                </p>
              )}

              {/* What it actually did, so nothing happens invisibly. */}
              {m.toolCalls?.map((t, i) => (
                <p key={i} className="mt-2 flex items-center gap-1.5 text-xs text-accent">
                  <Icon name={t.name === "research" ? "search" : "plus"} size={13} />
                  {t.status === "done"
                    ? t.name === "research"
                      ? `Started a search for ${String((t.args as { need?: string })?.need ?? "that")}`
                      : `Added ${String((t.args as { title?: string })?.title ?? "a need")} to your vendors`
                    : "Couldn't do that one — try the Vendors screen"}
                </p>
              ))}
            </li>
          ))}
          <div ref={endRef} />
        </ul>
      )}

      {error && <p role="alert" className="mt-3 text-sm text-bad">{error}</p>}

      {canEdit && (
        <form
          className="sticky bottom-4 mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(text);
          }}
        >
          <input
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask about your plan, or tell it what to find"
            aria-label="Ask the assistant"
          />
          <button className="btn-primary shrink-0" disabled={!text.trim()}>
            <Icon name="send" size={16} />
            <span className="sr-only">Send</span>
          </button>
        </form>
      )}
    </div>
  );
}
