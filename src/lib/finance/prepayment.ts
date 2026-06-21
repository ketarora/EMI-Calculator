import { type AmortizationResult } from "./amortization";

export interface PrepaymentImpact {
  originalTenure: number;
  newTenure: number;
  tenureReducedBy: number;
  originalInterest: number;
  newInterest: number;
  interestSaved: number;
}

/** Pure comparison of two already-computed schedules — the app always has
 *  both memoized already (one per AmortizationSection on screen), so this
 *  is the only entry point; it never recomputes a schedule itself. */
export function summarizePrepaymentImpactFromSchedules(
  base: AmortizationResult,
  withPrepayment: AmortizationResult
): PrepaymentImpact {
  return {
    originalTenure: base.actualTenure,
    newTenure: withPrepayment.actualTenure,
    tenureReducedBy: Math.max(base.actualTenure - withPrepayment.actualTenure, 0),
    originalInterest: base.totalInterest,
    newInterest: withPrepayment.totalInterest,
    interestSaved: Math.max(base.totalInterest - withPrepayment.totalInterest, 0),
  };
}

/** Validates a prepayment entry against the current tenure before it's added. */
export function validatePrepaymentInput(
  month: number,
  amount: number,
  currentTenure: number
): string | null {
  if (!Number.isFinite(month) || month < 1) return "Month must be 1 or later.";
  if (month > currentTenure) return `Month must be within the current tenure (1–${currentTenure}).`;
  if (!Number.isFinite(amount) || amount <= 0) return "Amount must be greater than ₹0.";
  return null;
}
