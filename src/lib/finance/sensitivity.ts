import { calculateEMI } from "./emi";
import { LIMITS } from "@/types/state";

const RATE_OFFSETS = [-3, -2, -1, 0, 1, 2, 3];
const TENURE_OFFSETS = [-24, -12, -6, 0, 6, 12, 24];

export interface SensitivityCell {
  rate: number;
  tenure: number;
  emi: number;
  isCurrent: boolean;
}

export interface SensitivityGrid {
  rates: number[];
  tenures: number[];
  rows: SensitivityCell[][];
}

/**
 * Offsets are applied in ascending order, so the clamped result is
 * already non-decreasing — collapsing to consecutive-duplicate removal
 * is enough to de-dupe the edges (e.g. tenure = 3mo collapses every
 * negative offset down to the 1-month floor).
 */
function buildAxis(current: number, offsets: number[], min: number, max: number): number[] {
  const values = offsets.map((offset) => Math.min(Math.max(current + offset, min), max));
  const deduped: number[] = [];
  for (const v of values) {
    if (deduped.length === 0 || deduped[deduped.length - 1] !== v) {
      deduped.push(v);
    }
  }
  return deduped;
}

export function calculateSensitivityGrid(
  amount: number,
  currentRate: number,
  currentTenure: number
): SensitivityGrid {
  const rates = buildAxis(currentRate, RATE_OFFSETS, LIMITS.rate.min, LIMITS.rate.max);
  const tenures = buildAxis(currentTenure, TENURE_OFFSETS, LIMITS.tenure.min, LIMITS.tenure.max);

  const rows: SensitivityCell[][] = tenures.map((tenure) =>
    rates.map((rate) => ({
      rate,
      tenure,
      emi: calculateEMI(amount, rate, tenure),
      isCurrent: rate === currentRate && tenure === currentTenure,
    }))
  );

  return { rates, tenures, rows };
}
