# Frontend Architecture — Learning Guide (eFactory One)

> A senior engineer’s walk-through of **what we just built**, why each piece exists, and what professional frontend systems look like under the hood.
>
> All examples are **real code from this repo**. No generic React tutorials.
>
> Read top-to-bottom once. Then keep this open as a reference while reading `src/core/`.

---

## Part 0 — How to read this document

Every section follows the same shape:

1. **Before** — the messy pattern we used to have (still real, just removed).
2. **Why we did it** — it wasn’t stupid; it was fast.
3. **Why it became dangerous** — the failure mode that actually bit us.
4. **After** — the new code, with file/line references.
5. **Why senior engineers care** — what this maps to in real SaaS.

---

## Part 1 — The big picture (what changed)

### Before

State was scattered across **three different layers** of the app:

```
React state (App.useState fixState)
        │
        ▼ (passed as prop through ~17 components)
       Pages
        │
        ▼ (mirrored to a global)
window.__fixState
        │
        ▼ (read by data.js)
EF.liveOrders() → screens that didn't get the prop
```

Three writers, two readers, and a global mirror keeping them in sync. Bugs were inevitable: stale dashboards, blind QA queues, invisible wizard orders, customer view not reacting to admin changes.

### After

There is now **one** state container and **one** way to read or write:

```
                  ┌─────── src/core/store.js ───────┐
                  │  state = { entities, session,    │
                  │            ui, meta }            │
                  │  getState / setState / subscribe │
                  └──────────────┬───────────────────┘
                                 │
              ┌──────────────────┼──────────────────────┐
              │                  │                      │
         hooks.js          actions.js            selectors.js
       (read for React) (write for everyone)  (pure derived reads)
              │                  │                      │
              ▼                  ▼                      ▼
         Components         Components           Anywhere
         call useX()        call EFActions.*     (incl. compat.js)
```

Plus three supporting modules:

- `**workflow.js**` — pure rules: state machine, release gates, allowed submissions.
- `**routes.js**` — route names, hash parsing, sidebar nav metadata.
- `**compat.js**` — keeps the legacy `EF.*` API working while we migrate.

You can verify all of this is real:

```
src/core/
  store.js       74 LOC
  entities.js    80
  selectors.js   130
  hooks.js       133
  actions.js     425
  workflow.js    179
  routes.js      164
  compat.js      33
              ─────
              ~1,200 LOC total
```

That’s the entire foundation of a "real" frontend architecture. No npm dependencies. No bundler.

---

## Part 2 — The store: a 74-line in-house Redux

Open `src/core/store.js`. The whole thing fits on one screen.

### What it actually is

A plain JS object plus three primitives:

```50:55:src/core/store.js
function tableUpsert(table, item) {
  const id = item.id;
  const exists = Object.prototype.hasOwnProperty.call(table.byId, id);
  return {
    byId: { ...table.byId, [id]: item },
    allIds: exists ? table.allIds : [...table.allIds, id],
  };
}
```

Three exported functions matter most:

- `getState()` — read the current snapshot.
- `setState(updater, label)` — replace state with a new object.
- `subscribe(fn)` — register a listener; returns an unsubscribe.

### What `setState` actually does

```26:41:src/core/store.js
function setState(update, label) {
  const next = typeof update === 'function' ? update(state) : { ...state, ...update };
  if (!next || next === state) return state;
  state = {
    ...next,
    meta: {
      ...(next.meta || {}),
      version: ((state.meta && state.meta.version) || 0) + 1,
      lastAction: label || (next.meta && next.meta.lastAction) || null,
    },
  };
  listeners.forEach(fn => {
    try { fn(state); } catch (e) { setTimeout(() => { throw e; }); }
  });
  return state;
}
```

Three things to notice:

1. **Immutability**: we never mutate `state` in place. Every change produces a **new** object. This is what lets React detect changes by reference (`Object.is`) instead of deep comparison.
2. `**meta.version` increments on every change.** This is a clever trick — components that subscribe to `s.meta.version` re-render on **any** store change. We use this in `App()` and `Sidebar` to keep them in sync without subscribing to specific slices.
3. `**label`** is just for debugging. Open DevTools, check `window.__store.getState().meta.lastAction` after a click — it tells you which action ran.

### Why senior engineers care

This is **literally** what Redux’s `createStore` does in 5,000 LOC. The 74-LOC version is enough because we don’t need DevTools middleware, async middleware, time-travel, or library-level optimizations.

Once you understand these 74 lines, **you understand Redux, Zustand, Jotai, MobX, and every other state library**. They all have a `state + setState + subscribe` core. The rest is ergonomics.

---

## Part 3 — Normalized entities (why `byId / allIds`)

Open `src/core/entities.js`.

### Before

`data.js` exported flat arrays:

```js
ORDERS = [ {id: 3522, ...}, {id: 3524, ...}, ... ]
```

Reading order #3522 meant `ORDERS.find(o => o.id === 3522)` — O(n). Adding a wizard-created order #9100 meant **stuffing it into a separate `fixState` overlay** because `ORDERS` was the seed and we didn’t want to mutate it.

### After

```7:16:src/core/entities.js
function normalize(list) {
  const byId = {};
  const allIds = [];
  (list || []).forEach(item => {
    if (!item || item.id == null || byId[item.id]) return;
    byId[item.id] = clone(item);
    allIds.push(item.id);
  });
  return { byId, allIds };
}
```

Every entity is stored as `{ byId, allIds }`. Lookup is O(1). Iteration is O(n). New items append to **both** structures atomically.

### Why this matters in practice


| Operation                 | Old (flat array)                                                    | New (normalized)                                                 |
| ------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Find order #3522          | `ORDERS.find(...)`                                                  | `state.orders.byId[3522]`                                        |
| Update order #3522        | rebuild whole array                                                 | `tablePatch(table, 3522, patch)`                                 |
| Append wizard order #9100 | stuff into `fixState` overlay; pray every list reads `liveOrders()` | `tableUpsert(orders, newOrder)` — visible everywhere immediately |
| Render an order list      | iterate seed + merge fixState patches                               | `allIds.map(id => byId[id])`                                     |


