export function money(amount: number | undefined | null, currency = "USD") {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function shortDate(iso: string | undefined) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function longDate(iso: string | undefined) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}

export function timeAgo(ts: number | undefined) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function pct(part: number, whole: number) {
  if (!whole) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}

export const eventPalette = ["#f5e6eb", "#e6e1f5", "#f8f4e8", "#e8f1e6", "#e3edf5", "#f3e9df"];

export function statusLabel(s: string) {
  return s.replace(/_/g, " ");
}

import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

type SlotRow = FunctionReturnType<typeof api.slots.list>[number];
export type FlatSlot = SlotRow["slot"] & Omit<SlotRow, "slot">;
export function flattenSlots(rows: SlotRow[] | undefined): FlatSlot[] | undefined {
  return rows?.map((r) => ({ ...r.slot, vendorsCount: r.vendorsCount, bestQuote: r.bestQuote, bookedVendor: r.bookedVendor }));
}
