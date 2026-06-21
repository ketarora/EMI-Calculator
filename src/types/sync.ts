import type { SharedState } from "./state";
import type { WorkspaceAction } from "./actions";

/**
 * Two channels, two concerns (control plane / data plane):
 *  - the PRESENCE channel (types/presence.ts) carries only heartbeats and
 *    "I'm leaving" notices — high frequency, tiny payloads, no bearing on
 *    the document itself.
 *  - this DATA channel carries hydration handshakes and replicated
 *    document actions — low frequency, the actual source of truth.
 * Keeping them separate means a burst of heartbeat traffic can never
 * delay or interleave with a document mutation, and either concern can
 * be reasoned about (and tested) independently.
 */
export const CHANNEL_NAME = "tenure-emi-workspace:data:v1";

/** Broadcast by a freshly-mounted tab to ask the current leader for state. */
export interface RequestInitMessage {
  type: "REQUEST_INIT";
  payload: { sourceTabId: string };
}

/** The leader's reply to REQUEST_INIT — a full snapshot for hydration. */
export interface SyncInitMessage {
  type: "SYNC_INIT";
  payload: { targetTabId: string; state: SharedState };
}

/** A single replicated reducer action — the primary sync path. */
export interface DispatchActionMessage {
  type: "DISPATCH_ACTION";
  transactionId: string;
  sourceTabId: string;
  /** Sender's local revision count at send time. Used only as a drift
   *  heuristic (see WorkspaceProvider's handleDataMessage) — never as a
   *  strict ordering gate that could silently drop a concurrent edit. */
  version: number;
  action: WorkspaceAction;
}

export type SyncMessage = RequestInitMessage | SyncInitMessage | DispatchActionMessage;
