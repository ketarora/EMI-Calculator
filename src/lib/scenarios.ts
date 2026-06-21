import type { CalculatorInputs, Scenario } from "@/types/state";
import { LIMITS } from "@/types/state";
import { clamp } from "@/lib/finance/format";

/** Picks "Scenario A/B/C" — falls back to a numbered label past 3, though
 *  MAX_SCENARIOS already prevents that case from being reachable. */
export function nextScenarioLabel(existing: { label: string }[]): string {
  const letters = ["A", "B", "C"];
  const used = new Set(existing.map((s) => s.label));
  for (const letter of letters) {
    const label = `Scenario ${letter}`;
    if (!used.has(label)) return label;
  }
  return `Scenario ${existing.length + 1}`;
}

export function buildScenario(id: string, label: string, inputs: CalculatorInputs): Scenario {
  return { id, label, amount: inputs.amount, rate: inputs.rate, tenure: inputs.tenure };
}

/**
 * Two starter scenarios (shorter / longer tenure) for a user's first visit
 * to Compare mode, so the trade-off the mode exists to show is visible
 * immediately. Takes an injectable id generator so this stays unit-testable
 * without mocking global crypto.
 */
export function buildStarterScenarioPair(inputs: CalculatorInputs, generateId: () => string): [Scenario, Scenario] {
  const shorter: Scenario = {
    id: generateId(),
    label: "Scenario A",
    amount: inputs.amount,
    rate: inputs.rate,
    tenure: clamp(inputs.tenure - 12, LIMITS.tenure.min, LIMITS.tenure.max),
  };
  const longer: Scenario = {
    id: generateId(),
    label: "Scenario B",
    amount: inputs.amount,
    rate: inputs.rate,
    tenure: clamp(inputs.tenure + 12, LIMITS.tenure.min, LIMITS.tenure.max),
  };
  return [shorter, longer];
}