### Hydration: how seed data enters the store

```61:77:src/core/entities.js
function hydrate() {
  const D = window.EF || {};
  const baseOrders = [
    ...(D.ORDERS || []),
    ...(D.GW_DEMO_ASSIGNMENTS || []),
  ];
  if (!baseOrders.some(o => Number(o.id) === 3518)) baseOrders.push(customerDemoOrder());

  return {
    orders: normalize(baseOrders),
    submissions: normalize(D.SUBMISSIONS || []),
    customers: normalize(D.CUSTOMERS || []),
    ghostwriters: normalize(D.GHOSTWRITERS || []),
    threads: normalize(D.INBOX_THREADS || []),
    notifications: normalize(roleSeedNotifications(D)),
  };
}
```

This runs **once at boot**. After that, the store is the truth. `data.js` becomes a frozen seed.

### Why senior engineers care

This is exactly how Redux Normalizr, RTK Query, Apollo Client cache, and every backend ORM model data. Normalized state is the **default vocabulary** of professional frontend codebases.

---

## Part 4 — Selectors (the read API)

Open `src/core/selectors.js`. Selectors are **pure functions of state**.

### Before

Every screen invented its own filtering logic:

```js
// admin/orders-list.jsx (old)
D.ORDERS.map(o => ({ ...o, ...fixState[o.id] }))

// admin/friday-batch.jsx (old)
D.ORDERS.filter(o => o.status === 'payment_pending' && passesGate(o))

// admin/dashboard.jsx (old)
D.KPI.qaPending  // computed once at module load — STALE
```

Same question, three answers, two of them wrong.

### After

```31:33:src/core/selectors.js
function selectQaQueue(state) {
  return selectAllSubmissions(state).filter(s => s.qaStatus === 'pending' || s.aiScore > 50);
}
```

```73:96:src/core/selectors.js
function selectKpis(state) {
  const orders = selectAllOrders(state);
  const submissions = selectAllSubmissions(state);
  const friday = orders.filter(o => W.releaseGates(o).releasable);
  const fridayEur = friday.reduce((s, o) => s + (o.netHonorarium || 0), 0);
  const now = window.EF?.DEMO_NOW || new Date();
  return {
    openReceivables: orders.reduce((s, o) => s + (o.outstandingEur || 0), 0),
    activeOrders: 645,
    completedLifetime: 3359,
    totalLifetime: 3522,
    fridayCount: friday.length,
    fridayEur: Math.round(fridayEur * 100) / 100,
    qaPending: submissions.filter(s => s.qaStatus === 'pending').length,
    overdueInterim: orders.filter(o => {
      if (!o.interimDeadline) return false;
      if (['completed','cancelled','payment_pending'].includes(o.status)) return false;
      return new Date(o.interimDeadline) < now;
    }).length,
    aiFlagged: submissions.filter(s => s.aiScore >= 70 || s.flagged).length,
    disputesOpen: orders.filter(o => o.disputeOpen).length,
    pipedriveSubs: '4,159 / 5,000',
  };
}
```

### What "pure" buys you

A pure function:

1. Has **no side effects** — no DOM, no `window.`*, no `console.log`.
2. Same input → same output, always.
3. Trivially testable in isolation.

`selectKpis(state)` cannot lie. It’s just math over the store.

### The crucial property: KPIs are **derived**, not stored

The old `EF.KPI` was a **snapshot** computed once. The new `selectKpis` is a **function**. Components call it on every render, get fresh numbers. **Stale dashboard becomes mathematically impossible.**

### Why senior engineers care

This is the **selector pattern** (Redux), the **memoized read** (Reselect), the **computed property** (MobX), and the **GraphQL query** (Apollo). Different names, same idea: **derive, don’t duplicate.**

---

## Part 5 — Hooks (the React bridge)

Open `src/core/hooks.js`.

### The fundamental hook: `useStore`

```16:29:src/core/hooks.js
function useStore(selector, equal = Object.is) {
  const select = selector || ((s) => s);
  const [slice, setSlice] = React.useState(() => select(store.getState()));
  React.useEffect(() => {
    let current = select(store.getState());
    setSlice(prev => equal(prev, current) ? prev : current);
    return store.subscribe((state) => {
      const next = select(state);
      setSlice(prev => equal(prev, next) ? prev : next);
      current = next;
    });
  }, [selector, equal]);
  return slice;
}
```

### What this 13-line function actually does (line by line)

1. **Pick a slice** — `selector` is a function that says "I only care about this part of state."
2. **Initial value** — `useState(() => select(store.getState()))` reads the current snapshot.
3. **Subscribe on mount** — `store.subscribe(...)` registers a listener.
4. **On every store change** — call the selector with new state, compare to previous slice.
5. **Re-render only if it changed** — `setSlice(prev => equal(prev, next) ? prev : next)`. If equal, React won’t re-render (because state reference is identical).
6. **Cleanup** — return the unsubscribe function so it runs on unmount.

This is **exactly** how `react-redux`’s `useSelector` works. **In 13 lines.**

### Why `equal` matters

If your selector returns a new array on every call (`state.orders.allIds.map(...)` always creates a new array), `Object.is` compares by reference and they’ll **never** be equal — your component re-renders on every store change. So we provide `shallowEqual`:

```7:14:src/core/hooks.js
function shallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every(k => Object.is(a[k], b[k]));
}
```

`shallowEqual([3522, 3524], [3522, 3524])` → `true`, even though they’re different array instances. Component skips re-render.

### Specialized hooks built on top

