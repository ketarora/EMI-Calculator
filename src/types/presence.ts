/**
 * Local presence state — one copy per tab, never broadcast wholesale.
 * Built up entirely from the heartbeat protocol below.
 */

export const PRESENCE_CHANNEL_NAME = "tenure-emi-workspace:presence:v1";
export const HEARTBEAT_INTERVAL_MS = 1000;
/** A peer silent for longer than this is considered gone. */
export const PEER_TIMEOUT_MS = 2600;

export interface HeartbeatMessage {
  type: "HEARTBEAT";
  payload: { tabId: string; joinedAt: number; timestamp: number };
}

/** Sent on unload so peers don't have to wait out a heartbeat timeout. */
export interface ByeMessage {
  type: "BYE";
  payload: { tabId: string };
}

export type PresenceMessage = HeartbeatMessage | ByeMessage;

export interface PeerInfo {
  tabId: string;
  /** When this peer first announced itself — the tie-breaker for leader election */
  joinedAt: number;
  /** Last time we heard a heartbeat from this peer (local clock) */
  lastSeen: number;
}

export interface PresenceSnapshot {
  tabId: string;
  isLeader: boolean;
  activeTabCount: number;
  peers: PeerInfo[];
}
