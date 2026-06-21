import { calculateLoanTotals, type LoanTotals } from "./emi";
import type { Scenario } from "@/types/state";

export interface ScenarioResult extends LoanTotals {
  id: string;
  label: string;
  amount: number;
  rate: number;
  tenure: number;
  isBest: boolean;
}

/**
 * Runs every scenario through the same EMI + totals math from the
 * calculator and flags the one with the lowest total amount payable —
 * the only criterion the brief defines for "best".
 */
export function compareScenarios(scenarios: Scenario[]): ScenarioResult[] {
  const results = scenarios.map((scenario) => {
    const totals = calculateLoanTotals(scenario.amount, scenario.rate, scenario.tenure);
    return { ...scenario, ...totals, isBest: false };
  });

  if (results.length === 0) return results;

  let bestIndex = 0;
  for (let i = 1; i < results.length; i++) {
    const current = results[i];
    const best = results[bestIndex];
    if (current && best && current.totalPayable < best.totalPayable) bestIndex = i;
  }
  const winner = results[bestIndex];
  if (winner) winner.isBest = true;

  return results;
}
