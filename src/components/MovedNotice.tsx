import { useEffect, useRef } from "react";

const NEW_SITE = "https://scrupulous-hound-784.convex.site";
const SEEN_KEY = "plusone-every-occasion-notice-seen";

/**
 * Shown once, the first time someone opens this site. This is PlusOne for weddings and
 * it is staying; there is now also a PlusOne for every other occasion, and someone
 * planning a birthday should know before they start. The bar on the landing page says
 * the same thing for anyone who has already dismissed this.
 */
export function MovedNotice() {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // Storage can be blocked; showing the notice again is the harmless outcome.
    }
    if (!seen && ref.current && !ref.current.open) ref.current.showModal();
  }, []);

  const remember = () => {
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // nothing to do
    }
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="moved-title"
      onClose={remember}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-[22px] border border-line bg-cream p-7 text-ink shadow-[0_40px_80px_-30px_rgba(60,20,30,0.45)] backdrop:bg-[rgba(40,20,25,0.4)] backdrop:backdrop-blur-[3px] md:p-8"
    >
      <h2 id="moved-title" className="display text-[1.9rem] leading-tight">
        PlusOne now does <em>every</em> occasion
      </h2>
      <p className="mt-3 leading-relaxed text-muted">
        You're on PlusOne for weddings, and it's staying right here.
      </p>
      <p className="mt-2 leading-relaxed text-muted">
        Planning a birthday, an anniversary, a team event or anything else? There's a new PlusOne for that.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={NEW_SITE} onClick={remember} className="btn-primary">
          See the new PlusOne
        </a>
        <button type="button" className="btn-ghost" onClick={() => ref.current?.close()}>
          I'm planning a wedding
        </button>
      </div>
    </dialog>
  );
}
