# eFactory One — Frontend Refactor Plan

> Status: proposal · do not implement until reviewed
> Scope: `index.html`, `shell.jsx`, `data.js`, `utils.jsx`, `src/**`
> Constraint: no build step today (Babel-in-browser, `<script>` tag loading). The plan must be incrementally compatible with that.

The goal is **not a rewrite**. It is to fix the architectural seams that already cause demo-visible bugs (stale dashboards, QA queue not updating after submits, new orders invisible in the orders list, dual sources of truth across modules) and make adding the next feature safe.

---

## 1. Current Architecture Problems

### 1.1 How the app is wired today (the facts)

- **Loading model**: `index.html` loads React + ReactDOM + Babel from CDN, then ~37 `<script type="text/babel">` source files in dependency order. Each module is wrapped in an IIFE and publishes its components to `window.X`. The root `App` in `index.html` reads them back from `window`. There is no module system, no bundler.
- **Single root state**: `App` (in `index.html:115-289`) holds five pieces of state — `route`, `role`, `tweaks`, `toasts`, `fixState`. `fixState` is the *only* mutation channel for entity data: a `{ [orderId]: partialPatch }` map merged on top of seed `ORDERS` at read time.
- **Two parallel data side-channels**:
  1. `setFixState` is **prop-drilled** through 17 components that need to mutate orders.
  2. `window.__fixState` and `window.__patchOrder` are **global escape hatches** mirrored from `App` (`index.html:185-193`) so deep trees that didn't get the prop (notably the customer portal) can still read/write.
- **Live-state accessor**: `data.js:291-315` exposes `EF.liveOrders()` / `EF.liveOrder(id)` which merge `ORDERS + GW_DEMO_ASSIGNMENTS + window.__fixState`. This is the *intended* read path. Whether a component uses it is currently a coin flip.
- **Shell**: `shell.jsx` re-implements a separate route map (the `routeMap` in `Sidebar`) and holds its own per-role hardcoded notifications array (`notifsByRole`).
- **Routing**: hash router parsed in `index.html:95-141`. Three giant switch statements (admin/gw/qa) plus a customer section map drive ~42 routes. Role-aware fallbacks (e.g. `admin-dashboard` → `GWDashboard` when role is `gw`) are hand-wired per branch.

### 1.2 Concrete inconsistencies and synchronization bugs

These are not theoretical — they are observable in the current build:

