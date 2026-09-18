/**
 * A wall of prints, pinned edge to edge behind the page.
 *
 * Every print is the same size — this is a wall of photographs, not a collage of
 * hero art — and each is nudged a degree or two off square, the way a real pin board
 * is never quite straight. The grid is rotated and over-scaled so it bleeds past all
 * four edges rather than ending in a visible row, and a warm veil sits on top so the
 * card in front stays the thing you read.
 */
const SOURCES = [
  // Weighted towards the photographic scenes: the ink drawings are almost all bare
  // paper, so an even mix leaves pale gaps that clump into a visible diagonal.
  "/thumb-4.jpg",
  "/thumb-7.jpg",
  "/thumb-1.jpg",
  "/thumb-3.jpg",
  "/thumb-6.jpg",
  "/thumb-8.jpg",
  "/thumb-2.jpg",
  "/thumb-5.jpg",
  "/thumb-3.jpg",
  "/thumb-7.jpg",
  "/thumb-9.jpg",
  "/thumb-6.jpg",
  "/thumb-8.jpg",
  "/thumb-4.jpg",
  "/thumb-5.jpg",
];

/** Fixed, so the tilt reads as hand-pinned rather than as a broken layout. */
const TILTS = [-2.4, 1.6, -1.1, 2.2, -1.8, 0.9, -2.9, 1.3, -0.7, 2.6, -1.5, 1.9];

export function PrintWall({ count = 36, quiet = false }: { count?: number; quiet?: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 rotate-[-4deg] scale-[1.18] flex-wrap justify-center gap-5 sm:gap-6 w-[135vw] max-w-none">
        {Array.from({ length: count }, (_, i) => (
          <figure
            key={i}
            className="w-[150px] shrink-0 rounded-[5px] border border-line bg-white p-2 pb-6 shadow-[0_14px_28px_-16px_rgba(70,35,35,0.4)] sm:w-[184px] sm:p-2.5 sm:pb-8"
            style={{ transform: `rotate(${TILTS[i % TILTS.length]}deg)` }}
          >
            <img
              src={SOURCES[(i * 7) % SOURCES.length]}
              alt=""
              loading={i < 12 ? "eager" : "lazy"}
              decoding="async"
              className="aspect-[4/5] w-full rounded-[2px] object-cover"
            />
          </figure>
        ))}
      </div>

      {/* Warm veil: heaviest in the middle where the invitation sits, and heavier still
          behind a page of text, where the wall is a ground rather than the subject. */}
      <div
        className={
          quiet
            ? "absolute inset-0 bg-[linear-gradient(to_bottom,rgba(254,252,247,0.97)_0%,rgba(254,252,247,0.93)_55%,rgba(254,252,247,0.88)_100%)]"
            : "absolute inset-0 bg-[radial-gradient(68%_58%_at_50%_50%,rgba(254,252,247,0.93)_0%,rgba(254,252,247,0.8)_42%,rgba(254,252,247,0.44)_100%)]"
        }
      />
    </div>
  );
}
