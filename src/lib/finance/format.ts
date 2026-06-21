/**
 * Currency handling policy (deliberate, see PRD discussion):
 * we keep money as plain floating-point `number` internally — the
 * formulas are run over a small number of iterations (≤ 84 months,
 * ≤ 49 sensitivity cells), so float drift is negligible — and round
 * only at the boundary where a number is about to be displayed,
 * summed for a user-facing total, or exported. This avoids the far
 * larger bug surface of hand-rolled integer-paise arithmetic for a
 * formula that's defined in continuous compound-interest terms.
 */

/** Round to the nearest rupee for display/export. */
export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100 === 0 ? 0 : Math.round(value);
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrCompactFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
});

export function formatINR(value: number): string {
  return inrFormatter.format(roundCurrency(value));
}

/** Compact form for axis labels / tight spaces, e.g. ₹15.0L, ₹1.2Cr */
export function formatINRCompact(value: number): string {
  const v = roundCurrency(value);
  const abs = Math.abs(v);
  if (abs >= 1_00_00_000) return `₹${inrCompactFormatter.format(v / 1_00_00_000)}Cr`;
  if (abs >= 1_00_000) return `₹${inrCompactFormatter.format(v / 1_00_000)}L`;
  if (abs >= 1_000) return `₹${inrCompactFormatter.format(v / 1_000)}k`;
  return `₹${inrCompactFormatter.format(v)}`;
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
