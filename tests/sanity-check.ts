import { workspaceReducer, createInitialState } from "../src/context/workspaceReducer";
import { calculateSensitivityGrid } from "../src/lib/finance/sensitivity";
import { generateAmortizationSchedule } from "../src/lib/finance/amortization";
import { compareScenarios } from "../src/lib/finance/comparison";
import { buildScenario, nextScenarioLabel } from "../src/lib/scenarios";
import type { SharedState } from "../src/types/state";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exitCode = 1;
  } else {
    console.log("ok  :", message);
  }
}

// --- Reducer: basic update + undo round-trip ---
let state: SharedState = createInitialState();
state = workspaceReducer(state, { type: "UPDATE_AMOUNT", payload: 2_000_000 });
assert(state.calculator.amount === 2_000_000, "UPDATE_AMOUNT applies");
assert(state.version === 1, "version increments on mutating action");
assert(state.history.past.length === 1, "history grows on undoable action");

state = workspaceReducer(state, { type: "UPDATE_RATE", payload: 9.5 });
assert(state.calculator.rate === 9.5, "UPDATE_RATE applies");

state = workspaceReducer(state, { type: "UNDO" });
assert(state.calculator.rate === 11, "UNDO restores previous rate (default 11)");
assert(state.calculator.amount === 2_000_000, "UNDO does not touch unrelated fields incorrectly");

state = workspaceReducer(state, { type: "UNDO" });
assert(state.calculator.amount === 1_500_000, "second UNDO restores default amount");

// --- Reducer: amount/rate/tenure clamp at the limits ---
state = workspaceReducer(state, { type: "UPDATE_AMOUNT", payload: 999_999_999 });
assert(state.calculator.amount === 50_00_000, "amount clamps at LIMITS.amount.max");
state = workspaceReducer(state, { type: "UPDATE_RATE", payload: -5 });
assert(state.calculator.rate === 1, "rate clamps at LIMITS.rate.min");

// --- Reducer: scenarios ---
state = createInitialState();
state = workspaceReducer(state, { type: "ADD_SCENARIO", payload: buildScenario("s1", "Scenario A", state.calculator) });
state = workspaceReducer(state, {
  type: "ADD_SCENARIO",
  payload: buildScenario("s2", nextScenarioLabel(state.comparison.scenarios), state.calculator),
});
state = workspaceReducer(state, {
  type: "ADD_SCENARIO",
  payload: buildScenario("s3", nextScenarioLabel(state.comparison.scenarios), state.calculator),
});
assert(state.comparison.scenarios.length === 3, "can add up to 3 scenarios");
state = workspaceReducer(state, {
  type: "ADD_SCENARIO",
  payload: buildScenario("s4", nextScenarioLabel(state.comparison.scenarios), state.calculator),
});
assert(state.comparison.scenarios.length === 3, "a 4th scenario is rejected (MAX_SCENARIOS)");

const secondId = state.comparison.scenarios[1]!.id;
assert(secondId === "s2", "ADD_SCENARIO uses the caller-supplied id, not one generated inside the reducer");
state = workspaceReducer(state, {
  type: "UPDATE_SCENARIO",
  payload: { id: secondId, field: "tenure", value: 24 },
});
assert(state.comparison.scenarios[1]!.tenure === 24, "UPDATE_SCENARIO updates the right scenario");
assert(state.comparison.lastEditedScenarioId === secondId, "lastEditedScenarioId tracks the edit");

state = workspaceReducer(state, { type: "SET_MODE", payload: "compare" });
state = workspaceReducer(state, { type: "SET_MODE", payload: "single" });
assert(state.calculator.tenure === 24, "leaving Compare mode adopts the last-edited scenario's values");

// --- Reducer: prepayment edge cases ---
state = createInitialState();
state = workspaceReducer(state, { type: "ADD_PREPAYMENT", payload: { id: "p1", month: 12, amount: 50_000 } });
state = workspaceReducer(state, { type: "ADD_PREPAYMENT", payload: { id: "p2", month: 12, amount: 25_000 } });
assert(state.prepayment.entries.length === 2, "two prepayment entries can share a month");
assert(
  state.prepayment.entries[0]!.id === "p1" && state.prepayment.entries[1]!.id === "p2",
  "ADD_PREPAYMENT uses the caller-supplied id, not one generated inside the reducer"
);

