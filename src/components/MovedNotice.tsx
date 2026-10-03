import { useEffect, useRef } from "react";

const NEW_SITE = "https://scrupulous-hound-784.convex.site";
const SEEN_KEY = "plusone-moved-notice-seen";

/**
 * Shown once, the first time someone opens this site: PlusOne has moved on, and this
 * is the original version. The bar on the landing page says the same thing for anyone
 * who has already dismissed this.
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
        There's a <em>new</em> PlusOne
      </h2>
      <p className="mt-3 leading-relaxed text-muted">
        PlusOne is becoming a copilot for every occasion: weddings, birthdays, anniversaries, team events and more.
      </p>
      <p className="mt-2 leading-relaxed text-muted">
        This site is the original version, kept as it was. The new one is live now.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={NEW_SITE} onClick={remember} className="btn-primary">
          See the new PlusOne
        </a>
        <button type="button" className="btn-ghost" onClick={() => ref.current?.close()}>
          Stay on this version
        </button>
      </div>
    </dialog>
  );
}
