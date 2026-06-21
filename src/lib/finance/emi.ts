/**
 * Reducing-balance EMI math. Interest is charged on the outstanding
 * balance each month, never on the original principal — the standard
 * for retail loans in India and the only mode this app supports.
 */

export interface LoanTotals {
  emi: number;
  totalPayable: number;
  totalInterest: number;
  principalSharePct: number;
  interestSharePct: number;
}

/** Monthly rate as a decimal, e.g. 11 (% p.a.) -> 0.009166... */
export function monthlyRate(annualRatePct: number): number {
  return annualRatePct / 12 / 100;
}

/**
 *        P x r x (1+r)^n
 * EMI = -------------------
 *          (1+r)^n - 1
 *
 * Degenerates gracefully to a straight-line P/n split when r is 0,
 * since the standard formula has a 0/0 indeterminate form there.
 */
export function calculateEMI(principal: number, annualRatePct: number, tenureMonths: number): number {
  if (!Number.isFinite(principal) || !Number.isFinite(annualRatePct) || !Number.isFinite(tenureMonths)) {
    return 0;
  }
  if (principal <= 0 || tenureMonths <= 0) return 0;

  const r = monthlyRate(annualRatePct);
  if (r === 0) return principal / tenureMonths;

  const factor = Math.pow(1 + r, tenureMonths);
  if (!Number.isFinite(factor) || factor === 1) return principal / tenureMonths;

  return (principal * r * factor) / (factor - 1);
}

export function calculateLoanTotals(
  principal: number,
  annualRatePct: number,
  tenureMonths: number
): LoanTotals {
  const emi = calculateEMI(principal, annualRatePct, tenureMonths);
  const totalPayable = emi * tenureMonths;
  const totalInterest = Math.max(totalPayable - principal, 0);

  const principalSharePct = totalPayable > 0 ? (principal / totalPayable) * 100 : 100;
  const interestSharePct = totalPayable > 0 ? (totalInterest / totalPayable) * 100 : 0;

  return { emi, totalPayable, totalInterest, principalSharePct, interestSharePct };
}
