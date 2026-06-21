import type { SharedState, ThemeMode, WorkspaceMode } from "./state";

export type WorkspaceAction =
  | { type: "UPDATE_AMOUNT"; payload: number }
  | { type: "UPDATE_RATE"; payload: number }
  | { type: "UPDATE_TENURE"; payload: number }
  | { type: "RESET_CALCULATOR" }
  | { type: "SWITCH_THEME"; payload: ThemeMode }
  | { type: "SET_MODE"; payload: WorkspaceMode }
  | { type: "ADD_SCENARIO" }
  | { type: "REMOVE_SCENARIO"; payload: { id: string } }
  | {
      type: "UPDATE_SCENARIO";
      payload: { id: string; field: "amount" | "rate" | "tenure"; value: number };
    }
  | { type: "ADD_PREPAYMENT"; payload: { month: number; amount: number } }
  | { type: "REMOVE_PREPAYMENT"; payload: { id: string } }
  | { type: "CLEAR_PREPAYMENTS" }
  | { type: "UNDO" }
  // Local-only: applied when a SYNC_INIT snapshot arrives. Never re-broadcast
  // as a DISPATCH_ACTION — see WorkspaceProvider.
  | { type: "HYDRATE_STATE"; payload: SharedState };

/** Actions that represent a deliberate user edit and should therefore be
 *  pushed onto the undo stack before being applied. */
export const UNDOABLE_TYPES = new Set<WorkspaceAction["type"]>([
  "UPDATE_AMOUNT",
  "UPDATE_RATE",
  "UPDATE_TENURE",
  "RESET_CALCULATOR",
  "SWITCH_THEME",
  "SET_MODE",
  "ADD_SCENARIO",
  "REMOVE_SCENARIO",
  "UPDATE_SCENARIO",
  "ADD_PREPAYMENT",
  "REMOVE_PREPAYMENT",
  "CLEAR_PREPAYMENTS",
]);
