# Tenure — Loan EMI Workspace

A loan EMI calculator where every open browser tab is a window into the
same shared workspace. Change the loan amount in one tab and every other
tab updates instantly — no server, no polling, no `localStorage` event
hacks. Tabs talk to each other directly over the [`BroadcastChannel`
API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API).

Built for the Frontend Intern Assignment — EMI Calculator with Shared
Workspace. Colors, type, and the overall layout follow the brief's own
reference screens (the design-reference pages near the end of the
assignment PDF) — indigo accent, neutral white/near-black surfaces,
amber for interest, blue for principal.

## Live demo / repo

- Live: _add your deployment URL here after deploying (see "Deploying" below)_
- Repo: _add your GitHub URL here_

## Running it locally

Requires Node 18.18+ (Node 20/22 recommended).

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, then open the same URL in a second tab to see
the sync in action — change the amount, rate, tenure, theme, or add a
prepayment in one tab, watch it land in the other.

```bash
npm run build   # production build
npm run start   # serve the production build
npm run test    # tests/sanity-check.ts (reducer + finance math) and
                # tests/live-sync-check.ts (real BroadcastChannel, two
                # simulated tabs, no mocks)
npm run lint    # ESLint
```

## Deploying

This is a static-friendly Next.js app with zero backend and zero
environment variables. The simplest path is Vercel:

1. Push this repo to GitHub (under a name that doesn't reference Groww —
   `tenure-emi-workspace` or similar is fine).