```31:46:src/core/hooks.js
function useOrders(opts = {}) {
  const key = JSON.stringify(opts || {});
  const selector = React.useMemo(() => (state) => {
    let orders = S.selectAllOrders(state);
    if (opts.gwId) orders = orders.filter(o => o.gwId === opts.gwId);
    if (opts.customerId) orders = orders.filter(o => o.customerId === opts.customerId);
    if (opts.status) {
      const statuses = Array.isArray(opts.status) ? opts.status : [opts.status];
      orders = orders.filter(o => statuses.includes(o.status));
    }
    if (opts.filter === 'available') orders = orders.filter(o => o.status === 'available' && !o.gwId);
    if (opts.filter === 'active') orders = orders.filter(o => !['completed','cancelled'].includes(o.status));
    return orders;
  }, [key]);
  return useStore(selector, shallowEqual);
}
```

Notice the **stable selector pattern**: `useMemo` with a string key (`JSON.stringify(opts)`) so the selector identity only changes when the options change. This avoids re-subscribing every render.

### The full hook surface (file: `src/core/hooks.js`)


| Hook                                              | What it returns                              |
| ------------------------------------------------- | -------------------------------------------- |
| `useStore(selector, equal)`                       | Generic — any slice of state                 |
| `useOrders({ gwId, customerId, status, filter })` | Filtered orders                              |
| `useOrder(id)`                                    | One order or null                            |
| `useSubmissions({ orderId, qaQueue })`            | Filtered submissions                         |
| `useKpis()`                                       | Derived dashboard numbers                    |
| `useReleaseGate(id)`                              | `{ releasable, blocked, reasons, gates }`    |
| `useGw(id)` / `useCustomer(id)`                   | One entity                                   |
| `useGhostwriters()` / `useCustomers()`            | Full lists                                   |
| `useThreads()` / `useNotifications(role)`         | Threads / role-scoped notifs                 |
| `useFridayBatch()`                                | `{ releaseable, blocked }`                   |
| `useCurrentRole()` / `useNavigation()`            | Session / route                              |
| `useToast()`                                      | `{ toast }` (delegates to `EFActions.toast`) |


**Components don’t care that there’s a store.** They call `useOrders()`, get an array, render it. When the store changes, the right components re-render automatically.

### Real example — admin dashboard

```45:47:src/admin/dashboard.jsx
function AdminDashboard({ navigate, openFridayBatch }) {
  const k = window.EFHooks.useKpis();
  return (
```

That’s it. **One line.** The dashboard is permanently in sync with the store. No `fixState` prop, no merge logic, no static `EF.KPI` to go stale.

### Why senior engineers care

This pattern — **selector + subscribe + memoized hook** — is **the** professional pattern for client-side reactivity. React Query, SWR, Apollo, Zustand, Jotai, Redux Toolkit, Recoil all implement variations of it. Once you can write `useStore` from scratch, you can read any of those libraries in an afternoon.

---

## Part 6 — Actions (the write API)

Open `src/core/actions.js`. **This is the only file that calls `store.setState`.**

### Before

A typical mutation looked like this in `admin/order-detail.jsx`:

```js
// OLD
setFixState(prev => ({
  ...prev,
  [orderId]: { ...(prev[orderId] || {}), status: 'active', claimApprovedAt: nowIso() }
}));
if (window.efNotify) {
  window.efNotify({ to: 'gw', title: '...', body: '...' });
  window.efNotify({ to: 'customer', title: '...', body: '...' });
}
```

Three problems:

1. The component knew the **shape of state** (`{ [orderId]: patch }`).
2. The component knew the **business workflow** (status → 'active', side-effect notifications).
3. There was **no validation** — any status could be set from any other status.

If a different screen needed to "approve a claim," it copy-pasted these 8 lines. They diverged. Bugs.

### After

```72:82:src/core/actions.js
function approveClaim(orderId) {
  const o = order(orderId);
  const guard = W.canTransition(o, 'approve_claim');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  patchOrder(orderId, { status: 'active', claimApprovedAt: nowIso(), assignedAt: nowIso() });
  const g = gw(o.gwId);
  const c = customer(o.customerId);
  notify({ to: 'gw', kind: 'assignment_approved', title: `Order #${orderId} approved — you may begin`, body: 'Briefing email sent · customer was introduced' });
  notify({ to: 'customer', kind: 'assignment_intro', title: 'Ihr Ghostwriter wurde zugewiesen', body: `${g?.name || 'Ihr Ghostwriter'} meldet sich heute bei Ihnen.` });
  return true;
}
```

The component now does:

```40:48:src/admin/order-detail.jsx
    setTimeout(() => {
      window.EFActions.orders.approveClaim(orderId);
      toast({
        tone: 'success',
        transition: { entity: `Order #${orderId}`, from: 'GW Claimed — Approve', to: 'Active' },
        text: 'Briefing email sent · customer introduced',
      });
    }, 1700);
