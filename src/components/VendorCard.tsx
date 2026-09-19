import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import { money } from "../lib/format";
import { Icon } from "./ui/Icon";
import { usePrivacy } from "../lib/privacy";

type Vendor = FunctionReturnType<typeof api.vendors.listBySlot>[number];

/** Where a rating came from, shown as a name rather than a bare url. */
function sourceName(url: string | undefined) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * What the web says about this vendor, only ever from a page that was actually
 * read. No rating is shown unless `lookupReviews` found one, and it always links
 * back to where it came from.
 */
function Reviews({ vendor }: { vendor: Vendor }) {
  if (vendor.rating === undefined) {
    return (
      <p className="mt-2 text-xs text-quiet">
        {vendor.ratingText ?? "No public rating found for this one."}
      </p>
    );
  }
  const host = sourceName(vendor.reviewSource);
  const count =
    vendor.reviewCount !== undefined
      ? `${vendor.reviewCount.toLocaleString()} ${vendor.reviewCount === 1 ? "review" : "reviews"}`
      : "reviews";
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      <span className="inline-flex items-center gap-1 font-medium text-ink">
        <Icon name="star" size={14} className="text-accent" />
        {vendor.rating.toFixed(1)}
        <span className="font-normal text-quiet">/ 5</span>
      </span>
      {vendor.reviewSource ? (
        <a className="underline decoration-line hover:text-accent" href={vendor.reviewSource} target="_blank" rel="noreferrer">
          {count}
          {host ? ` on ${host}` : ""}
        </a>
      ) : (
        <span>{count}</span>
      )}
    </p>
  );
}

/**
 * The price line: what the vendor publishes, and how it sits against this need's budget.
 * A rate is never presented as a total — a caterer's "$200" is per head, and comparing
 * that to the budget for the whole function is how a vendor gets ranked first by mistake.
 */
function Price({ vendor, budget, currency, guestCount }: { vendor: Vendor; budget: number; currency: string; guestCount: number }) {
  if (vendor.startingPrice === undefined) {
    return <span className="text-quiet">{vendor.priceNotes ?? "no price published"}</span>;
  }
  const theirs = vendor.priceCurrency ?? currency;
  const unit = vendor.priceUnit;
  const unitWord = unit === "per_person" ? " per person" : unit === "per_hour" ? " per hour" : unit === "per_day" ? " per day" : "";
  // Only a total — their own, or a per-head rate multiplied out — can be held against the budget.
  const total =
    unit === "per_person" && guestCount > 0
      ? vendor.startingPrice * guestCount
      : unit === undefined || unit === "total" || unit === "other"
        ? vendor.startingPrice
        : undefined;
  const comparable = total !== undefined && theirs === currency && budget > 0;
  const diff = comparable ? budget - total : 0;
  return (
    <span>
      <span className="text-ink">
        from {money(vendor.startingPrice, theirs)}
        {unitWord}
      </span>
      {unit === "per_person" && guestCount > 0 && (
        <span className="text-quiet"> · about {money(total, theirs)} for {guestCount} guests</span>
      )}
      {comparable && (
        <span className={diff >= 0 ? "text-ok" : "text-bad"}>
          {" "}
          · {money(Math.abs(diff), currency)} {diff >= 0 ? "under" : "over"} budget
        </span>
      )}
      {!comparable && theirs !== currency && <span className="text-quiet"> · quoted in {theirs}</span>}
    </span>
  );
}

/**
 * The other pages this vendor's card was built from. The website already has its own
 * link above, and the same page listed twice reads as a mistake, so both it and any
 * repeat are dropped.
 */
function otherSources(vendor: Vendor) {
  const own = sourceName(vendor.website);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of [...(vendor.pagesRead ?? []), ...(vendor.sourceUrls ?? [])]) {
    const host = sourceName(u);
    if (!host || host === own || seen.has(host)) continue;
    seen.add(host);
    out.push(u);
    if (out.length === 2) break;
  }
  return out;
}

