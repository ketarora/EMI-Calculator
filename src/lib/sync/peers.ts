import type { PeerInfo } from "@/types/presence";
import { PEER_TIMEOUT_MS } from "@/types/presence";

/** Insert or refresh a peer's last-seen timestamp. Pure — returns a new map. */
export function upsertPeer(
  peers: Map<string, PeerInfo>,
  tabId: string,
  joinedAt: number,
  seenAt: number
): Map<string, PeerInfo> {
  const next = new Map(peers);
  const existing = next.get(tabId);
  next.set(tabId, {
    tabId,
    // Keep the earliest joinedAt we've ever seen for this tab — a peer
    // shouldn't be able to "re-join" with a later timestamp and jump the
    // leader-election queue just because of a missed heartbeat.
    joinedAt: existing ? Math.min(existing.joinedAt, joinedAt) : joinedAt,
    lastSeen: seenAt,
  });
  return next;
}

export function removePeer(peers: Map<string, PeerInfo>, tabId: string): Map<string, PeerInfo> {
  if (!peers.has(tabId)) return peers;
  const next = new Map(peers);
  next.delete(tabId);
  return next;
}

export function pruneStale(
  peers: Map<string, PeerInfo>,
  now: number,
  timeoutMs: number = PEER_TIMEOUT_MS
): Map<string, PeerInfo> {
  let changed = false;
  const next = new Map(peers);
  for (const [tabId, peer] of peers) {
    if (now - peer.lastSeen > timeoutMs) {
      next.delete(tabId);
      changed = true;
    }
  }
  return changed ? next : peers;
}

/** Oldest surviving registration wins — no consensus protocol needed
 *  because BroadcastChannel is a true local broadcast medium, not a
 *  peer-relayed network: every tab sees every heartbeat directly, so
 *  every tab computes the same answer from the same inputs. */
export function computeLeaderTabId(peers: Map<string, PeerInfo>, selfTabId: string, selfJoinedAt: number): string {
  let leaderTabId = selfTabId;
  let earliest = selfJoinedAt;
  for (const peer of peers.values()) {
    if (peer.joinedAt < earliest || (peer.joinedAt === earliest && peer.tabId < leaderTabId)) {
      earliest = peer.joinedAt;
      leaderTabId = peer.tabId;
    }
  }
  return leaderTabId;
}