- **Stale dashboard KPIs.** [data.js:202-230](data.js:202) computes `KPI.fridayCount`, `fridayEur`, `qaPending`, `overdueInterim`, `aiFlagged` *once* at module load. After any `setFixState` write (release a Friday batch, flag a submission, complete an order), the admin dashboard at [src/admin/dashboard.jsx](src/admin/dashboard.jsx) keeps showing the old numbers.
- **QA queue does not see new submissions.** [src/gw/submit.jsx:163-185](src/gw/submit.jsx:163) writes `lastSubmissionAt`, `lastSubmissionFile`, `status: 'qa_review'` onto the *order* in `fixState`. It never appends an entry to `EF.SUBMISSIONS`. [src/qa/queue.jsx:359](src/qa/queue.jsx:359) reads `D.SUBMISSIONS` directly, so the QA reviewer never sees the GW's upload.
- **QA verdict does not update the submission.** [src/qa/queue.jsx:374-428](src/qa/queue.jsx:374) mutates the order's status/`qaPassed` but does not update the underlying submission's `qaStatus`, so the submission stays in the queue after being decided.
- **New orders invisible in admin lists.** The wizard [src/admin/order-new-wizard.jsx:67-99](src/admin/order-new-wizard.jsx:67) creates orders at IDs ≥ 9100 by writing to `fixState` only. [src/admin/orders-list.jsx:19](src/admin/orders-list.jsx:19), [src/admin/friday-batch.jsx:21](src/admin/friday-batch.jsx:21), [src/admin/customer-detail.jsx:12](src/admin/customer-detail.jsx:12), [src/admin/ghostwriter-detail.jsx:12](src/admin/ghostwriter-detail.jsx:12), [src/admin/disputes.jsx:11](src/admin/disputes.jsx:11), [src/gw/job-board.jsx:16](src/gw/job-board.jsx:16) all use `D.ORDERS.map(o => ({ ...o, ...fixState[o.id] }))` instead of `liveOrders()`. New orders are absent from those views.
- **Hidden seed mutation.** [src/admin/ghostwriter-detail.jsx:20-30](src/admin/ghostwriter-detail.jsx:20) directly mutates `D.GHOSTWRITERS[i].banned` — bypassing React state entirely. The change is global but does not trigger re-renders on any current view, and it persists across role switches.
- **Duplicated thread / job arrays.**
  - [src/admin/inbox.jsx:14-22](src/admin/inbox.jsx:14) hardcodes its own `threads` array, ignoring `EF.INBOX_THREADS`.
  - [src/gw/dashboard.jsx:27-31](src/gw/dashboard.jsx:27) hardcodes `previewJobs` at IDs 9101-9103 that don't exist in `ORDERS`. Clicking one would route to a non-existent order.
  - [shell.jsx:303-321](shell.jsx:303) keeps a per-role `notifsByRole` map separate from `EF.NOTIFICATIONS`.
  - [src/customer/view.jsx:18-34](src/customer/view.jsx:18) injects `CUST_SYNTH_ORDERS` (#3518) only visible in the customer portal — invisible to admin/GW/QA even though it fakes a real workflow.
- **Two sources for the same gate function.** `_passesGate` in [data.js:204-210](data.js:204) and `passesGate` in [src/admin/friday-batch.jsx:13-19](src/admin/friday-batch.jsx:13) duplicate (and nearly agree on) the Friday release rule. The canonical one is [data.js:`releaseGates](data.js:320)`. Three different code paths can disagree about whether an order is releasable.
- **Local patch hacks.** Customer portal mutates orders via `window.__patchOrder` in three places ([src/customer/view.jsx:578, 603, 625](src/customer/view.jsx:578)); GW persona is hardcoded `'gw-iw'` in `D.GW_ME`, `shell.jsx:47`, and several module-local literals.

### 1.3 Routing issues

- Three places must agree for any new route to work end-to-end: the `App` switch in `index.html`, the `Sidebar.routeMap` in `shell.jsx`, and the per-component `navigate('foo')` callsites (~83 across src/).
- Aliases like `case 'admin-dashboard': body = <GWDashboard …>` make the URL/role/page relationship implicit. Deep links can land on the wrong screen if you reload after switching role.
- `OrdersTable` uses `useEffect` to re-`navigate('order-detail', { id })` when `route.params.id` is present ([src/admin/orders-list.jsx:14-17](src/admin/orders-list.jsx:14)) — a workaround for not having a parameterized list+detail route convention.

### 1.4 State management issues

- `fixState` collides with non-order state. [src/admin/ghostwriter-detail.jsx:28](src/admin/ghostwriter-detail.jsx:28) stuffs `__gw_<id>` keys into `fixState` because it's the only writable global. The dictionary is nominally "order patches".
- Every source file aliases hooks (`const { useState: useStateA } = React`) — a relic of the IIFE/global-script load order and a constant signal that there is no proper module boundary.
- 898 inline `style={{ … }}` blocks across `src/`. Many are repeated layout primitives that already have CSS classes (`flex-col`, `card-pad`, etc.).
- `setFixState`, `toast`, `navigate`, `fixState`, `route` are passed through ~17 components. Several pass them through purely to forward to a child.

### 1.5 Workflow consistency risks

The order lifecycle is implicit and lives in five files:


| Transition                                       | Where it's encoded                                                                                                |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Claim approval (GW Claimed → Active)             | [admin/order-detail.jsx:35-52](src/admin/order-detail.jsx:35)                                                     |
| Assignment lock (pre-pay / post-final)           | [admin/order-detail.jsx:545-552](src/admin/order-detail.jsx:545)                                                  |
| Interim auto-forward vs Final → QA               | [gw/submit.jsx:163-209](src/gw/submit.jsx:163)                                                                    |
| QA verdict → status                              | [qa/queue.jsx:374-428](src/qa/queue.jsx:374) and again in [qa/order-detail.jsx:19-35](src/qa/order-detail.jsx:19) |
| Customer feedback (approve / revision / dispute) | [customer/view.jsx:577-626](src/customer/view.jsx:577)                                                            |
| Friday release                                   | [admin/friday-batch.jsx:42-66](src/admin/friday-batch.jsx:42)                                                     |
| Allowed submission kinds                         | [gw/submit.jsx:25-34](src/gw/submit.jsx:25) only                                                                  |


If a state-machine rule changes (e.g. add `extension_requested` to the allowed-claim list), six files need a coordinated edit and there is no central place to test the whole graph.

### 1.6 Developer experience problems

- "Where is X mutated?" is answered by grep, not by reading a store.
- A new module reaching for "all orders" picks one of three patterns (`D.ORDERS`, `D.ORDERS.map(merge fixState)`, `D.liveOrders()`) and gets different answers.
- Adding a route is a 3-file change. Adding a state field is a 1-2-N file change depending on how many components needed to recompute.
- Babel-in-browser slows hot iteration; every save is a full transpile of every script tag. Not a refactor blocker, but a tax.

---

## 2. Refactor Goals

1. **Single source of truth** for every entity (Orders, Submissions, Customers, GWs, Threads, Notifications). No duplicate arrays, no hardcoded preview lists, no in-place seed mutation.
2. **Reactive shared state.** When admin marks an installment paid, the customer's "open balance" card re-renders. When QA flags AI use, the admin dashboard KPI updates. When the GW submits, the QA queue gets a new row.
3. **Synchronized workflows.** Status transitions go through one function per business event (e.g. `gwSubmitFinal`, `qaPass`, `customerApproveInterim`, `releaseBatch`) — not scattered `setFixState(prev => ({...}))` calls.
4. **Centralized business logic.** `releaseGates`, `passesGate`, `allowedSubmissionKinds`, `assignBlocked`, `custStatusMeta`, etc. all live in one workflow module and are imported by anyone who needs them.
5. **Modular routing.** Route names, role mappings, and the role→default-route logic live in one routes file. Adding a route is a one-file change.
6. **Reusable hooks** so components consume what they need (`useOrder(id)`, `useOrders()`, `useSubmissions(orderId)`, `useCurrentRole()`, `useReleaseGate(id)`) instead of remembering to apply `fixState` correctly.
7. **Backend-like behaviour.** The frontend should *feel* like it's talking to a server: entity reads are by id, mutations are named actions, derived state recomputes automatically.
8. **Lower onboarding cost.** A new contributor should be able to add a screen by reading one architecture note, not by reverse-engineering 37 IIFE files.
9. **Preserve prototype velocity.** No build step, no TypeScript, no router library, no state library. We add ~3 small in-house abstractions. Total net code should *go down*.

---

## 3. Proposed Architecture

### 3.1 Layered map (target)

```
index.html             →  bootstraps React, mounts <App/>
src/core/
  store.js             →  central reactive store + subscribe()
  entities.js          →  normalized entity tables (orders, submissions, customers, gws, threads, notifications)
  actions.js           →  named mutations (assignGw, approveClaim, gwSubmit, qaPass, releaseBatch, …)
  workflow.js          →  pure functions: releaseGates, allowedSubmissionKinds, statusFor, custStatusMeta
  selectors.js         →  derived reads: ordersByGw, submissionsByOrder, kpis, openReceivables
  hooks.js             →  useOrder, useOrders, useSubmissions, useKpis, useReleaseGate, useNotifications, useToast, useNavigation, useCurrentRole
  routes.js            →  ROUTE constants, role→defaultRoute, navItems(role), Router component
  events.js            →  thin pub/sub for cross-cutting events (toast, notify) that aren't entity state
src/shell/
  Shell.jsx            →  Sidebar + Topbar + content slot (consumes hooks, no props drilled)
src/admin/*            →  unchanged surface, rewritten consumers
src/gw/*               →  same
src/qa/*               →  same
src/customer/*         →  same
src/dev/tweaks-panel   →  same
utils.jsx              →  presentational primitives only (Icon, StatusPill, Avatar, ChatMessage, …) — no data
data.js                →  seed only — exports raw arrays, no live merging, no mutators
```

### 3.2 Store architecture

- Implement a tiny **observable store** (under 80 LOC) with `getState()`, `setState(patch)`, `subscribe(fn)`, plus convenience `select(selectorFn)`. No external library.
- State shape:

```js
{
  entities: {
    orders:        { byId: { 3522: {...}, 3524: {...}, … }, allIds: [3522, 3524, …] },
    submissions:   { byId, byOrderId },
    customers:     { byId, allIds },
    ghostwriters:  { byId, allIds },
    threads:       { byId, allIds },
    notifications: { byRole: { admin: [...], gw: [...], qa: [...], customer: [...] } },
  },
  session: { role, gwId, customerId },
  ui: { toasts, tweaks, route },
}
```

- On boot, the store **hydrates** from `data.js` (the seed becomes the initial entities). After that, all writes go through actions. `data.js` becomes immutable.
- The `useStore(selector)` hook subscribes a component to the slice it needs and re-renders on shallow change. This replaces the prop-drilled `fixState`.
- `window.__fixState` and `window.__patchOrder` are **deleted**. `window.efToast` and `window.efNotify` get internal replacements (`actions.toast(...)`, `actions.notify(...)`); the window globals stay only as thin shims so that any out-of-tree code (e.g. tweaks panel, the postMessage edit-mode bridge) keeps working.

### 3.3 Hooks architecture (the new public API)

Every component reads via hooks, never via `D.X` or `window.__X`:

```js
useOrders({ filter, sort })            // returns Order[] applying live patches
useOrder(id)                            // single entity, reactive
useSubmissionsForOrder(orderId)         // joined view
useReleaseGate(orderId)                 // { releasable, blocked, reasons, gates }
useKpis()                               // recomputed from entities (no stale numbers)
useGw(id) / useCustomer(id)
useNavigation()                         // { route, navigate, params }
useCurrentRole()                        // { role, setRole, persona, gwId/customerId/...}
useNotifications()                      // role-scoped feed
useToast()                              // { toast(...) }
useThreads({ scope })                   // for inbox + customer messages
```

Mutation entry points:

```js
import { actions } from 'core/actions';

actions.orders.create(draft);
actions.orders.assignGw(orderId, gwId);
actions.orders.approveClaim(orderId);
actions.orders.markInstallmentPaid(orderId, n);
actions.orders.unpublishFromBoard(orderId);
actions.gw.submit(orderId, { kind, files });
actions.qa.pass(submissionId);
actions.qa.requestRevision(submissionId);
actions.qa.flagAi(submissionId);
actions.customer.approveInterim(orderId);
actions.customer.requestRevision(orderId, note);
actions.customer.escalate(orderId);
actions.payments.releaseBatch(orderIds);
actions.gws.shadowBan(gwId, reason);
```

Each action: validates with `workflow.js`, writes the entity, fires the right `toast`/`notify` events, and updates *all* affected entities (e.g. `qa.pass` updates both the submission and the order, `gw.submit` appends to submissions and patches the order's status).

### 3.4 Entity relationships (normalized)

```
Customer 1—n Order
Order    1—n Submission
Order    1—1 Ghostwriter (nullable)
Order    1—n Installment (embedded for now — not its own table)
Order    1—n Thread (Inbox)
Thread   1—n Message
GW       1—n Order (denormalized via order.gwId)
```

Today this is implicit and joined by hand at every callsite. After refactor: selectors do the joins once.

### 3.5 Routing structure

```js
// core/routes.js
export const ROUTES = {
  ADMIN_DASHBOARD: 'admin-dashboard',
  ORDERS:          'orders',
  ORDER_DETAIL:    'order-detail',
  // …
};

const ROUTE_TABLE = {
  admin: {
    [ROUTES.ADMIN_DASHBOARD]: AdminDashboard,
    [ROUTES.ORDERS]:          OrdersTable,
    [ROUTES.ORDER_DETAIL]:    OrderDetail,
    // …
    default: AdminDashboard,
  },
  gw:       { /* … */ default: GWDashboard },
  qa:       { /* … */ default: QAQueue },
  customer: { /* … */ default: CustomerOrders },
};

function Router() {
  const { route, role } = useStore(s => s.ui);
  const Page = (ROUTE_TABLE[role][route.name] || ROUTE_TABLE[role].default);
  return <Page params={route.params} />;
}
```

Pages no longer receive `fixState`/`setFixState`/`navigate`/`toast` as props. They call hooks. The giant switch in `index.html` collapses to `<Router/>`.

### 3.6 Mutation/update flow

```
component → actions.x.y(args)
            ├── workflow.guard(state, args) — pure validation, throws / returns reason
            ├── store.setState(patch over multiple entity slices)
            ├── events.toast({ … })
            └── events.notify({ to, … })
                    │
                    ▼
           store subscribers
                    │
                    ▼
       affected components re-render via useStore
```

Crucially, **one action can touch multiple entities**, which is the missing piece today (e.g. `gw.submit` updates `submissions` AND `orders`; `qa.pass` updates `submissions` AND `orders` AND triggers `notify` to customer + GW; `payments.releaseBatch` updates many orders in one transition).

### 3.7 Workflow synchronization model

A small finite-state-machine description in `workflow.js` becomes the single truth for what transitions are legal:

```js
export const ORDER_STATES = ['lead','qualified','offer_sent','invoice_sent','available',
  'claimed_pending_approval','active','interim_submitted','under_customer_review',
  'revision_required','final_submitted','qa_review','ai_violation_review',
  'plagiarism_violation_review','delivered','payment_pending','completed','cancelled',
  'on_hold','delay_reported','extension_requested'];

export const TRANSITIONS = {
  approve_claim:        { from: ['claimed_pending_approval'], to: 'active' },
  reject_claim:         { from: ['claimed_pending_approval'], to: 'available', clears: ['gwId','claimedAt'] },
  gw_submit_interim:    { from: ['active'], to: 'under_customer_review' },
  gw_submit_final:      { from: ['active','revision_required'], to: 'qa_review' },
  qa_pass_final:        { from: ['qa_review'], to: 'delivered',  setQaPassed: true },
  qa_pass_interim:      { from: ['qa_review','under_customer_review'], to: 'under_customer_review', setQaPassed: true },
  qa_request_revision:  { from: ['qa_review'], to: 'revision_required', incRound: true },
  qa_flag_ai:           { from: ['qa_review'], to: 'ai_violation_review', setFlag: true },
  customer_approve:     { from: ['under_customer_review','interim_submitted'], to: 'active', setCustomerSatisfied: true },
  customer_request_rev: { from: ['under_customer_review','interim_submitted'], to: 'revision_required', incRound: true },
  customer_accept_final:{ from: ['delivered'], to: 'payment_pending', setCustomerSatisfied: true },
  release_batch:        { from: ['payment_pending'], to: 'completed', requireGate: true },
  // …
};
```

Components don't see this. Actions dispatch to the right transition.

### 3.8 Module boundaries

- `core/*` is pure: no DOM, no React. Knows nothing about pages.
- `shell/Shell.jsx` is the only place that composes layout (sidebar/topbar/content).
- `src/admin|gw|qa|customer/*.jsx` are page components that consume hooks. They do not write to store directly except via `actions.*`.
- `utils.jsx` becomes presentational only.
- `data.js` is read-only seed.

---

## 4. Reactive Data Flow Strategy

### 4.1 Propagation contract

For every mutation, this is the rule: **one action call → all affected entities updated → all subscribed components re-render**. No more "mutate order, hope dashboard sees it next render."

### 4.2 Concrete examples

**Example A — GW submits final:**

- Today: `setFixState({ [orderId]: { status: 'qa_review', lastSubmissionFile: 'x.docx' }})`. QA queue reads `EF.SUBMISSIONS` which doesn't change. **Bug.**
- After: `actions.gw.submit(orderId, { kind: 'final', file })` →
  - Appends `{ id: 's-9182', orderId, kind: 'final_work', qaStatus: 'pending', … }` to `submissions`.
  - Patches order status `active` → `qa_review`.
  - Notifies QA (`notify({ to: 'qa', title: 'New submission · #' + orderId })`).
  - QA queue (subscribed via `useSubmissions({ filter: 'pending' })`) re-renders with the new row.
  - Admin dashboard `useKpis()` recomputes `qaPending + 1` automatically.

**Example B — Customer marks interim approved:**

- Today: `window.__patchOrder(orderId, { status: 'active', customerSatisfied: true })`. Admin's release-gate widget on a different tab has no idea.
- After: `actions.customer.approveInterim(orderId)` →
  - Patches order: status `under_customer_review` → `active`, `customerSatisfied: true`.
  - Admin's `useReleaseGate(id)` recomputes; one of the five gates flips green.
  - Friday-batch screen, if open in another tab/role, re-renders too.

**Example C — Friday batch release:**

- Today: per-row `setFixState` calls in a setTimeout cascade. KPI is stale. New orders not in batch.
- After: `actions.payments.releaseBatch(selectedIds)` →
  - One transactional update flips all selected orders to `completed`, `gwPaymentStatus: 'paid'`.
  - One `notify` per GW.
  - `useKpis().fridayCount` drops to 0.
  - Audit log entry appended (becomes a real entity later if needed).
  - Wizard-created orders are *included* automatically because `releaseBatch` reads from store, which has them.

**Example D — Admin shadow-bans a GW:**

- Today: in-place mutation of `D.GHOSTWRITERS`. No rerender anywhere.
- After: `actions.gws.shadowBan(gwId, reason)` patches `ghostwriters.byId[gwId]`. The GW list, the order detail's "Assigned GW" card, the assignment screen's GW picker, the friday batch's IBAN row — all re-render through `useGw(gwId)`.

### 4.3 Lifecycle alignment

Customer-side, GW-side, admin-side and QA-side each have their own status display, their own "what's next" copy, and their own progress bar. After refactor:

- `workflow.statusFor(order, role)` returns `{ label, color, icon, nextMilestone }`.
- All four views consume that. A status is described once.
- `custStatusMeta` ([customer/view.jsx:46-70](src/customer/view.jsx:46)) and the lifecycle list embedded in admin's `OrderDetail` collapse into one definition.

---

## 5. State Management Plan

### 5.1 Store shape (final)

Already drafted in §3.2. Highlights:

- **Normalized**: `byId` + `allIds` for fast lookup and mutation.
- **No derived data stored.** KPIs, "ordersByGw", "submissionsByOrder" are *selectors*, recomputed lazily and memoized per-render.
- **Patches are entity-scoped.** No more mixing `__gw_`* keys into an order map.

### 5.2 Hooks/selectors

- All read access through the published hook list in §3.3.
- Selectors live in `core/selectors.js`. Pattern:

```js
export const selectOrdersByGw = (state, gwId) =>
  state.entities.orders.allIds
    .map(id => state.entities.orders.byId[id])
    .filter(o => o.gwId === gwId);

export const selectFridayBatch = (state) => {
  const orders = selectAllOrders(state);
  return orders.filter(o => releaseGates(o).releasable);
};
```

### 5.3 Mutation flow

- `actions.<entity>.<verb>(args)` is the only sanctioned write path.
- Each action is a 5-15 LOC function that:
  1. Reads current state.
  2. Validates via `workflow.guard` (returns reason, never throws unhandled).
  3. Computes patch.
  4. Calls `store.setState(patch)`.
  5. Fires events (toast / notify).
- Demo animations (Friday cascade, claim approval emails) stay in components — they are UI-only effects that *eventually* call the action.

### 5.4 Derived state

- `useKpis()` — derives Open Receivables, Friday count/eur, QA pending, Overdue interim, AI flagged from store. Replaces the static `EF.KPI` block in [data.js:202-230](data.js:202).
- `useReleaseGate(id)` — wraps `releaseGates()`.
- `useCustomerLtv(id)`, `useGwHonorTotal(id)`, `useDisputeSummary(id)` — all formerly inline `reduce` blocks.

### 5.5 Avoiding stale / duplicated state

- `EF.KPI` is **deleted**. Anyone needing it calls `useKpis()` or, in non-React code, `selectKpis(store.getState())`.
- Hardcoded `previewJobs` in GW dashboard is **deleted** — replaced with `useOrders({ filter: 'available' }).slice(0,3)`.
- Hardcoded `threads` in admin inbox is **deleted** — replaced with `useThreads()` reading from `entities.threads`.
- Hardcoded `notifsByRole` in shell is **deleted** — replaced with `useNotifications()`.
- Customer synthetic order #3518 moves into seed data so all roles see it consistently (or is dropped if it duplicates something real).

---

## 6. Routing Cleanup Plan

### 6.1 Modular routing

- `core/routes.js` exports:
  - `ROUTES` — name constants.
  - `ROUTE_TABLE[role]` — name → component map (with `default`).
  - `NAV_ITEMS[role]` — sidebar items, each linked to a `ROUTES.`* constant + a badge selector.
  - `parseHash()` / `buildHash()` — kept, moved out of `index.html`.
- `<Router/>` reads `ui.route` + `session.role` from store and renders.

### 6.2 Removing the giant switches

- The 130-line switch in `index.html:198-260` is replaced by `<Router/>`.
- The `routeMap` in `shell.jsx:90-101` is replaced by reading `NAV_ITEMS[role]` (which already knows the route name).

### 6.3 Role-based routing cleanup

- Today: `case 'admin-dashboard': body = <GWDashboard …>`. Implicit aliasing.
- After: `ROUTE_TABLE.gw` simply doesn't list `admin-dashboard`. The router falls back to `default` → `GWDashboard`. URL stays clean — when you switch role, the action `actions.session.setRole(role)` calls `navigate(defaultRouteFor(role))` so the URL becomes correct rather than the page being implicit.

### 6.4 Route constants

- Every `navigate('order-detail', { id })` callsite imports `ROUTES.ORDER_DETAIL`. Adding a route = one edit.
- Catches typos at module-load (referencing `ROUTES.FOO` blows up), unlike string literals today.

---

## 7. Business Logic Cleanup Plan

### 7.1 Where workflow logic should live


| Concern                                                           | New home                                                       |
| ----------------------------------------------------------------- | -------------------------------------------------------------- |
| State machine + transition guards                                 | `core/workflow.js`                                             |
| Allowed submission kinds                                          | `core/workflow.js`                                             |
| Release gate (Friday)                                             | `core/workflow.js` (already canonical there in `releaseGates`) |
| Status display per role                                           | `core/workflow.js#statusFor(order, role)`                      |
| Submission acceptance routing (interim auto-forward / final → QA) | `core/workflow.js#nextStateAfterSubmit`                        |
| Customer feedback rules                                           | `core/workflow.js`                                             |
| Assignment lock conditions                                        | `core/workflow.js#canAssign(order)`                            |


### 7.2 Where actions should live

`core/actions.js` is the *only* place that calls `store.setState`. Every transition appears once. Components fire the action with arguments — never manipulate state shape directly.

### 7.3 Shared business rules

- `releaseGates`, `passesGate`, `nextStateAfterSubmit`, `canAssign`, `allowedSubmissionKinds`, `statusFor`, `submissionClosedReason` — each defined once in `workflow.js`.
- `releaseGates` already exists in [data.js:320-343](data.js:320). It moves to `core/workflow.js` and the duplicate `passesGate` in [admin/friday-batch.jsx:13](src/admin/friday-batch.jsx:13) is deleted.

---

## 8. Styling / System Cleanup Plan

The styling system is already in decent shape — tokens in `:root`, `EFDS.tokens` documented in `utils.jsx`, ~387 classes in `styles.css`. The problem is *use*, not *availability*.

### 8.1 Reduce inline styles

- 898 inline `style={{}}` blocks. The biggest categories:
  - Layout: `display: grid, gridTemplateColumns: '1fr 320px'` — 60+ occurrences. Become `<TwoCol left right/>` or use grid utility classes (`.grid-2-360`, etc.).
  - Status colors: `color: 'var(--red)'` — already covered by `pill-`*, `text-success`, `text-danger`. Replace ad-hoc.
  - Cards with conditional border: `border: gateBlocked ? '1px solid var(--red) ...' : undefined` — these are status states, factor into `.card.is-warn / .is-danger / .is-success`.
- Target: cut inline styles by 60% (≈540 → ~200) without touching the visual result.

### 8.2 Reusable components

Promote these locally-repeated shapes into `utils.jsx`:

- `<KpiCard label value delta tone/>` — appears in dashboards, customer-detail, ghostwriter-detail, disputes (5+ near-identical copies).
- `<CardHeader title meta actions/>` — appears around 50 times as `<div className="card-head">…</div>`.
- `<BannerInfo / BannerWarn / BannerDanger / BannerSuccess>` — 30+ ad-hoc banners.
- `<KvList items={[…]}/>` — replace the manual `<dl class="kv">` patterns.
- `<StatusBadge status role/>` — wraps `StatusPill` with role-aware copy.

### 8.3 Shared design tokens

- The CSS tokens are fine. The component tokens (`EFDS.tokens.space/radius/text`) are documented but not consumed by inline styles. Add 6-8 spacing/sizing utility classes (`.gap-md, .pad-lg`) so inline `padding: 12, gap: 8` can be removed.

### 8.4 UI consistency

- Settle one card pattern (`.card > .card-head + .card-pad`) and remove ad-hoc `<div style={{ padding: 14, border: '1px solid var(--border)' }}>` blocks.
- One avatar placement convention.
- One toolbar pattern (search left, chips middle, actions right).

---

## 9. Migration Strategy

### 9.1 Principles

- **No big bang.** Old and new code co-exist for the duration of the migration. Each phase is shippable on its own.
- **Demo-stable at every commit.** The Friday batch must work after every PR. We do not merge half-converted modules.
- **Adapter layer.** While migrating, the new store is mirrored to `window.__fixState` so legacy modules keep working until they're rewritten. The adapter is deleted at the end.
- **One module at a time.** A module is "migrated" when (a) it reads via hooks, (b) writes via actions, (c) no longer receives `fixState`/`setFixState`/`navigate`/`toast` as props.
- **Never two writes to the same field** from old and new paths simultaneously. The action becomes the writer the moment a single consumer adopts the hook.

### 9.2 Backward compatibility

- `window.efToast`, `window.efNotify`, `window.__patchOrder` keep working as shims throughout migration; they delegate to `actions.toast` / `actions.notify` / `actions.orders.patch`.
- `EF.liveOrder(id)` and `EF.liveOrders()` keep working as shims that call `selectOrder`/`selectOrders`.
- `EF.KPI` keeps working as a getter that calls `selectKpis(store.getState())` — until all consumers are on `useKpis()`.

### 9.3 Preserving demo stability

- A short `docs/demo-paths.md` enumerates the 8-10 demo flows (claim approval, GW submit interim, GW submit final, QA pass, QA flag AI, customer approve interim, customer request revision, Friday batch release, new-order wizard, shadow-ban GW). Every PR runs through these by hand before merge.
- No phase removes a demo path. New behavior is added behind feature flags only when meaningful.

### 9.4 Risk minimization

- The store is added in Phase 2 *next to* the existing `fixState`. Phase 3 is the first one that flips reads. Phase 4 flips writes. So the most reversible (read) change happens before the most committed (write) change.
- Hidden seed mutation in `ghostwriter-detail.jsx` is fixed early (Phase 4) to stop polluting the seed.

---

## 10. Refactor Phases

### Phase 1 — Centralize constants and routes (low risk, high ROI)

- **Goals:** kill the three-place route map, make adding a route trivial.
- **Modules touched:** `index.html`, `shell.jsx`, every `navigate('foo')` callsite (~83) — but most are mechanical search/replace.
- **Strategy:**
  1. Add `core/routes.js` with `ROUTES`, `NAV_ITEMS[role]`, `defaultRouteFor(role)`.
  2. Rewrite `index.html` switch to a `ROUTE_TABLE` lookup.
  3. Rewrite `Sidebar.routeMap` to read from `NAV_ITEMS`.
  4. Replace string literals in `navigate('…')` calls with `ROUTES.`*.
- **Risks:** typos in the route table; mitigated by the table living in one file and being grep-checkable.
- **Improvements:** new routes = one edit; URL → page mapping is reviewable in one place.

### Phase 2 — Introduce shared entity store (additive only)

- **Goals:** stand up `core/store.js`, `entities.js`, `selectors.js`. No component changes yet. Mirror to `window.__fixState` for parity.
- **Modules touched:** none in src/. New core/ folder added. `index.html` boots the store before mounting.
- **Strategy:** hydrate from `data.js`, expose `store.getState/setState/subscribe`. Add a useStore hook. Add a tiny dev helper (`window.__store`) for inspection.
- **Risks:** none — code is dormant until consumed.
- **Improvements:** foundation in place; reviewable in isolation.

### Phase 3 — Reusable hooks and selectors

- **Goals:** publish `useOrder`, `useOrders`, `useSubmissions`, `useKpis`, `useReleaseGate`, `useGw`, `useCustomer`, `useNotifications`, `useToast`, `useNavigation`, `useCurrentRole`.
- **Modules touched:** `core/hooks.js` (new). No call-site changes yet.
- **Risks:** none.
- **Improvements:** ready for adoption.

### Phase 4 — Replace window/global mutations & seed mutations

- **Goals:** delete `window.__patchOrder`. Delete in-place seed mutation in `ghostwriter-detail.jsx`. Convert customer portal to actions.
- **Modules touched:** `customer/view.jsx`, `admin/ghostwriter-detail.jsx`, `App` in `index.html`.
- **Strategy:**
  1. Implement `actions.customer.approveInterim`, `actions.customer.requestRevision`, `actions.customer.escalate`, `actions.gws.shadowBan`.
  2. Replace the three `window.__patchOrder` calls and the GHOSTWRITERS in-place mutation.
  3. Keep `__patchOrder` as a shim for now; remove in Phase 10.
- **Risks:** if `setRole` is wired in customer view incorrectly, role switch could land on wrong page — mitigated by Phase 1's role→default-route logic.
- **Improvements:** customer portal now reactive; admin shadow-ban now visible everywhere immediately.

### Phase 5 — Normalize workflow logic (single state machine)

- **Goals:** move workflow rules into `core/workflow.js`. All transitions go through actions.
- **Modules touched:** `core/workflow.js`, `core/actions.js`, `data.js` (delete `_passesGate`, move `releaseGates`), `admin/friday-batch.jsx` (delete its local `passesGate`), `gw/submit.jsx` (delete `allowedSubmissionKinds` and `CLOSED_SUBMISSION_REASONS`).
- **Strategy:**
  1. Define `TRANSITIONS` map.
  2. Implement `actions.orders.transition(orderId, transitionName, payload)` as the canonical mutator.
  3. Re-implement existing actions on top of `transition()`.
  4. Remove the duplicated rule definitions.
- **Risks:** subtle semantic drift if a transition isn't faithfully translated — mitigated by writing the table directly from the existing call-sites.
- **Improvements:** business rule changes = one file; impossible transitions become impossible at runtime.

### Phase 6 — Synchronize submissions, dashboards, and modules

- **Goals:** every cross-module sync gap from §1.2 disappears.
- **Modules touched:** `gw/submit.jsx`, `qa/queue.jsx`, `qa/order-detail.jsx`, `admin/dashboard.jsx`, `admin/friday-batch.jsx`, `admin/orders-list.jsx`, `admin/customer-detail.jsx`, `admin/ghostwriter-detail.jsx`, `admin/disputes.jsx`, `gw/job-board.jsx`.
- **Strategy:**
  1. `actions.gw.submit` writes to *both* submissions and orders; QA queue subscribed via `useSubmissions` re-renders automatically.
  2. `actions.qa.pass`/`requestRevision`/`flagAi` updates both entities.
  3. Replace `D.ORDERS.map(merge fixState)` patterns with `useOrders()`.
  4. Replace `D.KPI` reads with `useKpis()`.
  5. Replace `D.SUBMISSIONS.filter(...)` reads with `useSubmissions(...)`.
- **Risks:** highest-touch phase; ~15 files. Mitigation: one module per PR, run demo paths after each.
- **Improvements:** the four canonical demo bugs (stale dashboard, QA queue blind, new orders invisible, dashboards drift) are gone.

### Phase 7 — Remove duplicated state

- **Goals:** one entity table per kind. Hardcoded duplicates deleted.
- **Modules touched:** `admin/inbox.jsx` (delete local threads → use `useThreads`), `gw/dashboard.jsx` (delete `previewJobs` → `useOrders({ filter: 'available' }).slice(0, 3)`), `shell.jsx` (delete `notifsByRole` → `useNotifications()`), `customer/view.jsx` (move synthetic #3518 into seed or delete).
- **Risks:** content/copy regression in inbox if the seed `INBOX_THREADS` doesn't match the visual today — easy to fix by adding the missing strings to the seed.
- **Improvements:** edit one place, see it everywhere.

### Phase 8 — Stabilize reactive flows (delete adapters)

- **Goals:** delete `window.__fixState`, `window.__patchOrder`, the `App.fixState` state, the `setFixState`/`fixState` props.
- **Modules touched:** every page that still receives those props (~17). Mostly removing prop names from signatures.
- **Strategy:** at this point all consumers already use hooks. The adapter is dormant. We delete it.
- **Risks:** missing a consumer; mitigated by grep — `setFixState` should match nothing.
- **Improvements:** one mental model. No more "is this updated via fixState or via store?".

### Phase 9 — Clean styling architecture

- **Goals:** cut inline styles by 60%. Promote `<KpiCard>`, `<CardHeader>`, `<BannerInfo>` etc.
- **Modules touched:** `utils.jsx` (additions), every page (replacements).
- **Strategy:** factor one component at a time, replace call-sites in one PR per shape.
- **Risks:** visual diff; mitigated by snapshot comparison (manual click-through of demo paths).
- **Improvements:** much smaller pages, easier review.

### Phase 10 — Remove dead abstractions

- **Goals:** delete leftover scaffolding: `useStateA` aliases (since module collisions stop being a thing once core/ exists), unused window globals, dead `EF.`* exports, dead `_passesGate`.
- **Modules touched:** all src/.
- **Strategy:** mostly find-and-delete.
- **Risks:** none if Phase 1-9 were clean.
- **Improvements:** smaller surface area; easier onboarding.

---

## 11. Risk Analysis

### High-risk modules


| Module                             | Why                                                                         | Mitigation                                                      |
| ---------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `admin/order-detail.jsx` (660 LOC) | Most workflow transitions originate here; biggest blast radius              | Migrate after workflow.js exists (Phase 5+); convert tab-by-tab |
| `admin/friday-batch.jsx`           | Contains the cascade animation + payment release; demo-critical             | Keep animation in component, replace state writes only          |
| `qa/queue.jsx` (579 LOC)           | Most cross-entity touch (submission ↔ order); also has the AI/plag scanners | Phase 6 only; preserve the scanner runners verbatim             |
| `customer/view.jsx` (1260 LOC)     | Three `__patchOrder` callsites; persona resolution is non-trivial           | Phase 4 in isolation; verify all three customer flows after     |


### Synchronization risks

- **Stale closure on `useStore` selectors.** Mitigation: selector identity is stable (referentially equal selector functions); hook re-subscribes on selector change.
- **Action reentrancy.** An action that fires a notify that triggers another component's effect that fires another action. Mitigation: actions are synchronous; effects only run on next render.
- **Multi-tab demo drift.** Persisting store to localStorage so two tabs (admin + customer) stay in sync is *out of scope* for this refactor — but the architecture supports adding it later by subscribing to `storage` events.

### Migration risks

- Forgetting to remove a `setFixState` callsite when its component switched to actions → both writers update the same field. Mitigation: Phase 8 is a single-PR sweep that deletes the prop.
- A new contributor in parallel adds a feature using the old pattern. Mitigation: Phase 1 ships `core/` early; PR template asks "do you read via hook? write via action?".

### Demo stability concerns

- The Friday batch animation, the claim approval dual-email animation, and the GW submit pipeline animation are demo-critical and rely on `setTimeout` cascades. Mitigation: animations stay component-local, only their final `setFixState` call is replaced by an action.

### Breakage to watch

- The customer portal's role-switch dropdown depends on `window.EFShell.ROLES` ([customer/view.jsx:13](src/customer/view.jsx:13)). Keep `EFShell.ROLES` exported until role state moves into `session`.

---

## 12. Priority Matrix

### Highest ROI fixes (ship these first)

1. **Phase 1 (Routes)** — small change, removes a daily papercut, prerequisite for everything else.
2. **Phase 6.4-6.5 (Replace `D.KPI` and `D.ORDERS.map(merge)`)** — kills the four most visible demo bugs.
3. **Phase 4 (Window-mutation removal + GHOSTWRITERS in-place mutation)** — removes the worst architectural smells in <300 LOC of changes.

### Safest improvements (low risk, ship anytime)

- Phase 1, 2, 3 are all additive and reviewable in isolation.
- Phase 7 (delete duplicate arrays) is mechanical.
- Phase 9 (styling) is purely visual review.

### Should happen first

- Phase 1 → 2 → 3 in that order. Everything else builds on these.

### Can wait

- Phase 9 (styling). Cosmetic.
- Phase 10 (dead code). Janitorial.
- Splitting installments into their own entity table — defer until there's a feature that needs it (e.g. payment plan mutations from customer view).

### Should NOT happen now

- Adopting a full state library (Redux, Zustand, Jotai). The custom 80-LOC store fits the prototype better and avoids a build step.
- Adopting a router library. Hash routing works.
- Switching to TypeScript. Net effort vs. benefit is wrong for a one-month migration.
- Introducing a build pipeline (Vite, esbuild). Tempting, but doubles the surface to maintain. Address when the prototype graduates.

---

## 13. Final Target Architecture

### What the app feels like after the refactor

- Adding a new screen: declare a route in `core/routes.js`, write the page component, consume `useOrders()` / `useSubmissions()` / etc. No props threaded.
- Adding a new entity field: edit `entities.js` once. All hooks see it. All actions can write it.
- Adding a new business event: write one transition in `workflow.js`, one action in `actions.js`. All consumers stay reactive.
- Reading "what state does X own": one file (`store.js` + `entities.js`).
- Reading "what mutations exist": one file (`actions.js`).
- Reading "what status transitions are legal": one file (`workflow.js`).

### Operational consistency

- Admin marking installment paid → customer LTV updates → admin dashboard receivables drops → Friday batch widget updates → release-gate widget on order detail flips green → all in one render tick.
- QA flagging AI use → admin dashboard QA queue count drops → admin notification fires → order's release-gate gates the friday batch → AI-violation banner renders on order detail.
- Customer requesting revision → admin dashboard "needs decision" surfaces it → GW's active-jobs list updates → submission count updates.

### What we are explicitly NOT doing

- Not rebuilding the UI.
- Not introducing TypeScript, Redux, React Router, Zustand, Vite, or any other library.
- Not touching the data model (it's fine).
- Not changing visual design, copy, or interaction flows.
- Not introducing tests as part of this refactor (separate effort; the workflow.js extraction makes them trivial to add later).
- Not addressing real persistence — the store stays in-memory, the prototype stays a prototype.

### The 80/20 outcome

- 5 new small files in `core/` (~600 LOC total).
- ~17 files lose props they don't need.
- ~~10 files trade `D.X` and `D.ORDERS.map(merge)` for hooks (~~1 LOC each).
- ~3 files lose hardcoded duplicate arrays.
- 898 inline styles drop to ~350 (Phase 9).
- Net change: roughly flat LOC, dramatically less surface area to reason about per page.

The frontend ends up behaving like it has a backend even though it doesn't — which is exactly what the demo needs to look credible.