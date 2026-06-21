import { generateAmortizationSchedule, type AmortizationResult } from "./amortization";
import type { PrepaymentEntry } from "@/types/state";

export interface PrepaymentImpact {
  originalTenure: number;
  newTenure: number;
  tenureReducedBy: number;
  originalInterest: number;
  newInterest: number;
  interestSaved: number;
}

/** Pure comparison of two already-computed schedules — no redundant work
 *  for callers (e.g. WorkspaceShell) that have both memoized already. */
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

/**
 * Convenience wrapper for callers (tests, one-off scripts) that don't
 * already have both schedules computed. Generates both from scratch —
 * prefer `summarizePrepaymentImpactFromSchedules` in render paths.
 */
export function summarizePrepaymentImpact(
  amount: number,
  rate: number,
  tenure: number,
  prepayments: PrepaymentEntry[]
): PrepaymentImpact {
  const base = generateAmortizationSchedule(amount, rate, tenure);
  const withPrepayment = generateAmortizationSchedule(amount, rate, tenure, prepayments);
  return summarizePrepaymentImpactFromSchedules(base, withPrepayment);
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
