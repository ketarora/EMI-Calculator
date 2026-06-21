import {
  DEFAULT_CALCULATOR,
  LIMITS,
  MAX_HISTORY,
  MAX_SCENARIOS,
  type HistorySnapshot,
  type SharedState,
} from "@/types/state";
import { UNDOABLE_TYPES, type WorkspaceAction } from "@/types/actions";
import { clamp } from "@/lib/finance/format";
import { createId } from "@/lib/sync/ids";

export function createInitialState(): SharedState {
  return {
    version: 0,
    ui: { theme: "light", mode: "single" },
    calculator: { ...DEFAULT_CALCULATOR },
    comparison: { scenarios: [], lastEditedScenarioId: null },
    prepayment: { entries: [] },
    history: { past: [] },
  };
}

function snapshot(state: SharedState): HistorySnapshot {
  return {
    ui: state.ui,
    calculator: state.calculator,
    comparison: state.comparison,
    prepayment: state.prepayment,
  };
}

function pushHistory(state: SharedState): HistorySnapshot[] {
  const past = [...state.history.past, snapshot(state)];
  return past.length > MAX_HISTORY ? past.slice(past.length - MAX_HISTORY) : past;
}

function nextScenarioLabel(existing: { label: string }[]): string {
  const letters = ["A", "B", "C"];
  const used = new Set(existing.map((s) => s.label));
  for (const letter of letters) {
    const label = `Scenario ${letter}`;
    if (!used.has(label)) return label;
  }
  return `Scenario ${existing.length + 1}`;
}

export function workspaceReducer(state: SharedState, action: WorkspaceAction): SharedState {
  // HYDRATE_STATE replaces the document wholesale — it's the result of a
  // SYNC_INIT handshake, not a user edit, so it bypasses undo/version bump.
  if (action.type === "HYDRATE_STATE") {
    return action.payload;
  }

  const history = UNDOABLE_TYPES.has(action.type) ? pushHistory(state) : state.history.past;
  const base: SharedState = { ...state, version: state.version + 1, history: { past: history } };

  switch (action.type) {
    case "UPDATE_AMOUNT":
      return {
        ...base,
        calculator: { ...base.calculator, amount: clamp(action.payload, LIMITS.amount.min, LIMITS.amount.max) },
      };

    case "UPDATE_RATE":
      return {
        ...base,
        calculator: { ...base.calculator, rate: clamp(action.payload, LIMITS.rate.min, LIMITS.rate.max) },
      };

    case "UPDATE_TENURE":
      return {
        ...base,
        calculator: { ...base.calculator, tenure: clamp(action.payload, LIMITS.tenure.min, LIMITS.tenure.max) },
      };

    case "RESET_CALCULATOR":
      return { ...base, calculator: { ...DEFAULT_CALCULATOR } };

    case "SWITCH_THEME":
      return { ...base, ui: { ...base.ui, theme: action.payload } };

    case "SET_MODE": {
      let calculator = base.calculator;
      let comparison = base.comparison;

      // Leaving Compare mode: the last-edited scenario's numbers follow
      // the user back into Single mode, per the brief.
      if (action.payload === "single" && base.ui.mode === "compare") {
        const lastId = base.comparison.lastEditedScenarioId;
        const last = base.comparison.scenarios.find((s) => s.id === lastId);
        if (last) calculator = { amount: last.amount, rate: last.rate, tenure: last.tenure };
      }

      // Entering Compare mode for the first time with nothing to show yet:
      // seed two starter scenarios off the current inputs (one shorter
      // tenure, one longer) so the trade-off the mode is built to show is
      // visible immediately instead of an empty state.
      if (action.payload === "compare" && base.comparison.scenarios.length === 0) {
        const { amount, rate, tenure } = base.calculator;
        const shorter = {
          id: createId(),
          label: "Scenario A",
          amount,
          rate,
          tenure: clamp(tenure - 12, LIMITS.tenure.min, LIMITS.tenure.max),
        };
        const longer = {
          id: createId(),
          label: "Scenario B",
          amount,
          rate,
          tenure: clamp(tenure + 12, LIMITS.tenure.min, LIMITS.tenure.max),
        };
        comparison = { scenarios: [shorter, longer], lastEditedScenarioId: null };
      }

      return { ...base, calculator, comparison, ui: { ...base.ui, mode: action.payload } };
    }

    case "ADD_SCENARIO": {
      if (base.comparison.scenarios.length >= MAX_SCENARIOS) return base;
      const newScenario = {
        id: createId(),
        label: nextScenarioLabel(base.comparison.scenarios),
        amount: base.calculator.amount,
        rate: base.calculator.rate,
        tenure: base.calculator.tenure,
      };
      return {
        ...base,
        comparison: {
          scenarios: [...base.comparison.scenarios, newScenario],
          lastEditedScenarioId: newScenario.id,
        },
      };
    }

    case "REMOVE_SCENARIO": {
      const scenarios = base.comparison.scenarios.filter((s) => s.id !== action.payload.id);
      const lastEditedScenarioId =
        base.comparison.lastEditedScenarioId === action.payload.id
          ? scenarios[scenarios.length - 1]?.id ?? null
          : base.comparison.lastEditedScenarioId;
      return { ...base, comparison: { scenarios, lastEditedScenarioId } };
    }

    case "UPDATE_SCENARIO": {
      const { id, field, value } = action.payload;
      const limit = LIMITS[field];
      const clamped = clamp(value, limit.min, limit.max);
      const scenarios = base.comparison.scenarios.map((s) => (s.id === id ? { ...s, [field]: clamped } : s));
      return { ...base, comparison: { scenarios, lastEditedScenarioId: id } };
    }

    case "ADD_PREPAYMENT": {
      const entry = { id: createId(), month: action.payload.month, amount: action.payload.amount };
      return { ...base, prepayment: { entries: [...base.prepayment.entries, entry] } };
    }

    case "REMOVE_PREPAYMENT":
      return {
        ...base,
        prepayment: { entries: base.prepayment.entries.filter((p) => p.id !== action.payload.id) },
      };

    case "CLEAR_PREPAYMENTS":
      return { ...base, prepayment: { entries: [] } };

    case "UNDO": {
      const past = [...state.history.past];
      const previous = past.pop();
      if (!previous) return state;
      return {
        ...state,
        version: state.version + 1,
        ui: previous.ui,
        calculator: previous.calculator,
        comparison: previous.comparison,
        prepayment: previous.prepayment,
        history: { past },
      };
    }

    default:
      return state;
  }
}