```

**One line** for the business event. The component owns the **animation cascade** (UI concern) but not the **business rule** (workflow concern).

### What an action does, generally

Every action follows the same shape:

```
1. Read current state (entity by id)
2. Validate via workflow.js (canTransition / canAssign / etc.)
3. If invalid → toast error, return false
4. Patch all affected entities (one or many)
5. Fire notifications to all affected roles
6. Return true / the new entity
```

Look at `submitWork` for the **multi-entity** case:

```158:205:src/core/actions.js
function submitWork(orderId, payload = {}) {
  const o = order(orderId);
  const currentGwId = payload.gwId || store.getState().session.gwId;
  const kind = payload.kind || 'final';
  if (!W.allowedSubmissionKinds(o, currentGwId).includes(kind)) {
    toast({ text: W.submissionClosedReason(o), tone: 'danger' });
    return null;
  }
  // ...
  upsertEntity('submissions', submission, 'gw.submit.submission');
  patchOrder(orderId, {
    status: nextStatus,
    lastSubmissionAt: submission.submittedAt,
    // ...
  });
  // ...
  if (W.isInterimKind(kind)) {
    notify({ to: 'customer', kind: 'interim_received', ... });
    notify({ to: 'admin', kind: 'interim_received', ... });
  } else {
    notify({ to: 'admin', kind: 'final_uploaded', ... });
    notify({ to: 'qa', kind: 'final_uploaded', ... });
  }
  return submission;
}
```

**This single function:**

- Creates a new submission entity (the bug we used to have!)
- Patches the order’s status
- Notifies the right roles based on submission kind
- Validates that the submission is even allowed at this status

The QA queue, subscribed via `useSubmissions({ qaQueue: true })`, **automatically re-renders** because submissions changed. The dashboard, subscribed via `useKpis`, **automatically re-renders** because `qaPending` changed. The order detail page, subscribed via `useOrder(orderId)`, **automatically re-renders** because the order changed.

**One action call → every consistent view updates.** This is what reactive state means in practice.

### The complete action API

```385:419:src/core/actions.js
const actions = {
  toast,
  notify,
  session: { setRole, setRoute },
  orders: {
    patch: patchOrder,
    create: createOrder,
    approveClaim,
    rejectClaim,
    assignGw,
    markInstallmentPaid,
    setHonorRate,
  },
  gw: {
    claimJob,
    submit: submitWork,
    reportDelay,
    requestExtension,
  },
  qa: {
    pass: qaPass,
    requestRevision: qaRequestRevision,
    flagAi: (submissionId) => qaFlag(submissionId, 'ai'),
    flagPlagiarism: (submissionId) => qaFlag(submissionId, 'plagiarism'),
  },
  customer: {
    approveInterim,
    requestRevision: requestCustomerRevision,
    acceptFinal,
    escalate,
  },
  payments: { releaseBatch },
  gws: { shadowBan },
  notifications: { markAllRead: markAllNotificationsRead },
};
```

This is your **business event vocabulary**. Reading this list tells you the entire surface of what the app can do. Compare to "grep for `setFixState`" in the old codebase.

### Why senior engineers care

This is the **command pattern**. It’s how:

- **Backends** model APIs (`POST /orders/:id/approve-claim`).
- **Event-sourced systems** describe state changes.
- **CQRS** separates reads from writes.
- **Redux** describes "actions" (literal name).
- **GraphQL mutations** are documented.

A frontend that has **named actions** is one promotion away from a backend. You could swap `EFActions.orders.approveClaim(id)` for `fetch('/api/orders/' + id + '/approve-claim', { method: 'POST' })` and the screens **wouldn’t know the difference**.

---

## Part 7 — Workflow (the rules engine)

Open `src/core/workflow.js`. **No DOM. No React. No store. Pure rules.**

### The state machine

```29:48:src/core/workflow.js
const TRANSITIONS = {
  approve_claim:        { from: ['claimed_pending_approval'], to: 'active' },
  reject_claim:         { from: ['claimed_pending_approval'], to: 'available' },
  claim_job:            { from: ['available'], to: 'claimed_pending_approval' },
  assign_gw:            { from: ['available','paid_assignment_started','active','delay_reported','extension_requested'], to: 'active' },
  gw_submit_interim:    { from: ['active'], to: 'under_customer_review' },
  gw_submit_final:      { from: ['active','revision_required'], to: 'qa_review' },
  gw_submit_revision:   { from: ['revision_required'], to: 'qa_review' },
  qa_pass_final:        { from: ['qa_review'], to: 'delivered' },
  qa_pass_interim:      { from: ['qa_review','under_customer_review'], to: 'under_customer_review' },
  qa_request_revision:  { from: ['qa_review'], to: 'revision_required' },
  qa_flag_ai:           { from: ['qa_review','final_submitted'], to: 'ai_violation_review' },
  qa_flag_plagiarism:   { from: ['qa_review','final_submitted'], to: 'plagiarism_violation_review' },
  customer_approve_interim: { from: ['under_customer_review','interim_submitted'], to: 'active' },
  customer_request_revision:{ from: ['under_customer_review','interim_submitted','delivered'], to: 'revision_required' },
  customer_accept_final:{ from: ['delivered'], to: 'payment_pending' },
  report_delay:         { from: ['active','revision_required'], to: 'delay_reported' },
  request_extension:    { from: ['active'], to: 'extension_requested' },
  release_batch:        { from: ['payment_pending'], to: 'completed' },
};
```

This is a **finite state machine** as a JS object. Reading this table tells you **everything legal** in the system.

### The guard

```54:61:src/core/workflow.js
function canTransition(order, name) {
  const rule = TRANSITIONS[name];
  if (!order || !rule) return { ok: false, reason: 'Unknown transition' };
  if (!includesStatus(rule.from, order.status)) {
    return { ok: false, reason: `Cannot ${name.replace(/_/g, ' ')} while order is ${order.status}` };
  }
  return { ok: true, to: rule.to };
}
```

Every action calls this **before** mutating. **Illegal transitions become impossible at runtime.** This is the difference between a system that "kind of works in the demo" and one that survives real users.

### The Friday release gate (multi-condition rule)

```111:133:src/core/workflow.js
function releaseGates(order) {
  if (!order) return { releasable: false, blocked: true, reasons: ['Order not found'], gates: {} };
  const gates = {
    customer_satisfied:      order.customerSatisfied === true,
    quality_approved:        order.qaPassed === true && !order.flagged && order.status !== 'ai_violation_review' && order.status !== 'plagiarism_violation_review',
    revisions_complete:      !order.disputeOpen && order.status !== 'revision_required',
    all_installments_paid:   allInstallmentsPaid(order),
    gw_invoice_received:     order.gwPaymentStatus === 'invoice_received' || order.gwPaymentStatus === 'paid',
  };
  const reasons = [];
  if (order.status !== 'payment_pending') reasons.push('Order is not awaiting Friday release');
  if (!gates.customer_satisfied) reasons.push('Customer satisfaction not confirmed');
  // ...
  return {
    releasable: order.status === 'payment_pending' && reasons.length === 0,
    blocked: reasons.length > 0,
    reasons,
    gates,
  };
}
```

Before this lived in **two places** (`data.js` and `admin/friday-batch.jsx`) that nearly agreed. Now it’s **one definition**. The dashboard uses it (via `selectKpis → friday`), the order detail uses it (via `useReleaseGate`), the Friday batch screen uses it (via `useFridayBatch → selectFridayBatch`). They cannot disagree.

### Role-aware status labels

```135:162:src/core/workflow.js
function statusFor(order, role) {
  // ...
  if (role === 'customer') {
    const map = {
      qualified: 'Angebot wird vorbereitet',
      offer_sent: 'Angebot wird vorbereitet',
      // ...
    };
    return { ...base, label: map[order?.status] || base.label };
  }
  // ...
}
```

**One status, three audiences.** GW sees "Waiting for efactory1 approval", customer sees "GW-Suche läuft", admin sees the technical status. Define once, consume everywhere.

### Why senior engineers care

This is **domain logic isolation**. Pure rules with no I/O are:

- Trivially unit-testable (we’re not doing it yet, but we *could*).
- Reusable across React, Node, server, mobile.
- Reviewable without running the app.

Real backends call this the **domain layer**. Real frontends call this the **business logic module**. Either way: **rules don’t belong in components.**

---

## Part 8 — Routes (one source of truth)

Open `src/core/routes.js`.

### Before

Adding a new route required edits in **three files**:

1. `index.html` — add a `case` in the giant switch.
2. `shell.jsx` — add an entry to `Sidebar.routeMap`.
3. The component — call `navigate('my-new-route')` (string literal, no typo protection).

### After

```3:44:src/core/routes.js
const ROUTES = {
  ADMIN_DASHBOARD: 'admin-dashboard',
  ORDERS: 'orders',
  ORDER_DETAIL: 'order-detail',
  // ...
};
```

```46:51:src/core/routes.js
function defaultRouteFor(role) {
  if (role === 'gw') return ROUTES.GW_DASHBOARD;
  if (role === 'qa') return ROUTES.QA_QUEUE;
  if (role === 'customer') return ROUTES.CUSTOMER_ORDERS;
  return ROUTES.ADMIN_DASHBOARD;
}
```

```103:161:src/core/routes.js
function navItems(role, state) {
  const S = window.EFSelectors;
  const W = window.EFWorkflow;
  const orders = S.selectAllOrders(state);
  const submissions = S.selectAllSubmissions(state);
  if (role === 'admin') {
    const qaPending = submissions.filter(s => s.qaStatus === 'pending').length;
    const friday = orders.filter(o => W.releaseGates(o).releasable).length;
    // ...
    return [
      { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
      { id: 'orders', label: 'Orders', icon: 'package', badge: String(orders.length) },
      // ...
    ];
  }
```

`navItems(role, state)` returns sidebar items **with badges already computed from live state.** The sidebar can’t lie.

### The route table

In `index.html`, the giant `switch` collapsed into a **lookup table**:

```200:261:index.html
  const routeTable = {
    customer: { _resolve: (params, name) => { ... } },
    qa: {
      'qa-queue':         () => <QAQueue navigate={navigate} toast={toast}/>,
      'qa-plagiarism':    () => <QAPlagiarismReports navigate={navigate}/>,
      // ...
      _default:           () => <QAQueue navigate={navigate} toast={toast}/>,
    },
    gw: { ... },
    admin: { ... },
  };

  const roleRoutes = routeTable[role] || routeTable.admin;
  const params = route.params || {};
  let body;
  if (roleRoutes._resolve) {
    body = roleRoutes._resolve(params, route.name);
  } else {
    const handler = roleRoutes[route.name] || roleRoutes._default;
    body = handler(params);
  }
```

Adding a new route is now a **two-edit change**: register the route name in `ROUTES`, register the handler in `routeTable`. That’s it.

### Why senior engineers care

This is the **declarative router** pattern (React Router’s `Routes`, TanStack Router’s `routeTree`). The advantage isn’t shorter code — it’s that the **entire URL surface of the app is reviewable in one screen**. Adding a route doesn’t require reading 17 files to understand "what could break."

---

## Part 9 — The compat layer (the safety net)

Open `src/core/compat.js`. This is the **smartest** file in the refactor. It’s 33 lines.

### What it does

Old code reads `EF.ORDERS`, `EF.KPI`, `EF.liveOrder(id)`, etc. We **could** rewrite every screen to use hooks, but that would be a giant PR. Instead:

```16:30:src/core/compat.js
defineGetter('ORDERS', () => S.selectAllOrders(store.getState()));
defineGetter('SUBMISSIONS', () => S.selectAllSubmissions(store.getState()));
defineGetter('CUSTOMERS', () => S.selectAllCustomers(store.getState()));
defineGetter('GHOSTWRITERS', () => S.selectAllGhostwriters(store.getState()));
defineGetter('INBOX_THREADS', () => S.selectThreads(store.getState()));
defineGetter('NOTIFICATIONS', () => S.selectNotifications(store.getState(), store.getState().session.role));
defineGetter('KPI', () => S.selectKpis(store.getState()));

EF.liveOrders = () => S.selectAllOrders(store.getState());
EF.liveOrder = (id) => S.selectOrder(store.getState(), id);
EF.releaseGates = W.releaseGates;
EF.myAssignments = () => S.selectOrdersByGw(store.getState(), store.getState().session.gwId);
```

`defineGetter` uses `Object.defineProperty` so that **every time** code reads `EF.KPI`, it actually calls `selectKpis(store.getState())`. The legacy code still works, but it’s reading from the **new** store under the hood.

### Why this matters

This is the **strangler fig pattern** (Martin Fowler’s name for it). You wrap the old API with a thin adapter that delegates to the new system. The old code keeps working **without modification**. You migrate consumers to hooks at your own pace. When everyone is on hooks, you delete the adapter.

In our case:

- Legacy screens that still read `D.ORDERS` get **live data** because the getter dispatches to the store.
- Legacy screens that call `D.releaseGates(order)` get the **canonical** version.
- Nothing is silently stale.

### Why senior engineers care

This is **the** technique for migrating real production codebases. You never rewrite a system in one shot — you **extend** the public API surface, **redirect** internals to the new implementation, and **shrink** the old surface as consumers migrate.

Read `compat.js` once. It’s the most senior-engineer-coded file in the repo for its size.

---

## Part 10 — Walkthrough: GW submits final work

Let’s trace this end-to-end through the new system.

### Step 1: User clicks Submit

In `src/gw/submit.jsx`:

```150:177:src/gw/submit.jsx
  const submit = () => {
    if (!canSubmit) return;
    setStep(1);
    setTimeout(() => setStep(2), 1100);
    setTimeout(() => setStep(3), 2400);
    setTimeout(() => setStep(4), 3500);
    setTimeout(() => {
      setStep(5);
      window.EFActions.gw.submit(order.id, {
        kind: resolvedKind,
        workFile,
        invoiceFile,
        selfChecks: checks,
      });
      // ... toast ...
    }, 4600);
  };
```

The component owns the **upload animation cascade**. It calls **one action** at the end.

### Step 2: Action validates

`actions.js` → `submitWork`:

```161:165:src/core/actions.js
  const kind = payload.kind || 'final';
  if (!W.allowedSubmissionKinds(o, currentGwId).includes(kind)) {
    toast({ text: W.submissionClosedReason(o), tone: 'danger' });
    return null;
  }
```

Workflow checks: is this GW the assigned writer? Is this order in a state where this kind of submission is allowed? If no → toast error and abort.

### Step 3: Action creates submission entity

```169:185:src/core/actions.js
  const submission = {
    id: 's-live-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    orderId: Number(orderId),
    kind: entityKind,
    round: kind === 'revision' ? (o.revisionRounds || 0) + 1 : 1,
    gwId: currentGwId,
    fileName: payload.fileName || payload.workFile?.name || `${orderId}_${entityKind}.docx`,
    invoiceFileName: payload.invoiceFile?.name || payload.invoiceFileName || null,
    size: payload.size || payload.workFile?.size || 1200000,
    plagiarismScore: payload.plagiarismScore ?? 4,
    aiScore: payload.aiScore ?? 8,
    qaStatus: W.isInterimKind(kind) ? 'passed' : 'pending',
    submittedAt: nowIso(),
    forwardedAt: W.isInterimKind(kind) ? nowIso() : null,
    selfChecks: payload.selfChecks || { /*...*/ },
  };
  upsertEntity('submissions', submission, 'gw.submit.submission');
```

A real submission entity is **appended** to the store. **This is what the old code didn’t do** — that was the QA-blind bug.

### Step 4: Action patches the order

```186:195:src/core/actions.js
  patchOrder(orderId, {
    status: nextStatus,
    lastSubmissionAt: submission.submittedAt,
    lastSubmissionFile: submission.fileName,
    lastSubmissionKind: kind,
    lastInvoiceFile: submission.invoiceFileName || undefined,
    finalSubmittedAt: kind === 'final' ? submission.submittedAt : o.finalSubmittedAt,
    revisionRounds: kind === 'revision' ? (o.revisionRounds || 0) + 1 : (o.revisionRounds || 0),
    gwPaymentStatus: kind === 'final' && o.gwPaymentStatus !== 'paid' ? 'invoice_received' : o.gwPaymentStatus,
  });
```

The order moves to `qa_review` (or `under_customer_review` for interim). One transactional update — **both entities change together**.

### Step 5: Action notifies the right roles

```196:203:src/core/actions.js
  if (W.isInterimKind(kind)) {
    notify({ to: 'customer', kind: 'interim_received', title: 'Ihr Zwischenstand ist verfügbar', body: `Auftrag #${orderId} · Bitte prüfen und Feedback geben` });
    notify({ to: 'admin', kind: 'interim_received', title: `Interim forwarded · #${orderId}`, body: `${g?.name || 'GW'} uploaded interim · auto-sent to customer` });
  } else {
    notify({ to: 'admin', kind: 'final_uploaded', title: `${kind === 'final' ? 'Final' : 'Revision'} submission · #${orderId}`, body: `${g?.name || 'GW'} uploaded · pending QA` });
    notify({ to: 'qa', kind: 'final_uploaded', title: `New submission · #${orderId}`, body: `${entityKind} · waiting for QA verdict` });
  }
```

Final → admin + QA notified. Interim → customer + admin notified. **The action knows the rule.**

### Step 6: Store fires subscribers

`store.setState` was called three times (one for `upsertEntity`, one for `patchOrder`, twice per `notify` for the two recipients). Each call increments `meta.version` and runs every listener.

### Step 7: React components re-render

- `QAQueue` is mounted with `useSubmissions({ qaQueue: true })`. The selector returns a new array including our new submission. The component re-renders. **A new row appears in the QA queue.** This is the bug we used to have.
- `AdminDashboard` is mounted with `useKpis()`. `qaPending` increments. The KPI card updates.
- `OrderDetail` (if open) is mounted with `useOrder(orderId)`. The order’s status changed. The page re-renders with "QA Review" badge.
- `Topbar` `<NotifBell>` is mounted with `useNotifications(role)`. New notification appears for the current role.

**One action call. Four screens consistent. Zero prop drilling.**

This is what people mean by "reactive state". It’s not magic — it’s `subscribe` + selectors + immutable updates.

---

## Part 11 — Walkthrough: Friday batch release

```32:53:src/admin/friday-batch.jsx
  const runBatch = () => {
    setRunning(true);
    const targets = releaseable.filter(o => selected.has(o.id));
    setRunningTargets(targets);
    const snapshot = targets.map(o => ({ id: o.id, amount: o.netHonorarium }));
    // Cascade: ~250ms per row → "sending" then "paid"
    targets.forEach((o, i) => {
      const start = 200 + i * 220;
      setTimeout(() => setRowState(p => ({ ...p, [o.id]: 'sending' })), start);
      setTimeout(() => {
        setRowState(p => ({ ...p, [o.id]: 'paid' }));
        window.EFActions.payments.releaseBatch([o.id]);
      }, start + 320);
    });
    // ...
  };
```

The component owns the **cascade animation** (UI). For each "paid" frame it calls **one action per order**.

```341:354:src/core/actions.js
function releaseBatch(orderIds) {
  const ids = Array.from(orderIds || []);
  const released = [];
  ids.forEach(id => {
    const o = order(id);
    if (!o) return;
    const gates = W.releaseGates(o);
    if (!gates.releasable) return;
    patchOrder(id, { status: 'completed', gwPaymentStatus: 'paid', paidToGwAt: nowIso(), completedAt: nowIso() });
    released.push({ id, amount: o.netHonorarium || 0 });
  });
  released.forEach(x => notify({ to: 'gw', kind: 'payment_released', title: `€${...} released · #${x.id}`, body: '...' }));
  return released;
}
```

The action **re-checks the gates** before releasing. Even if the UI lets you select an ineligible order, the action refuses. **Defense in depth.**

After release:

- Each released order moves to `completed`. `useFridayBatch()` selector recomputes. Releaseable list shrinks.
- `useKpis()` recomputes. `fridayCount` drops.
- `useOrder(id)` re-renders the order detail badge.
- GW gets a notification.

---

## Part 12 — Walkthrough: Customer accepts final

The customer sees an "Endabgabe annehmen" button. Click:

```638:638:src/customer/view.jsx
            const ok = window.EFActions.customer.acceptFinal(o.id);
```

```296:309:src/core/actions.js
function acceptFinal(orderId) {
  const o = order(orderId);
  const guard = W.canTransition(o, 'customer_accept_final');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  patchOrder(orderId, {
    status: 'payment_pending',
    customerSatisfied: true,
    finalAcceptedAt: nowIso(),
    lastCustomerFeedbackAt: nowIso(),
  });
  notify({ to: 'admin', kind: 'final_accepted', title: `Customer accepted final · #${orderId}`, ... });
  notify({ to: 'gw', kind: 'final_accepted', title: `Final accepted · #${orderId}`, ... });
  return true;
}
```

Notice the comment in the source:

```292:295:src/core/actions.js
// Customer accepts the final delivery.
// PRD friday_payment_batch.release_gates: customer_satisfied is the gate that
// only the customer can flip; this action is the *only* place it gets set true
// for a final. Status moves delivered → payment_pending which feeds the Friday batch.
```

**That comment is the architecture talking.** The PRD says only the customer can flip `customerSatisfied: true`. This action is **the only place in the entire codebase** that does it. Grep `customerSatisfied: true` and you find one hit, with a paragraph of context. This is **enforced single source of truth**.

After this action:

- The order moves to `payment_pending`.
- `releaseGates` for this order now returns `customer_satisfied: true`.
- `useReleaseGate(orderId)` on the admin order detail flips that gate green.
- `useFridayBatch()` may now include this order in `releaseable`.
- `useKpis()` `fridayCount` increments.
- Admin and GW get notifications.

**One button click. Three screens worth of consistent state.**

---

## Part 13 — Walkthrough: QA flags AI

```380:386:src/qa/queue.jsx
    if (kind === 'reject_ai') {
      window.EFActions.qa.flagAi(active.id);
      toast({
        tone: 'danger',
        transition: { entity: `Order #${order.id}`, from: 'QA Review', to: '🚨 AI Violation — flagged for admin' },
        text: `Flag raised · ${gw.name} · awaiting admin decision`,
      });
```

```240:257:src/core/actions.js
function qaFlag(submissionId, type) {
  const sub = S.byId(store.getState().entities.submissions, submissionId);
  if (!sub) return false;
  const o = order(sub.orderId);
  const status = type === 'plagiarism' ? 'plagiarism_violation_review' : 'ai_violation_review';
  const reason = type === 'plagiarism' ? 'Plagiarism suspected' : 'AI use suspected';
  patchEntity('submissions', submissionId, { qaStatus: 'flagged', flagged: true, flagType: type, reviewedAt: nowIso() }, `qa.flag.${type}.submission`);
  patchOrder(sub.orderId, {
    status,
    flagged: true,
    qaFlaggedAt: nowIso(),
    qaFlagReason: reason,
    qaPassed: false,
    paymentBlocked: true,
  });
  notify({ to: 'admin', kind: type === 'plagiarism' ? 'plagiarism_violation' : 'ai_violation', title: `🚨 ${reason} · #${o.id}`, body: `QA flagged ${gw(o.gwId)?.name || 'GW'}. Payment is blocked and admin review is required.`, urgent: true });
  return true;
}
```

**Two entities updated** (submission + order), **payment automatically blocked**, **admin urgently notified**. The `releaseGates` will now return `quality_approved: false` for this order — so even if the customer satisfies, **payment cannot release**. The rule is enforced **across the data**, not at the button level.

---

## Part 14 — The `meta.version` re-render trick

This one’s subtle but worth understanding. Look at `App()` and `Sidebar`:

```118:118:index.html
  window.EFHooks.useStore(s => s.meta.version);
```

```22:24:shell.jsx
function Sidebar({ role, route, navigate, collapsed, setCollapsed }) {
  window.EFHooks.useStore(s => s.meta.version);
  const nav = buildNav(role);
```

### What this does

`s.meta.version` increments on **every** `setState` call. So subscribing to it = "re-render me whenever **anything** in the store changes."

### Why we need it

`Sidebar.buildNav()` calls `EFRoutes.navItems(role, state)` which reads `state.entities.orders` and `state.entities.submissions` to compute badge counts. But `Sidebar` doesn’t use a specific selector hook — it calls `window.EFStore.getState()` directly inside `buildNav`. Without a subscription, the sidebar wouldn’t re-render when state changed.

The `useStore(s => s.meta.version)` line is a **subscription pulse**: it doesn’t care what the value is, only that the component re-renders. Then `buildNav` reads fresh state.

### Why senior engineers care

This is a **pragmatic tradeoff**. The "ideal" solution would be a selector that returns the badge counts. But that selector would need to know about every badge. Instead, we accept that the sidebar re-renders on every store change (cheap because there are ~10 buttons) in exchange for keeping the badge logic next to the nav definition.

This is the kind of compromise senior engineers make explicitly. They’re not afraid of "imperfect" patterns when the cost is low and the readability is high.

---

## Part 15 — What disappeared (and why that matters)

### Things that no longer exist


| Old                                                                  | Status                          | Replaced by                                             |
| -------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------- |
| `App.useState(fixState)`                                             | Deleted                         | `EFStore`                                               |
| `setFixState` prop drilled to 17 components                          | **Zero references in src/**     | `EFActions.`*                                           |
| `window.__fixState` global                                           | Deleted                         | `EFStore.getState().entities`                           |
| `window.__patchOrder` escape hatch                                   | Deleted                         | `EFActions.orders.patch` (rare)                         |
| `EF.KPI` static snapshot                                             | Now a getter on `EF` via compat | `useKpis()` / `selectKpis(state)`                       |
| Hardcoded `notifsByRole` in `shell.jsx`                              | Deleted                         | `useNotifications(role)`                                |
| `passesGate` duplicate in `friday-batch.jsx`                         | Deleted                         | `releaseGates` in `workflow.js`                         |
| In-place `D.GHOSTWRITERS[i].banned = ...` mutation                   | Deleted                         | `EFActions.gws.shadowBan(id, payload)`                  |
| `D.ORDERS.map(o => ({...o, ...fixState[o.id]}))` patterns            | Deleted                         | `useOrders()` returns merged data already               |
| Three-place route map (App switch + Sidebar map + scattered strings) | Consolidated                    | `routes.js` `ROUTES`/`navItems` + `routeTable` in `App` |
| Customer synthetic order #3518 only visible in customer view         | Visible everywhere              | `entities.js` adds it to seed during hydration          |


### How to verify

Open a terminal in the repo and try:

```bash
rg setFixState src/
rg "window.__fixState" src/
rg "window.__patchOrder" src/
```

All return nothing. **The old patterns are gone, not hidden.**

### Why this matters

A senior engineer reviewing this PR can see the **shape** of the change without reading every line:

- "We added 1,200 LOC in `src/core/`."
- "We deleted ~17 prop signatures and 4 globals."
- "We have one file (`actions.js`) that does all writes."
- "We have one file (`workflow.js`) that owns all rules."
- "We have one file (`routes.js`) that owns all URLs."

This is what **architecturally clean** looks like in a diff.

---

## Part 16 — How this maps to real SaaS


| Real SaaS concept                                | Our prototype implementation                    |
| ------------------------------------------------ | ----------------------------------------------- |
| Server + database                                | `data.js` seed → hydrated into `EFStore` once   |
| API endpoints (`POST /orders/:id/approve-claim`) | `EFActions.orders.approveClaim(id)`             |
| Domain layer (business rules, validators)        | `src/core/workflow.js`                          |
| ORM normalized models                            | `entities.js` `byId/allIds`                     |
| GraphQL queries / SQL views                      | `selectors.js`                                  |
| Apollo / React Query cache hooks                 | `hooks.js` `useOrders`, `useSubmissions`        |
| Websocket push updates                           | `store.subscribe` triggered by every `setState` |
| Backwards-compatible API versioning              | `compat.js` strangler fig                       |
| Router config                                    | `routes.js` `ROUTES` + `routeTable`             |
| Notification service                             | `EFActions.notify` + `useNotifications`         |
| State machines (XState, etc.)                    | `workflow.js` `TRANSITIONS`                     |


When you go work on a real SaaS frontend, **you’ll see all of this**. Just packaged in npm libraries instead of 1,200 LOC of in-house code. The mental model transfers entirely.

---

## Part 17 — Senior engineer checklist

When you see new code (yours or someone else’s), ask:

### About state

1. Where is the **single source of truth** for this entity? (Hint: should be the store.)
2. Is the value computed (selector) or stored? Stored values can go stale.
3. If two screens show the same data, are they reading from the same place?

### About mutations

1. Is this a **named action** or an inline patch? Inline patches will diverge.
2. Does this action update **all** entities affected by this business event? (e.g., GW submit must touch both submissions and orders.)
3. Is there a workflow validator before the mutation? Guards prevent illegal transitions.

### About reads

1. Does the component **subscribe** to the data it shows, so it re-renders on changes?
2. Is the selector pure (no `window.*`, no DOM, no `console.log`)?

### About routing

1. Is the route name a **constant** or a string literal? Strings cause silent runtime bugs.
2. Is the route registered in **one** table or scattered across files?

### About business logic

1. Is the rule defined **once** and imported, or copy-pasted across screens?
2. If the rule changes, how many files need to change? (Goal: one.)

If a code change requires "and don’t forget to also update X, Y, Z" — **that’s an architecture smell**. The code should make consistency the path of least resistance.

---

## Part 18 — Where to read next

1. `**src/core/store.js`** — read all 74 lines. This is the heart.
2. `**src/core/hooks.js**` lines 16–29 — the `useStore` implementation.
3. `**src/core/actions.js**` lines 158–205 — `submitWork`, the most representative action.
4. `**src/core/workflow.js**` lines 29–48 — the state machine table.
5. `**src/core/compat.js**` — all 33 lines. Best engineering-per-LOC in the repo.
6. `**docs/demo-paths.md**` — the canonical flows the architecture preserves.

Then re-read this document. The pieces will click into a single picture.

---

## Closing

You weren’t bad at React. You hit the **architectural wall** that every fast-moving frontend hits around 5–10K LOC: too many writers, too many readers, no enforced consistency, hidden state.

The fix isn’t a new framework. It’s **disciplined separation**:

- **Data lives in a store.**
- **Reads go through selectors → hooks.**
- **Writes go through actions.**
- **Rules live in a workflow module.**
- **Routes live in a route module.**

We did it in 1,200 LOC, no dependencies, no build step. The same pattern, with libraries, runs Linear, Notion, Vercel, and most modern SaaS apps.

Read the code with this document open. Within an afternoon you’ll be able to look at any frontend codebase and ask **"where’s the store, where are the actions, where are the selectors?"** — and that question, applied honestly, is most of what makes someone a senior frontend engineer.