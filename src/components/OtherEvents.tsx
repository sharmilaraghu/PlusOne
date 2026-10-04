import { useEffect, useState } from "react";

const OTHER_EVENTS_SITE = "https://scrupulous-hound-784.convex.site";
const DISMISSED_KEY = "plusone-other-events-dismissed";

/**
 * A quiet card in the corner, not a dialog: PlusOne here is for weddings, and someone
 * who arrived planning a birthday should learn there is a PlusOne for that without
 * being stopped on their way in. It waits a moment, never takes focus, and stays
 * dismissed once closed.
 */
export function OtherEvents() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      // Storage can be blocked; showing the card again is the harmless outcome.
    }
    if (dismissed) return;
    const timer = window.setTimeout(() => setShow(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // nothing to do
    }
  };

  if (!show) return null;
  return (
    <aside
      aria-label="PlusOne for other events"
      className="rise fixed bottom-4 right-4 z-40 flex max-w-[19rem] items-start gap-3 rounded-[14px] border border-line bg-cream px-4 py-3 text-sm shadow-[0_18px_40px_-22px_rgba(80,40,40,0.45)] max-sm:left-4 max-sm:max-w-none"
    >
      <p className="min-w-0 leading-relaxed text-muted">
        PlusOne can plan other events too.{" "}
        <a href={OTHER_EVENTS_SITE} onClick={dismiss} className="whitespace-nowrap text-accent underline underline-offset-2">
          Birthdays, parties and more
        </a>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="-mr-1 -mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-quiet transition hover:bg-accent-soft hover:text-accent"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </aside>
  );
}
