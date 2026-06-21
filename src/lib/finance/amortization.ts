import { calculateEMI, monthlyRate } from "./emi";
import type { PrepaymentEntry } from "@/types/state";

export interface AmortizationRow {
  month: number;
  emi: number;
  principalPaid: number;
  interestPaid: number;
  prepayment: number;
  balance: number;
}

export interface AmortizationResult {
  rows: AmortizationRow[];
  emi: number;
  actualTenure: number;
  totalInterest: number;
  totalPrincipalPaid: number;
  totalPrepaid: number;
  totalPayable: number;
  breakEvenMonth: number | null;
}

/** Sum entries that land in the same month, per the spec's edge case. */
function groupPrepaymentsByMonth(entries: PrepaymentEntry[] | undefined): Map<number, number> {
  const byMonth = new Map<number, number>();
  for (const entry of entries ?? []) {
    if (entry.month < 1 || entry.amount <= 0) continue;
    byMonth.set(entry.month, (byMonth.get(entry.month) ?? 0) + entry.amount);
  }
  return byMonth;
}

/**
 * Generates the full month-by-month schedule. The EMI is held fixed
 * (the "reduce tenure" prepayment strategy from the brief) — any
 * prepayment shrinks the balance and therefore shortens the loan
 * instead of lowering the monthly installment.
 *
 * Edge cases handled inline:
 *  - last regular installment is clipped to the remaining balance, so
 *    the final row never pays more principal than is actually owed
 *  - a prepayment is capped at the balance remaining *after* that
 *    month's scheduled principal, so the loan simply closes early
 *    instead of going negative
 *  - a prepayment scheduled beyond the loan's actual lifetime never
 *    fires, because the loop has already terminated by then
 *  - r === 0 collapses to straight-line principal reduction
 */
export function generateAmortizationSchedule(
  principal: number,
  annualRatePct: number,
  tenureMonths: number,
  prepayments?: PrepaymentEntry[]
): AmortizationResult {
  const emi = calculateEMI(principal, annualRatePct, tenureMonths);
  const r = monthlyRate(annualRatePct);
  const prepaymentsByMonth = groupPrepaymentsByMonth(prepayments);

  const rows: AmortizationRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPrincipalPaid = 0;
  let totalPrepaid = 0;
  let month = 0;

  // Generous safety cap: prevents a runaway loop if pathological inputs
  // (e.g. a near-zero EMI from extreme rounding) ever stalled convergence.
  const safetyCap = Math.max(tenureMonths * 3, 600);

  while (balance > 0.005 && month < safetyCap && principal > 0) {
    month += 1;

    const interestPaid = balance * r;
    let principalPaid = emi - interestPaid;
    if (principalPaid > balance) principalPaid = balance;
    if (principalPaid < 0) principalPaid = 0;

    balance -= principalPaid;

    let prepayment = prepaymentsByMonth.get(month) ?? 0;
    if (prepayment > 0) {
      prepayment = Math.min(prepayment, balance);
      balance -= prepayment;
    }

    const actualEmi = interestPaid + principalPaid;

    totalInterest += interestPaid;
    totalPrincipalPaid += principalPaid;
    totalPrepaid += prepayment;

    rows.push({
      month,
      emi: actualEmi,
      principalPaid,
      interestPaid,
      prepayment,
      balance: Math.max(balance, 0),
    });
  }

  return {
    rows,
    emi,
    actualTenure: rows.length,
    totalInterest,
    totalPrincipalPaid,
    totalPrepaid,
    totalPayable: totalInterest + totalPrincipalPaid,
    breakEvenMonth: findBreakEvenMonth(rows),
  };
}

/**
 * First month where cumulative principal repaid (regular + prepaid)
 * exceeds cumulative interest paid so far.
 */
export function findBreakEvenMonth(rows: AmortizationRow[]): number | null {
  let cumPrincipal = 0;
  let cumInterest = 0;
  for (const row of rows) {
    cumPrincipal += row.principalPaid + row.prepayment;
    cumInterest += row.interestPaid;
    if (cumPrincipal > cumInterest) return row.month;
  }
  return null;
}
