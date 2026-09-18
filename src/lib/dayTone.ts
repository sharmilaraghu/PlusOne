/**
 * Each day gets a quiet tint, derived from its order rather than read from the
 * database, so existing weddings created with the old saturated colours are
 * corrected on sight. The tint washes the card's header strip only, never the
 * whole card and never as a coloured side border.
 */
const TONES = [
  { strip: "bg-rose", rule: "#f0c9c6", name: "blush" },
  { strip: "bg-sage", rule: "#c9d8c4", name: "sage" },
  { strip: "bg-sand", rule: "#e6d9b4", name: "sand" },
  { strip: "bg-sky", rule: "#c8d8e4", name: "sky" },
] as const;

export function dayTone(order: number) {
  return TONES[((order % TONES.length) + TONES.length) % TONES.length];
}
