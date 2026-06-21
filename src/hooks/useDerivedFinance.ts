"use client";

import { useMemo } from "react";
import { calculateLoanTotals, type LoanTotals } from "@/lib/finance/emi";
import { generateAmortizationSchedule, type AmortizationResult } from "@/lib/finance/amortization";
import { calculateSensitivityGrid, type SensitivityGrid } from "@/lib/finance/sensitivity";
import type { CalculatorInputs, PrepaymentEntry } from "@/types/state";

/**
 * Every hook below is a thin useMemo wrapper around a pure function from
 * lib/finance. None of this math is expensive in isolation, but the
 * sensitivity grid alone is up to 49 EMI evaluations and the amortization
 * loop can run up to 84+ iterations — recomputing either on every
 * keystroke-driven re-render (rather than only when the inputs that feed
 * them actually change) is the kind of thing that shows up as visible
 * jank while dragging a slider, so it's memoized at the source.
 */

export function useLoanTotals(inputs: CalculatorInputs): LoanTotals {
  return useMemo(
    () => calculateLoanTotals(inputs.amount, inputs.rate, inputs.tenure),
    [inputs.amount, inputs.rate, inputs.tenure]
  );
}

export function useAmortizationSchedule(
  inputs: CalculatorInputs,
  prepayments: PrepaymentEntry[] = []
): AmortizationResult {
  return useMemo(
    () => generateAmortizationSchedule(inputs.amount, inputs.rate, inputs.tenure, prepayments),
    [inputs.amount, inputs.rate, inputs.tenure, prepayments]
  );
}

export function useSensitivityGrid(inputs: CalculatorInputs): SensitivityGrid {
  return useMemo(
    () => calculateSensitivityGrid(inputs.amount, inputs.rate, inputs.tenure),
    [inputs.amount, inputs.rate, inputs.tenure]
  );
}
