"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createInitialState, workspaceReducer } from "./workspaceReducer";
import type { SharedState } from "@/types/state";
import type { WorkspaceAction } from "@/types/actions";
import { CHANNEL_NAME, type SyncMessage } from "@/types/sync";
import type { PresenceSnapshot } from "@/types/presence";
import { useBroadcastChannel } from "@/hooks/useBroadcastChannel";
import { usePresence } from "@/hooks/usePresence";
import { createId } from "@/lib/sync/ids";

/** Components may dispatch anything except HYDRATE_STATE — that one is an
 *  internal implementation detail of the SYNC_INIT handshake below. */
export type PublicWorkspaceAction = Exclude<WorkspaceAction, { type: "HYDRATE_STATE" }>;

interface WorkspaceContextValue {
  state: SharedState;
  dispatch: (action: PublicWorkspaceAction) => void;
  presence: PresenceSnapshot;
  canUndo: boolean;
  /** True once this tab has either hydrated from a leader or given up
   *  waiting and committed to its own defaults. Used to avoid a flash
   *  of default values right before a hydrated snapshot lands. */
  ready: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/** How long a freshly-mounted tab waits for a SYNC_INIT reply before it
 *  accepts that it's the only tab in the room and keeps its defaults. */
const HYDRATION_TIMEOUT_MS = 700;
/** Bound on the duplicate-delivery guard so a long session can't leak memory. */
const SEEN_TRANSACTION_LIMIT = 300;

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, undefined, createInitialState);

  // Identity is generated client-side only, after mount, so the very
  // first server-rendered + hydrated paint is identical on both sides —
  // no random id ever appears in markup React has to reconcile, which
  // would otherwise trip a hydration-mismatch warning.
  const [tabId, setTabId] = useState<string | null>(null);
  useEffect(() => {
    setTabId(createId());
  }, []);

  const presence = usePresence(tabId);

  const [ready, setReady] = useState(false);
  const hydratedRef = useRef(false);
  const seenIds = useRef<Set<string>>(new Set());
  const seenOrder = useRef<string[]>([]);

  const rememberTransaction = useCallback((id: string) => {
    seenIds.current.add(id);
    seenOrder.current.push(id);
    if (seenOrder.current.length > SEEN_TRANSACTION_LIMIT) {
      const oldest = seenOrder.current.shift();
      if (oldest) seenIds.current.delete(oldest);
    }
  }, []);

  // Re-created every render on purpose: useBroadcastChannel re-points its
  // internal ref to the latest closure on every render, so this always
  // sees the current `state` / `presence` without needing its own deps
  // array — there is no staleness window to reason about.
  const handleDataMessage = (message: SyncMessage) => {
    switch (message.type) {
      case "REQUEST_INIT": {
        if (presence.isLeader) {
          send({ type: "SYNC_INIT", payload: { targetTabId: message.payload.sourceTabId, state } });
        }
        return;
      }
      case "SYNC_INIT": {
        if (!hydratedRef.current && tabId && message.payload.targetTabId === tabId) {
          hydratedRef.current = true;
          setReady(true);
          dispatch({ type: "HYDRATE_STATE", payload: message.payload.state });
        }
        return;
      }
      case "DISPATCH_ACTION": {
        if (seenIds.current.has(message.transactionId)) return; // duplicate delivery, not a loop — see CHANNEL_NAME docs
        rememberTransaction(message.transactionId);
        if (process.env.NODE_ENV === "development" && Math.abs(message.version - state.version) > 3) {
          // Heuristic-only drift signal — never gates whether we apply
          // the action. Real conflict resolution would need a CRDT or a
          // server; for this assignment's scope, last-applied-wins per
          // field is an explicit, documented trade-off, not an oversight.
          // eslint-disable-next-line no-console
          console.warn(`[tenure] state revision drift — local v${state.version}, peer v${message.version}`);
        }
        dispatch(message.action);
        return;
      }
    }
  };

  const send = useBroadcastChannel<SyncMessage>(CHANNEL_NAME, handleDataMessage);

  // Hydration handshake — ask the room for state as soon as we know who we are.
  useEffect(() => {
    if (!tabId) return;
    send({ type: "REQUEST_INIT", payload: { sourceTabId: tabId } });
    const timeout = setTimeout(() => {
      if (!hydratedRef.current) {
        hydratedRef.current = true;
        setReady(true); // nobody answered — we're alone; defaults stand
      }
    }, HYDRATION_TIMEOUT_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId]);

  const dispatchPublic = useCallback(
    (action: PublicWorkspaceAction) => {
      dispatch(action);
      if (!tabId) return;
      const transactionId = createId();
      rememberTransaction(transactionId);
      send({ type: "DISPATCH_ACTION", transactionId, sourceTabId: tabId, version: state.version + 1, action });
    },
    [tabId, state.version, send, rememberTransaction]
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({ state, dispatch: dispatchPublic, presence, canUndo: state.history.past.length > 0, ready }),
    [state, dispatchPublic, presence, ready]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within a <WorkspaceProvider>.");
  return ctx;
}