const schedule = generateAmortizationSchedule(
  state.calculator.amount,
  state.calculator.rate,
  state.calculator.tenure,
  state.prepayment.entries
);
const month12 = schedule.rows.find((r) => r.month === 12);
assert(!!month12 && Math.round(month12.prepayment) === 75_000, "same-month prepayments are summed (50k + 25k = 75k)");

// Prepayment larger than the outstanding balance caps instead of going negative
const closingSchedule = generateAmortizationSchedule(1_00_000, 11, 12, [
  { id: "x", month: 1, amount: 10_000_000 },
]);
assert(
  closingSchedule.rows.every((r) => r.balance >= 0),
  "balance never goes negative even with a huge prepayment"
);
assert(closingSchedule.actualTenure < 12, "an oversized prepayment closes the loan early");

// Prepayment scheduled beyond the actual (shortened) tenure simply never fires
const ignoredLateSchedule = generateAmortizationSchedule(1_00_000, 11, 12, [
  { id: "y", month: 1, amount: 99_000 }, // closes the loan almost immediately
  { id: "z", month: 11, amount: 5_000 }, // loan is already gone by then
]);
assert(
  ignoredLateSchedule.rows.every((r) => r.month !== 11 || r.prepayment === 0),
  "a prepayment past the actual payoff month has no effect"
);

// --- Sensitivity grid: edge clamping near tenure floor ---
const edgeGrid = calculateSensitivityGrid(1_500_000, 11, 3); // tenure=3, offsets -24/-12/-6 all clamp to 1
const uniqueTenures = new Set(edgeGrid.tenures);
assert(uniqueTenures.size === edgeGrid.tenures.length, "sensitivity tenure axis has no duplicate columns near the floor");
assert(edgeGrid.tenures[0] === 1, "lowest tenure axis value clamps to LIMITS.tenure.min");
const currentCell = edgeGrid.rows.flat().find((c) => c.isCurrent);
assert(!!currentCell && currentCell.tenure === 3 && currentCell.rate === 11, "current cell is correctly flagged");

// --- Comparison: lowest total payable wins ---
const results = compareScenarios([
  { id: "a", label: "A", amount: 1_500_000, rate: 11, tenure: 24 },
  { id: "b", label: "B", amount: 1_500_000, rate: 11, tenure: 48 },
  { id: "c", label: "C", amount: 1_500_000, rate: 11, tenure: 60 },
]);
const winner = results.find((r) => r.isBest);
assert(winner?.id === "a", "24-month scenario (lowest total payable) is flagged best, matching the brief's worked example");

// --- Reducer purity: applying the identical action to two independent
// states must yield byte-identical results. This is the property that
// makes "replicate the action" sync sound; tests/live-sync-check.ts
// proves it end-to-end over a real BroadcastChannel, this is the cheap
// always-on version of the same guarantee. ---
const actionsToReplay: Parameters<typeof workspaceReducer>[1][] = [
  { type: "UPDATE_AMOUNT", payload: 32_00_000 },
  { type: "UPDATE_RATE", payload: 14.5 },
  { type: "UPDATE_TENURE", payload: 36 },
  { type: "SWITCH_THEME", payload: "dark" },
  { type: "ADD_SCENARIO", payload: { id: "fixed-1", label: "Scenario A", amount: 10_00_000, rate: 10, tenure: 36 } },
  { type: "ADD_PREPAYMENT", payload: { id: "fixed-2", month: 5, amount: 20_000 } },
  { type: "UNDO" },
];
let replicaOne: SharedState = createInitialState();
let replicaTwo: SharedState = createInitialState();
for (const replayedAction of actionsToReplay) {
  replicaOne = workspaceReducer(replicaOne, replayedAction);
  replicaTwo = workspaceReducer(replicaTwo, replayedAction);
}
assert(
  JSON.stringify(replicaOne) === JSON.stringify(replicaTwo),
  "the reducer is pure: replaying the same action sequence on two independent states converges byte-for-byte"
);

if (process.exitCode === 1) {
  console.error("\nSome checks FAILED.");
  process.exit(1);
} else {
  console.log("\nAll sanity checks passed.");
}
