/**
 * This is the test I was missing: everything in tests/sanity-check.ts
 * exercises the reducer and finance math in isolation, but never the
 * actual wire protocol. This script opens two real BroadcastChannel
 * instances (Node 18+ ships the same API surface as browsers) in the
 * same process — i.e. two independent "tabs" — and runs real messages
 * through the real peer-registry and reducer code to verify the
 * sync layer itself, not just the pieces around it.
 */
import { workspaceReducer, createInitialState } from "../src/context/workspaceReducer";
import { upsertPeer, removePeer, computeLeaderTabId } from "../src/lib/sync/peers";
import type { PeerInfo } from "../src/types/presence";
import type { SyncMessage } from "../src/types/sync";
import type { SharedState } from "../src/types/state";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exitCode = 1;
  } else {
    console.log("ok  :", message);
  }
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const CHANNEL = "tenure-sim-test";

  // --- 1. Confirm BroadcastChannel never echoes back to its own sender ---
  // This is the load-bearing assumption behind "no echo-suppression loop
  // is possible" in the README. Verify it against the real API, not a
  // belief about the spec.
  {
    const a = new BroadcastChannel(CHANNEL);
    let aReceivedOwnMessage = false;
    a.onmessage = () => {
      aReceivedOwnMessage = true;
    };
    a.postMessage({ ping: 1 });
    await wait(50);
    assert(!aReceivedOwnMessage, "BroadcastChannel does not deliver a message back to its own sender");
    a.close();
  }

  // --- 2. Two real tabs, real heartbeats, real leader computation ---
  {
    const tabA = new BroadcastChannel(CHANNEL);
    const tabB = new BroadcastChannel(CHANNEL);

    let peersSeenByB = new Map<string, PeerInfo>();
    tabB.onmessage = (event: MessageEvent<{ type: string; payload: { tabId: string; joinedAt: number } }>) => {
      const msg = event.data;
      if (msg.type === "HEARTBEAT") {
        peersSeenByB = upsertPeer(peersSeenByB, msg.payload.tabId, msg.payload.joinedAt, Date.now());
      }
      if (msg.type === "BYE") {
        peersSeenByB = removePeer(peersSeenByB, msg.payload.tabId);
      }
    };

    const aJoinedAt = Date.now(); // A joined first
    const bJoinedAt = aJoinedAt + 500; // B joined half a second later

    tabA.postMessage({ type: "HEARTBEAT", payload: { tabId: "tab-A", joinedAt: aJoinedAt } });
    await wait(50);

    assert(peersSeenByB.size === 1, "tab B's peer registry picked up tab A's real heartbeat");
    const leaderFromB = computeLeaderTabId(peersSeenByB, "tab-B", bJoinedAt);
    assert(leaderFromB === "tab-A", "tab B correctly defers leadership to the earlier-joined tab A");

    // A says goodbye — B should drop it immediately, not wait out a timeout.
    tabA.postMessage({ type: "BYE", payload: { tabId: "tab-A" } });
    await wait(50);
    assert(peersSeenByB.size === 0, "a real BYE message removes the peer immediately");
    const leaderAfterBye = computeLeaderTabId(peersSeenByB, "tab-B", bJoinedAt);
    assert(leaderAfterBye === "tab-B", "leadership re-elects to tab B once tab A is gone — no special-case code needed");

    tabA.close();
    tabB.close();
  }

  // --- 3. Real DISPATCH_ACTION replication across two independent reducers ---
  // Simulates the actual production flow: tab A mutates its own state and
  // broadcasts the action; tab B applies the *same action* (never the
  // resulting state) to its own independent reducer instance. If the
  // architecture is sound, both end up byte-identical without B ever
  // having seen A's state directly.
  {
    const dataChannel = "tenure-sim-data";
    const tabA = new BroadcastChannel(dataChannel);
    const tabB = new BroadcastChannel(dataChannel);

    let stateA: SharedState = createInitialState();
    let stateB: SharedState = createInitialState();

    tabB.onmessage = (event: MessageEvent<SyncMessage>) => {
      const msg = event.data;
      if (msg.type === "DISPATCH_ACTION") {
        stateB = workspaceReducer(stateB, msg.action);
      }
    };

    function dispatchOnA(action: Parameters<typeof workspaceReducer>[1]) {
      stateA = workspaceReducer(stateA, action);
      tabA.postMessage({
        type: "DISPATCH_ACTION",
        transactionId: Math.random().toString(36),
        sourceTabId: "tab-A",
        version: stateA.version,
        action,
      });
    }

    dispatchOnA({ type: "UPDATE_AMOUNT", payload: 27_50_000 });
    dispatchOnA({ type: "UPDATE_RATE", payload: 8.25 });
    dispatchOnA({ type: "ADD_PREPAYMENT", payload: { id: "real-prepay-1", month: 6, amount: 50_000 } });
    dispatchOnA({
      type: "ADD_SCENARIO",
      payload: { id: "real-scenario-1", label: "Scenario A", amount: 27_50_000, rate: 8.25, tenure: 36 },
    });
    await wait(80);

    assert(stateB.calculator.amount === 27_50_000, "tab B converged on tab A's amount via real wire messages");
    assert(stateB.calculator.rate === 8.25, "tab B converged on tab A's rate via real wire messages");
    assert(stateB.prepayment.entries.length === 1, "tab B converged on tab A's prepayment entry via real wire messages");
    assert(
      stateB.prepayment.entries[0]?.id === "real-prepay-1",
      "the prepayment entry has the SAME id on both tabs (this is exactly the bug a reducer-internal createId() caused)"
    );
    assert(
      stateB.comparison.scenarios[0]?.id === "real-scenario-1",
      "the scenario also has the same id on both tabs"
    );
    assert(
      JSON.stringify(stateA) === JSON.stringify(stateB),
      "tab A and tab B reach byte-identical state after real cross-channel replication"
    );

    tabA.close();
    tabB.close();
  }

  if (process.exitCode === 1) {
    console.error("\nSome live sync checks FAILED.");
    process.exit(1);
  } else {
    console.log("\nAll live BroadcastChannel sync checks passed (real API, not mocked).");
  }
}

run();