2. Import the repo at [vercel.com/new](https://vercel.com/new) and deploy
   with the default Next.js settings.

It also runs on Netlify, Cloudflare Pages, or any Node host — there's
nothing here that depends on a particular platform.

## What's implemented

**Core**
- EMI calculator (amount / rate / tenure) with synced slider + number
  input pairs, summary cards, and a principal-vs-interest split bar
- Full month-by-month amortization schedule, paginated (12 rows/page),
  with a break-even row highlight and a table/stacked-bar-chart toggle
- Compare mode — up to 3 scenarios side by side, lowest total cost
  highlighted, last-edited scenario's numbers carried back into Single
  mode on exit
- What-if sensitivity grid — rate × tenure, ±1/2/3% and ±6/12/24 months,
  de-duplicated at the edges, current cell highlighted, memoized
- Prepayment planner — multiple lump sums, summed when they land in the
  same month, capped at the outstanding balance, ignored once the loan
  has already closed; shows interest saved and tenure reduced
- Cross-tab sync for all of the above, plus theme and mode
- Tab identity, a live "leader" badge, and a live tab count
- Dark / light theme, synced like any other field

**Bonus**
- Tab leadership / source of truth — a new tab requests state from the
  current leader instead of starting from defaults; leadership re-elects
  automatically if the leader tab closes
- Cross-tab undo — Ctrl/Cmd+Z reverts the last change in every tab
- CSV export of the active amortization schedule (PapaParse)
- URL state sharing — `?amount=&rate=&tenure=` loads a specific scenario
  and the address bar stays in sync as you adjust the calculator

## Architecture

### The reducer must be pure — this was not a theoretical concern

Early on, `ADD_PREPAYMENT` and `ADD_SCENARIO` generated their new entity's
`id` *inside* the reducer with `crypto.randomUUID()`. That looks harmless
in isolation, and `tests/sanity-check.ts` (which only ever runs the
reducer once per assertion) didn't catch it. It's a real bug under this
architecture specifically: because every tab replays the *same broadcast
action* through its own independent reducer instance, two tabs handed an
identical `{ type: "ADD_PREPAYMENT", payload: { month, amount } }` action
would each mint their *own* random id — so "the same" prepayment would
exist under two different ids on two different tabs, and a later
`REMOVE_PREPAYMENT` from one tab would silently fail to remove it on the
other.

`tests/live-sync-check.ts` exists specifically to catch this class of
bug: it opens two real `BroadcastChannel` instances in the same process
(Node 18+ ships the same API surface browsers do) and asserts that two
independent reducers converge to *byte-identical* state after replaying
the same message stream. It failed on the first run. The fix: every
entity-creating action now carries a fully-formed entity built at the
*dispatch call site* (`lib/scenarios.ts`, `lib/sync/ids.ts`) — the
reducer (`context/workspaceReducer.ts`) never calls `Date.now()`,
`Math.random()`, or `crypto.randomUUID()` itself, by rule. There's also a
cheap, always-on version of the same check in `sanity-check.ts` that
replays an action sequence against two fresh states and diffs the result.

This is the one part of this README that isn't describing a deliberate
design decision — it's a bug that real testing found and fixed, left in
here because the alternative (a rewritten history implying it was always
correct) is the more dishonest version of the same document.

### Two channels, not one

```
┌─────────────────────────────┐      ┌──────────────────────────────┐
│   presence channel           │      │   data channel                │
│   (control plane)             │      │   (source of truth)            │
├─────────────────────────────┤      ├──────────────────────────────┤
│  HEARTBEAT (every 1s)        │      │  REQUEST_INIT                 │
│  BYE (on clean unload)       │      │  SYNC_INIT                    │
│                               │      │  DISPATCH_ACTION              │
│  → who's alive, who's leader │      │  → the actual document state  │
└─────────────────────────────┘      └──────────────────────────────┘
        hooks/usePresence.ts              context/WorkspaceProvider.tsx
```

A high-frequency heartbeat and a low-frequency, correctness-critical
document mutation have nothing to do with each other, so they're on
separate `BroadcastChannel`s. This means a burst of heartbeats can never
delay or interleave with a calculator update, and each concern can be
read and tested independently (`lib/sync/peers.ts` has no idea
`WorkspaceProvider` exists).

### State is split into "shared" and "local" — on purpose

The early architecture draft for this project (see note below) put tab
identity, leadership, and the live tab count *inside* the same state
object that gets replicated to every tab. That's a real bug waiting to
happen: every tab has a *different* tab ID and only *one* tab is leader,
so if a leader's full-state snapshot ever overwrote a follower's own
identity, tabs would start fighting over who they are. This app keeps
them apart from the type level up:

- `SharedState` (`types/state.ts`) — calculator inputs, theme, mode,
  comparison scenarios, prepayments, undo history. Identical across every
  tab, replicated via `DISPATCH_ACTION` / `SYNC_INIT`.
- `PresenceSnapshot` (`types/presence.ts`) — this tab's ID, whether it's
  the leader, how many tabs are alive. Different in every tab, never
  serialized into `SharedState`, built entirely from the heartbeat
  protocol in `hooks/usePresence.ts`.

### Sync model: action replication + snapshot fallback

- **Primary path** — every user edit is dispatched locally first
  (optimistic, instant), then broadcast as a `DISPATCH_ACTION` carrying
  the action itself (not a full state diff). Every other tab applies the
  exact same action to its own reducer. This keeps payloads tiny and
  means the only thing that has to be correct is the reducer, which is a
  pure function you can unit test in isolation (see `tests/sanity-check.ts`).
- **Fallback path** — a freshly-mounted tab doesn't know the document's
  history, so it broadcasts `REQUEST_INIT`. Whichever tab currently
  considers itself leader replies with `SYNC_INIT`, a full state
  snapshot. The new tab waits up to 700ms; if nobody answers, it keeps
  its defaults (it's almost certainly the only tab in the room).

### Leader election

Every tab heartbeats its `tabId` and `joinedAt` once a second. Each tab
independently computes the leader as *the surviving peer with the
earliest `joinedAt`* — no votes, no consensus round, no Raft/Paxos. That
shortcut is only safe because `BroadcastChannel` is a genuine local
broadcast medium: every tab hears every heartbeat directly, so every tab
is computing the same answer from the same inputs. If this were routed
through a server or relayed peer-to-peer, the shortcut would break and
you'd actually need a consensus protocol.

A heartbeat going silent for 2.6s (≈2.6 missed beats) drops a peer; a
clean tab close also fires an explicit `BYE` so the remaining tabs update
almost immediately instead of waiting out the timeout. Either way,
because leadership is just "min `joinedAt` among current survivors,"
re-election after the leader disappears isn't a special code path — it's
the same computation naturally returning a different answer.

### Why "echo suppression" isn't actually the problem it sounds like

An early draft of this design called for a `Set<string>` of seen
`transactionId`s to stop "infinite loops" between tabs forwarding
messages back and forth. That framing doesn't apply here:
`BroadcastChannel.postMessage` is defined to **never** deliver a message
back to the channel object that sent it, and nothing in this app relays
or re-broadcasts a message it received — every tab only ever broadcasts
actions *it itself* originated. There is no forwarding, so there's no
loop to suppress.

The `Set<string>` still exists (`WorkspaceProvider`'s `seenIds`), but for
a more mundane reason: idempotency against *duplicate delivery* (e.g. a
retried `SYNC_INIT` race, or a future change that accidentally sends
twice). It's a safety net, not a loop-breaker — the code comments say so
where it matters.

### Versioning is a heuristic, not a lock

Every `DISPATCH_ACTION` carries the sender's local revision count. A
naive design drops any incoming action whose version isn't strictly
greater than the receiver's current version — which sounds rigorous,
but it quietly **loses data** the moment two tabs make a genuinely
concurrent edit: both compute the same "next" version from the same
base, the second one to arrive everywhere looks "stale" by that rule, and
gets silently dropped.

This app doesn't do that. Every received action is applied (after the
duplicate-delivery check above), and the version field is used only as a
development-mode drift heuristic — a console warning if a peer's counter
has drifted suspiciously far from ours, useful for noticing a bug during
development, never something that gates correctness. The honest
trade-off: **concurrent edits to the same field are last-write-wins**,
not merged. For a calculator a single person is using across their own
tabs, that's the right amount of complexity. A true CRDT or
operational-transform layer would be solving a problem this app doesn't
have.

### Cross-tab undo, for free

The undo stack (`history.past`) is a normal field on `SharedState` — it
gets pushed to by the reducer on every undoable action, exactly like
`calculator.amount` does. Because it's just another field, it's already
being replicated by the exact same `DISPATCH_ACTION` pipeline as
everything else. `UNDO` itself is a normal action: dispatch it, every
tab pops its own (already-identical) stack, no special wire format, no
extra plumbing.

### SSR / hydration

Tab identity is generated in a `useEffect` after mount, never during
render — a random ID computed during render would differ between the
server-rendered HTML and the client's first hydration pass and trip a
hydration-mismatch warning. The page also leans on `<Suspense>` around
the one component that calls `useSearchParams()` (for the URL-state
bonus), which is the documented Next.js App Router pattern for that hook.

## Project structure

```
src/
  app/                      Next.js App Router entry (layout, page, globals.css)
  components/
    workspace/              Header, tab presence badge, theme toggle
    calculator/             Input sliders, summary cards, sensitivity grid
    amortization/           Paginated table, Recharts chart, CSV export
    comparison/             Compare-mode scenario cards
    prepayment/              Prepayment planner
    ui/                     Card, Button, Badge, SegmentedControl primitives
  context/
    workspaceReducer.ts      Pure reducer — the single source of truth for state shape
    WorkspaceProvider.tsx     Wires the reducer to the data channel + presence
  hooks/
    useBroadcastChannel.ts   Generic typed BroadcastChannel hook (used by both channels)
    usePresence.ts          Heartbeats, peer registry, leader election
    useDerivedFinance.ts     useMemo wrappers around the pure finance functions
    useUndoShortcut.ts       Ctrl/Cmd+Z → UNDO
    useUrlState.ts          URL query-string bonus
  lib/
    finance/                 emi.ts, amortization.ts, sensitivity.ts, comparison.ts,
                             prepayment.ts, format.ts — pure functions, no React, no DOM
    sync/                    peers.ts (leader election math), ids.ts
    export/                  csv.ts
  types/                     state.ts, actions.ts, sync.ts, presence.ts
tests/
  sanity-check.ts            Exercises the real reducer + finance modules (npm run test)
```

`lib/finance/*` has zero imports from React or the DOM — every formula
in it is independently testable (and is: see `tests/sanity-check.ts`,
which also doubles as a written record of the edge cases this app
handles on purpose).

## Known limitations (stated, not hidden)

- **Concurrency model is last-write-wins per action**, not a CRDT. Two
  tabs editing the *same* field within the same instant will have one
  edit win; this is an explicit, documented trade-off (see "Versioning"
  above), not an oversight.
- **No persistence across reloads.** Closing every tab and reopening
  starts from defaults, by design — the assignment only asks for
  real-time sync between tabs that are open *together*, and there's a
  one-line note in the brief that a fresh tab doesn't need to auto-sync
  with existing tabs (this app does it anyway, via the leadership bonus).
- **Safari's BroadcastChannel during page teardown** can be unreliable,
  which is why the `BYE` message is treated purely as a latency
  optimization — the 2.6s heartbeat timeout is the real, browser-agnostic
  guarantee that a closed tab eventually drops off everyone else's count.
- **Leader hydration has a narrow race window**: if a brand-new tab opens
  in the exact moment between the old leader dying and a new leader's
  first heartbeat settling, it falls back to defaults instead of hydrating.
  Rare in practice, and the failure mode is "shows defaults," not a crash.

## Tech stack

Next.js 14 (App Router) · React 18 (hooks only) · TypeScript (strict,
`noUncheckedIndexedAccess`) · Tailwind CSS · Recharts · PapaParse ·
`BroadcastChannel`. No backend, no state-management library, no UI
component library — everything in `components/ui` is hand-rolled on top
of Tailwind so the whole dependency surface stays auditable in one sitting.
