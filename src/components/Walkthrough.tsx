import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./ui/Icon";

/**
 * A short tour of the real screen, shown once after a couple's first wedding is built.
 *
 * It deliberately does not describe the product in prose. Each step points at an element
 * that is actually on the page, found by its `data-tour` name, so it cannot drift out of
 * date the way the old landing-page slideshow did — that one still told couples they
 * would approve every email, months after PlusOne started sending them itself. A step
 * whose element is missing is skipped rather than shown against nothing.
 */
type Step = { target: string; title: string; body: string; place?: "right" | "bottom" };

const STEPS: Step[] = [
  {
    target: "budget",
    title: "Everything adds up, always",
    body: "Your days, the vendors they need and this total are one sum. Change any of them and the rest follow, so this number is never a guess.",
    place: "bottom",
  },
  {
    target: "days",
    title: "Your wedding, a day at a time",
    body: "Each function lists what it still needs. The pencil edits the name, date, guests and budget — nothing you chose while signing up is stuck.",
    place: "bottom",
  },
  {
    target: "nav-vendors",
    title: "Where PlusOne goes looking",
    body: "Pick a need and describe it in plain words. PlusOne reads real vendor websites and review pages, then ranks the best three with the reason for each.",
    place: "right",
  },
  {
    target: "nav-inbox",
    title: "You confirm once",
    body: "Say yes to a shortlist and PlusOne emails them all from your own wedding address, chases anyone who goes quiet, and reads each reply back into a quote.",
    place: "right",
  },
  {
    target: "nav-decisions",
    title: "Then you just choose",
    body: "Every vendor's price, whether they are free on your dates and what is included, side by side. Book or pass without ever opening an inbox.",
    place: "right",
  },
  {
    target: "nav-settings",
    title: "Change your mind whenever",
    body: "Dates, budget, the feel you're after, and whether PlusOne sends the emails or you read each one first.",
    place: "right",
  },
];

const SEEN_KEY = "plusone.walkthrough.seen";

/** Safe because a private window or blocked storage must not break the app. */
function seen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}
function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* nothing to do: the tour simply shows again next time */
  }
}

export function shouldOfferWalkthrough() {
  return !seen();
}

type Box = { top: number; left: number; width: number; height: number };

export function Walkthrough({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState({ w: 352, h: 210 });

  const live = STEPS.filter((s) => document.querySelector(`[data-tour="${s.target}"]`));
  const step = live[i];

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) return setBox(null);
    const r = el.getBoundingClientRect();
    setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useLayoutEffect(() => {
    const el = step ? document.querySelector(`[data-tour="${step.target}"]`) : null;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = setTimeout(measure, 320); // after the scroll settles
    measure();
    return () => clearTimeout(t);
  }, [step, measure]);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (el) setCardSize({ w: el.offsetWidth, h: el.offsetHeight });
  }, [i, box]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  const finish = useCallback(() => {
    markSeen();
    onClose();
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") setI((x) => Math.min(live.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish, live.length]);

  if (!step) return null;
  const last = i === live.length - 1;

  // The card sits beside a sidebar item and beneath anything in the main column — but
  // never off the edge of the screen, which is where a tall target used to push it.
  const pad = 8;
  const gap = 14;
  const margin = 12;
  const vw = typeof window === "undefined" ? 1200 : window.innerWidth;
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const clamp = (v: number, max: number) => Math.max(margin, Math.min(v, max - margin));

  let top = 80;
  let left = 80;
  if (box) {
    if (step.place === "right") {
      left = box.left + box.width + 16;
      top = box.top - 6;
      // No room to the right (a narrow window, or the nav has wrapped): sit underneath.
      if (left + cardSize.w > vw - margin) {
        left = box.left;
        top = box.top + box.height + gap;
      }
    } else {
      left = box.left;
      top = box.top + box.height + gap;
      // Below the fold: put it above the target instead, and failing that, over it.
      if (top + cardSize.h > vh - margin) {
        const above = box.top - gap - cardSize.h;
        top = above >= margin ? above : Math.max(margin, vh - cardSize.h - margin);
      }
    }
  }
  const card: React.CSSProperties = { top: clamp(top, vh - cardSize.h), left: clamp(left, vw - cardSize.w) };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="walk-title">
      {/* The dimming is the ring's own huge spread shadow, so the element it points at
          stays bright. This layer only catches a click outside it. */}
      <button
        type="button"
        aria-label="Close the walkthrough"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={finish}
      />
      {box && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-[14px] shadow-[0_0_0_3px_var(--color-accent),0_0_0_9999px_rgba(30,30,30,0.45)] transition-all duration-200"
          style={{ top: box.top - pad, left: box.left - pad, width: box.width + pad * 2, height: box.height + pad * 2 }}
        />
      )}

      <div
        ref={cardRef}
        className="absolute w-[min(22rem,calc(100vw-1.5rem))] rounded-[16px] border border-line bg-cream p-5 shadow-[0_24px_60px_-20px_rgba(60,20,20,0.45)]"
        style={card}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-quiet">
            {i + 1} of {live.length}
          </p>
          <button type="button" onClick={finish} aria-label="Close the walkthrough" className="-mr-1 -mt-1 text-quiet hover:text-accent">
            <Icon name="close" size={17} />
          </button>
        </div>
        <h2 id="walk-title" className="mt-1.5 display text-[1.25rem] leading-tight">{step.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" className="text-sm text-quiet underline underline-offset-2 hover:text-accent" onClick={finish}>
            {last ? "" : "Skip"}
          </button>
          <div className="flex gap-2">
            {i > 0 && (
              <button type="button" className="btn-quiet btn-sm" onClick={() => setI((x) => x - 1)}>
                Back
              </button>
            )}
            <button type="button" className="btn-primary btn-sm" onClick={() => (last ? finish() : setI((x) => x + 1))}>
              {last ? "Start planning" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
