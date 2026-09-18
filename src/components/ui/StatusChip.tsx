import { statusLabel } from "../../lib/format";

/** The one place a vendor-need or thread status becomes a colour. */
const tone: Record<string, string> = {
  booked: "chip-ok",
  quoted: "chip-ok",
  replied: "chip-ok",
  yes: "chip-ok",
  contacted: "chip-pending",
  sent: "chip-pending",
  draft: "chip-quiet",
  research: "chip-quiet",
  pending: "chip-quiet",
  no: "chip-quiet",
  declined: "chip-quiet",
  maybe: "chip-warn",
  needs_attention: "chip-warn",
  failed: "chip-warn",
};

export function StatusChip({ status, children }: { status: string; children?: React.ReactNode }) {
  return <span className={tone[status] ?? "chip-quiet"}>{children ?? statusLabel(status)}</span>;
}
