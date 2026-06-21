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

/**
 * This reducer is a pure function of (state, action) — deliberately. It
 * is replayed independently on every tab from the *same broadcast
 * action*, never from a shared state snapshot, so anything
 * non-deterministic here (Date.now(), Math.random(), crypto.randomUUID())
 * would make every tab compute a different result from "the same" edit.
 * That's exactly the bug tests/live-sync-check.ts caught: an earlier
 * version generated a prepayment entry's id inside this reducer, and two
 * independent reducer instances fed the identical ADD_PREPAYMENT action
 * minted two different ids. Every entity-creating action below therefore
 * carries its id pre-built by the caller (see lib/sync/ids.ts and
 * lib/scenarios.ts) — this reducer only ever appends what it's handed.
 */
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
      // Leaving Compare mode: the last-edited scenario's numbers follow
      // the user back into Single mode, per the brief.
      if (action.payload === "single" && base.ui.mode === "compare") {
        const lastId = base.comparison.lastEditedScenarioId;
        const last = base.comparison.scenarios.find((s) => s.id === lastId);
        if (last) calculator = { amount: last.amount, rate: last.rate, tenure: last.tenure };
      }
      return { ...base, calculator, ui: { ...base.ui, mode: action.payload } };
    }

    case "ADD_SCENARIO": {
      if (base.comparison.scenarios.length >= MAX_SCENARIOS) return base;
      return {
        ...base,
        comparison: {
          scenarios: [...base.comparison.scenarios, action.payload],
          lastEditedScenarioId: action.payload.id,
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

    case "ADD_PREPAYMENT":
      return { ...base, prepayment: { entries: [...base.prepayment.entries, action.payload] } };

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
