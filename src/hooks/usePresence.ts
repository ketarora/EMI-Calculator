"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  HEARTBEAT_INTERVAL_MS,
  PRESENCE_CHANNEL_NAME,
  type PeerInfo,
  type PresenceMessage,
  type PresenceSnapshot,
} from "@/types/presence";
import { useBroadcastChannel } from "./useBroadcastChannel";
import { pruneStale, removePeer, upsertPeer, computeLeaderTabId } from "@/lib/sync/peers";

/**
 * Tracks who else is in the workspace and whether *this* tab is the
 * leader. Fully self-contained — it owns its own BroadcastChannel and
 * its own heartbeat timer — so it can be reasoned about independently
 * of the document-sync logic in WorkspaceProvider, which only needs to
 * read the resulting snapshot.
 *
 * `tabId` is injected rather than generated here because the data-sync
 * layer (WorkspaceProvider) also needs to know this tab's identity, and
 * a single source of truth for identity avoids the two layers ever
 * disagreeing about who "this tab" is.
 */
export function usePresence(tabId: string | null): PresenceSnapshot {
  const [peers, setPeers] = useState<Map<string, PeerInfo>>(() => new Map());
  const joinedAtRef = useRef<number>(Date.now());

  const handleMessage = (message: PresenceMessage) => {
    if (message.type === "HEARTBEAT") {
      if (message.payload.tabId === tabId) return; // belt-and-suspenders; BroadcastChannel won't echo this anyway
      setPeers((prev) => upsertPeer(prev, message.payload.tabId, message.payload.joinedAt, Date.now()));
    } else if (message.type === "BYE") {
      setPeers((prev) => removePeer(prev, message.payload.tabId));
    }
  };

  const send = useBroadcastChannel<PresenceMessage>(PRESENCE_CHANNEL_NAME, handleMessage);

  // Heartbeat: announce ourselves immediately, then on a fixed interval.
  useEffect(() => {
    if (!tabId) return;
    const beat = () =>
      send({ type: "HEARTBEAT", payload: { tabId, joinedAt: joinedAtRef.current, timestamp: Date.now() } });
    beat();
    const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [tabId, send]);

  // Prune peers we haven't heard from recently — this is what lets a
  // crashed/frozen tab (no clean unload event) eventually drop off.
  useEffect(() => {
    const interval = setInterval(() => {
      setPeers((prev) => pruneStale(prev, Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Announce departure immediately on a clean close — much snappier
  // than waiting out the stale-peer timeout in every other tab.
  useEffect(() => {
    if (!tabId) return;
    const announceLeave = () => send({ type: "BYE", payload: { tabId } });
    window.addEventListener("pagehide", announceLeave);
    window.addEventListener("beforeunload", announceLeave);
    return () => {
      window.removeEventListener("pagehide", announceLeave);
      window.removeEventListener("beforeunload", announceLeave);
    };
  }, [tabId, send]);

  return useMemo<PresenceSnapshot>(() => {
    if (!tabId) {
      return { tabId: "", isLeader: false, activeTabCount: 1, peers: [] };
    }
    const isLeader = computeLeaderTabId(peers, tabId, joinedAtRef.current) === tabId;
    return {
      tabId,
      isLeader,
      activeTabCount: peers.size + 1,
      peers: Array.from(peers.values()),
    };
  }, [tabId, peers]);
}
