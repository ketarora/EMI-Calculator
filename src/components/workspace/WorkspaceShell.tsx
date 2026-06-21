"use client";

import { useMemo } from "react";
import { useWorkspace } from "@/context/WorkspaceProvider";
import { useUndoShortcut } from "@/hooks/useUndoShortcut";
import { useUrlState } from "@/hooks/useUrlState";
import { useAmortizationSchedule, useLoanTotals, useSensitivityGrid } from "@/hooks/useDerivedFinance";
import { summarizePrepaymentImpactFromSchedules } from "@/lib/finance/prepayment";

import { Header } from "@/components/workspace/Header";
import { ThemeEffect } from "@/components/workspace/ThemeEffect";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { InputPanel } from "@/components/calculator/InputPanel";
import { SummaryCards } from "@/components/calculator/SummaryCards";
import { SensitivityGrid } from "@/components/calculator/SensitivityGrid";
import { AmortizationSection } from "@/components/amortization/AmortizationSection";
import { ComparisonMode } from "@/components/comparison/ComparisonMode";
import { PrepaymentPlanner } from "@/components/prepayment/PrepaymentPlanner";

import type { PrepaymentEntry, WorkspaceMode } from "@/types/state";

const MODE_OPTIONS: { value: WorkspaceMode; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "compare", label: "Compare" },
  { value: "prepayment", label: "Prepayment" },
];

const EMPTY_PREPAYMENTS: PrepaymentEntry[] = [];

export function WorkspaceShell() {
  const { state, dispatch, presence, canUndo, ready } = useWorkspace();

  useUrlState(state.calculator, dispatch, ready);
  useUndoShortcut(dispatch, canUndo);

  const totals = useLoanTotals(state.calculator);
  const sensitivityGrid = useSensitivityGrid(state.calculator);
  const baseSchedule = useAmortizationSchedule(state.calculator, EMPTY_PREPAYMENTS);
  const prepaymentSchedule = useAmortizationSchedule(state.calculator, state.prepayment.entries);
  const prepaymentImpact = useMemo(
    () => summarizePrepaymentImpactFromSchedules(baseSchedule, prepaymentSchedule),
    [baseSchedule, prepaymentSchedule]
  );

  function handleCalculatorChange(field: "amount" | "rate" | "tenure", value: number) {
    if (field === "amount") dispatch({ type: "UPDATE_AMOUNT", payload: value });
    if (field === "rate") dispatch({ type: "UPDATE_RATE", payload: value });
    if (field === "tenure") dispatch({ type: "UPDATE_TENURE", payload: value });
  }

  return (
    <div className="min-h-screen bg-bg">
      <ThemeEffect theme={state.ui.theme} />
      <Header
        presence={presence}
        theme={state.ui.theme}
        onThemeChange={(theme) => dispatch({ type: "SWITCH_THEME", payload: theme })}
        canUndo={canUndo}
        onUndo={() => dispatch({ type: "UNDO" })}
      />

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <div className="flex justify-center sm:justify-start">
          <SegmentedControl
            ariaLabel="Workspace mode"
            value={state.ui.mode}
            onChange={(mode) => dispatch({ type: "SET_MODE", payload: mode })}
            options={MODE_OPTIONS}
          />
        </div>

        {state.ui.mode === "single" && (
          <>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
              <InputPanel
                inputs={state.calculator}
                onChange={handleCalculatorChange}
                onReset={() => dispatch({ type: "RESET_CALCULATOR" })}
              />
              <div className="space-y-5">
                <SummaryCards totals={totals} principal={state.calculator.amount} />
                <SensitivityGrid grid={sensitivityGrid} />
              </div>
            </div>
            <AmortizationSection
              schedule={baseSchedule}
              amount={state.calculator.amount}
              rate={state.calculator.rate}
              tenure={state.calculator.tenure}
            />
          </>
        )}

        {state.ui.mode === "compare" && (
          <ComparisonMode
            scenarios={state.comparison.scenarios}
            onAdd={() => dispatch({ type: "ADD_SCENARIO" })}
            onRemove={(id) => dispatch({ type: "REMOVE_SCENARIO", payload: { id } })}
            onFieldChange={(id, field, value) => dispatch({ type: "UPDATE_SCENARIO", payload: { id, field, value } })}
          />
        )}

        {state.ui.mode === "prepayment" && (
          <>
            <PrepaymentPlanner
              entries={state.prepayment.entries}
              currentTenure={state.calculator.tenure}
              impact={prepaymentImpact}
              onAdd={(month, amount) => dispatch({ type: "ADD_PREPAYMENT", payload: { month, amount } })}
              onRemove={(id) => dispatch({ type: "REMOVE_PREPAYMENT", payload: { id } })}
              onClear={() => dispatch({ type: "CLEAR_PREPAYMENTS" })}
            />
            <AmortizationSection
              schedule={prepaymentSchedule}
              amount={state.calculator.amount}
              rate={state.calculator.rate}
              tenure={state.calculator.tenure}
              title="Adjusted schedule"
              subtitle="Amortization reflecting your scheduled prepayments."
            />
          </>
        )}

        <p className="pb-4 text-center text-xs text-muted">
          Open this page in a second tab — inputs, theme, and mode stay in sync via the BroadcastChannel API.
        </p>
      </main>
    </div>
  );
}