export function VendorCard({
  vendor,
  rank,
  slotBudget,
  currency,
  guestCount,
  fallbackCity,
  canEdit,
  selected,
  onToggleSelected,
  onToggleShortlist,
  onSetEmail,
}: {
  vendor: Vendor;
  /** 1, 2 or 3 for a top pick; undefined for the rest. */
  rank?: number;
  slotBudget: number;
  currency: string;
  /** Guests on the biggest day this need serves, so a per-head rate can be totalled. */
  guestCount: number;
  fallbackCity: string;
  canEdit: boolean;
  selected: boolean;
  onToggleSelected: (next: boolean) => void;
  onToggleShortlist: () => void;
  onSetEmail: (email: string) => void;
}) {
  const privacy = usePrivacy();
  return (
    <li className={`card rise flex flex-col p-5 ${selected ? "ring-2 ring-accent/40" : ""}`}>
      <div className="flex items-start gap-3">
        {rank !== undefined && (
          <span
            className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-sm text-paper"
            aria-label={`Ranked ${rank}`}
          >
            {rank}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[1.05rem] font-medium">{vendor.name}</p>
          <p className="mt-0.5 text-xs text-muted">
            {vendor.city ?? fallbackCity}
            {" · "}
            <Price vendor={vendor} budget={slotBudget} currency={currency} guestCount={guestCount} />
          </p>
        </div>
        {canEdit && (
          <button
            className={vendor.shortlisted ? "chip-pending" : "chip-quiet"}
            onClick={onToggleShortlist}
            aria-pressed={vendor.shortlisted}
          >
            {vendor.shortlisted ? "♥ Shortlisted" : "♡ Shortlist"}
          </button>
        )}
      </div>

      <Reviews vendor={vendor} />

      {vendor.rankReason && (
        <p className="mt-3 border-l-2 border-accent-soft pl-3 text-sm italic leading-relaxed text-muted">
          {vendor.rankReason}
        </p>
      )}

      {vendor.reviewHighlights?.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1">
          {vendor.reviewHighlights.slice(0, 3).map((h, i) => (
            <li key={i} className="chip-quiet">“{h}”</li>
          ))}
        </ul>
      )}

      {vendor.summary && <p className="mt-3 text-sm leading-relaxed">{vendor.summary}</p>}

      {vendor.packages?.length > 0 && (
        <ul className="mt-3 space-y-0.5 text-xs text-muted">
          {vendor.packages.slice(0, 3).map((p, i) => (
            <li key={i}>
              <span className="text-ink">{p.name}</span>
              {p.price ? ` · ${money(p.price, vendor.priceCurrency ?? currency)}` : ""}
              {p.description ? ` — ${p.description}` : ""}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {vendor.website && (
          <a className="inline-flex items-center gap-1 underline decoration-line hover:text-accent" href={vendor.website} target="_blank" rel="noreferrer">
            Website <Icon name="external" size={12} />
          </a>
        )}
        {otherSources(vendor).map((u) => (
          <a key={u} className="text-quiet underline decoration-line hover:text-accent" href={u} target="_blank" rel="noreferrer">
            {sourceName(u)}
          </a>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
        {vendor.email ? (
          <span className="truncate font-mono text-[11px] text-muted">{privacy.email(vendor.email)}</span>
        ) : canEdit ? (
          <form
            className="flex min-w-0 flex-1 gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const email = String(f.get("email") ?? "").trim();
              if (email) onSetEmail(email);
            }}
          >
            <input
              name="email"
              type="email"
              className="input py-1 text-xs"
              placeholder={vendor.hasContactFormOnly ? "Contact form only — add an email" : "No email found — add one"}
              aria-label={`Email for ${vendor.name}`}
            />
            <button className="btn-ghost btn-sm">Save</button>
          </form>
        ) : (
          <span className="text-[11px] text-quiet">No email yet</span>
        )}
        {canEdit && vendor.email && (
          <label className="flex shrink-0 items-center gap-1.5 text-xs">
            <input type="checkbox" checked={selected} onChange={(e) => onToggleSelected(e.target.checked)} />
            Email
          </label>
        )}
      </div>
    </li>
  );
}

export type { Vendor };
export { sourceName };
