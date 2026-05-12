# Pub/Sub Deep Dive — How Admin Actions Reach the Ghostwriter

> Walk-through of the **exact** flow from "admin clicks Unpublish on a job" to "the same job vanishes from the GW's job board" — using **real code from this repo**.
>
> Read this with `src/core/store.js`, `src/core/hooks.js`, `src/core/actions.js`, and `src/gw/job-board.jsx` open.

---

## Part 0 — One sentence to remember

**Components don't talk to each other. They all talk to the store.**  
The store is the only thing that knows when data changes, and it broadcasts that change to every component that asked to listen.

That broadcast is the "pub/sub" pattern.

---

## Part 1 — What is publish/subscribe?

It's the **newspaper model**:

- **Publisher** = the newspaper office. They print one copy of today's news.
- **Subscribers** = readers. Each reader gave the newspaper their address.
- Every morning, the office sends the same paper to every subscriber's address.
- Readers don't talk to each other. They don't even know other subscribers exist. They only know the newspaper.

In our app:


| Newspaper analogy               | Our app                                 |
| ------------------------------- | --------------------------------------- |
| Newspaper office                | The **store** (`src/core/store.js`)     |
| "Today's news"                  | The current `state` object              |
| Subscriber giving an address    | A component calling `useStore(...)`     |
| Newspaper hitting your doorstep | React re-rendering your component       |
| Someone writing an article      | An action calling `store.setState(...)` |


Critical point: **the GW's job board does not subscribe to "the admin's actions."** It subscribes to **the store's state**. It doesn't care **who** changed the state — only that it changed.

---

## Part 2 — The "phone book" of subscribers

Open `src/core/store.js`. At the top, you'll see this:

```js
let state = initialState;
const listeners = new Set();
```

Two lines. `**listeners**` is the entire phone book.

It's a `Set` (a list with no duplicates) of **functions**. Each function in this set will be called every time state changes.

When a component subscribes, its callback gets added here. When the component unmounts, its callback gets removed. The store is just a manager of "who wants to be told."

### How something gets added to the phone book

```js
function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
```

Three lines. Translation:

- "Take this function `fn`, put it in my list."
- "Return a cancel function that removes it later."

The "cancel function" pattern is important — it's what React's `useEffect` cleanup uses to unsubscribe when a component unmounts.

---

## Part 3 — How a component subscribes (the real code)

Open `src/core/hooks.js`, lines 16–29. This is `**useStore**`, the heart of every hook in the app:

```js
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

Don't worry about every line yet. Just notice these three things:

### 1. `useState(() => select(store.getState()))`

When the component first mounts, this runs **once**: read the current state, run the selector, store the result as local React state.

### 2. `store.subscribe((state) => { ... })`

Inside `useEffect`, the component **registers a callback** with the store. That callback is now in the phone book.

The `useEffect` returns whatever `store.subscribe(...)` returned — which is the cancel function. So when the component unmounts, React automatically calls it and the callback gets removed from the phone book.

### 3. `setSlice(prev => equal(prev, next) ? prev : next)`

When the store calls our callback with new state:

- Run the selector → get a new slice.
- Compare it to the previous slice.
- If different → update local React state → React re-renders.
- If same → do nothing → no re-render (performance optimization).

**That's it.** That's the entire subscription mechanism.

---

## Part 4 — How a component publishes (the real code)

Open `src/core/store.js`, the `setState` function:

```js
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

The publish step is this loop:

```js
listeners.forEach(fn => {
  try { fn(state); } catch (e) { setTimeout(() => { throw e; }); }
});
```

**Translation:** "For every callback in the phone book, call it with the new state."

That's the broadcast. The store doesn't know **who** is listening or **why** — it just calls everyone.

---

## Part 5 — The Unpublish flow, step by step

Now let's trace your exact scenario. Imagine:

- **Tab 1** = Admin, viewing the Job Board.
- (Imagine same tab) → switch role to GW, also on Job Board.

In the same tab, both views read from the **same store**. So an admin action immediately reflects when you switch.

Here's what happens when admin clicks "Unpublish" on order `#3526`.

### Step 1 — User clicks the button

In `src/gw/job-board.jsx`, line 120:

```js
<button type="button" className="btn" onClick={() => onUnpublish(j.id)} title="Unpublish job">
  <Icon name="x" size={14}/> Unpublish
</button>
```

When admin clicks, React calls `onUnpublish(3526)`.

### Step 2 — The handler runs the action

```js
const onUnpublish = (id) => {
  window.EFActions.orders.patch(id, { status: 'on_hold', holdReason: 'Unpublished by admin' });
  toast && toast({
    tone: 'info',
    transition: { entity: `Order #${id}`, from: 'On Job Board', to: 'On Hold' },
    text: 'Removed by admin',
  });
};
```

Two things happen:

- `EFActions.orders.patch(...)` — the **important one**. This is the publisher.
- `toast(...)` — local UI feedback for the admin (just shows a toast on this screen).

### Step 3 — The action calls `store.setState`

`EFActions.orders.patch` is `patchOrder` in `src/core/actions.js`:

```js
function patchOrder(id, patch) {
  patchEntity('orders', id, prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }), 'orders.patch');
}
```

Which calls `patchEntity`:

```js
function patchEntity(kind, id, patch, label) {
  updateTable(kind, table => store.tablePatch(table, id, patch), label || `${kind}.patch`);
}
```

Which calls `updateTable`:

```js
function updateTable(kind, updater, label) {
  store.setState(prev => ({
    ...prev,
    entities: { ...prev.entities, [kind]: updater(prev.entities[kind]) },
  }), label);
}
```

Now we're inside `store.setState`. The new state is computed:

- `state.entities.orders.byId[3526]` now has `status: 'on_hold'` and `holdReason: 'Unpublished by admin'`.
- `state.meta.version` increments by 1 (e.g. 23 → 24).
- `state.meta.lastAction` becomes `'orders.patch'`.

### Step 4 — The store broadcasts

```js
listeners.forEach(fn => fn(state));
```

The store loops through every callback in the phone book and calls it with the new state.

### Step 5 — Subscribers wake up and check what changed

Right now, several `useStore` callbacks are in the phone book. Let's look at the relevant ones.

#### Subscriber A: The Job Board (`useOrders({ filter: 'available' })`)

This component is mounted (you're looking at it). It subscribed via `useStore` with this selector:

```js
function useOrders(opts = {}) {
  const key = JSON.stringify(opts || {});
  const selector = React.useMemo(() => (state) => {
    let orders = S.selectAllOrders(state);
    if (opts.filter === 'available') orders = orders.filter(o => o.status === 'available' && !o.gwId);
    return orders;
  }, [key]);
  return useStore(selector, shallowEqual);
}
```

When the broadcast hits, the callback runs:

1. **Run the selector against new state.**
  - `selectAllOrders(newState)` returns all orders.
  - Filter `o.status === 'available' && !o.gwId`.
  - Order `#3526` now has status `'on_hold'`, so it **fails the filter**.
  - The result: a new array **without** `#3526`.
2. **Compare to previous slice.**
  - Previous slice had `#3526` in it.
  - New slice does not.
  - `shallowEqual(prev, next)` → `false` (different array contents).
3. **Trigger re-render.**
  - `setSlice(next)` is called.
  - React re-renders `GWJobBoard` with the new array.
  - The card for `#3526` disappears from the screen.

#### Subscriber B: The Admin Dashboard's KPIs (if mounted)

Subscribed via `useKpis()` → which uses `selectKpis(state)`:

- `qaPending`, `fridayCount`, etc. recompute.
- For "Unpublish," none of these probably change much, so `shallowEqual` returns `true`.
- **No re-render**. (This is the optimization at work.)

#### Subscriber C: The Sidebar

Subscribed via `useStore(s => s.meta.version)` (the "pulse" trick):

- `meta.version` went from 23 → 24.
- Different value → re-render.
- Sidebar re-runs `buildNav(role)` → which counts `available` orders for the badge.
- Badge count drops by 1.

#### Other subscribers

Anything not interested (e.g. `OrderDetail` for a different order) runs its selector, gets the **same** slice as before, returns early. No re-render.

### Step 6 — The DOM updates

React diffs the virtual DOM:

- The card for `#3526` is gone.
- The badge count on the sidebar is one less.
- Everything else stays the same.

Browser repaints those parts. **Done.**

---

## Part 6 — Now you switch to GW role (same tab)

You're still in Tab 1. You click the role switcher and change to "Ghostwriter."

In `index.html`, `setRole` runs:

```js
const setRole = useCallback((nextRole) => {
  const nextName = window.EFRoutes.defaultRouteFor(nextRole);
  setRoleState(nextRole);
  setRoute({ name: nextName, params: {} });
  window.EFActions.session.setRole(nextRole);
  window.EFActions.session.setRoute({ name: nextName, params: {} });
  window.scrollTo(0, 0);
}, []);
```

`EFActions.session.setRole('gw')` calls `store.setState`:

```js
function setRole(role) {
  store.setState(prev => ({ ...prev, session: { ...prev.session, role } }), 'session.setRole');
}
```

Same broadcast happens. The route table picks `<GWJobBoard navigate={navigate} toast={toast} role="gw" />`.

`GWJobBoard` mounts, subscribes via `useOrders({ filter: 'available' })`, and **immediately reads the same store**. Order `#3526` is **already** in `on_hold` status. The selector skips it. **The GW never sees it.**

This is the key insight: the GW didn't need a "notification." The store already had the truth. The GW's view just **read** that truth on mount.

---

## Part 7 — What about a real-time GW in another tab?

This is where you got confused earlier. Let's clarify.

If you have **Tab 2** open as GW while admin unpublishes in **Tab 1**:

- Tab 1 has its **own** store. Order `#3526` is now `on_hold` in Tab 1's store.
- Tab 2 has its **own** store. Order `#3526` is **still** `available` in Tab 2's store.
- Tab 2's GW Job Board still shows the card.

There is **no automatic bridge between tabs**. Tab 2 won't see the change unless you reload it (which re-hydrates its store from `data.js`, but `data.js` was never updated either — so reload still shows old state).

For this prototype, that's intentional. **One tab = one universe.**

To make it work cross-tab, you'd need:

- A real backend + WebSockets/SSE pushing updates to every tab, **or**
- `BroadcastChannel` API to forward actions from Tab 1 to Tab 2's store.

Neither is wired up here.

---

## Part 8 — The mental model in one diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          ONE BROWSER TAB                             │
│                                                                      │
│  ┌─────────────── STORE (src/core/store.js) ────────────────────┐   │
│  │                                                               │   │
│  │   let state = { entities, session, ui, meta }                 │   │
│  │   const listeners = new Set()  ← phone book                   │   │
│  │                                                               │   │
│  │   subscribe(fn)   → listeners.add(fn), return () => delete    │   │
│  │   setState(...)   → state = new, listeners.forEach(fn(state)) │   │
│  │                                                               │   │
│  └──────────▲───────────────────────────────────┬────────────────┘   │
│             │                                   │                     │
│        SUBSCRIBE                            BROADCAST                 │
│             │                                   │                     │
│  ┌──────────┴──────────┐         ┌──────────────┴───────────┐        │
│  │                     │         │                          │        │
│  │  useStore(selector) │         │  Each fn(state) runs:    │        │
│  │  in EVERY component │         │  → selector(state)       │        │
│  │  that needs data    │         │  → compare to prev       │        │
│  │                     │         │  → if changed, re-render │        │
│  └──────────┬──────────┘         └──────────────────────────┘        │
│             │                                                         │
│             │   ◄──── publishes via ─────                            │
│             │                                                         │
│             ▼                                                         │
│  ┌──────────────────────┐    ┌────────────────────────────┐          │
│  │  EFActions.orders    │───►│  store.setState(updater,   │          │
│  │  .patch(id, patch)   │    │       'orders.patch')      │          │
│  └──────────────────────┘    └────────────────────────────┘          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Part 9 — Why this design is brilliant

### 1. Components are decoupled

The Admin Job Board has **no idea** the GW Job Board exists. They only know the store. You can delete one component and the other keeps working.

### 2. Adding a new view is free

Want a new "Unclaimed Jobs" widget on the customer dashboard? Just call `useOrders({ filter: 'available' })` in your new component. It subscribes automatically. When admin unpublishes, your widget updates without writing any wiring code.

### 3. Mutations are synchronous and predictable

When `setState` returns, **every subscriber has been notified**. No race conditions. No "did my update arrive?" guessing. If you call:

```js
EFActions.orders.patch(3526, { status: 'on_hold' });
console.log(window.EFStore.getState().entities.orders.byId[3526].status);
// → 'on_hold' (already updated, instantly)
```

It's already there. The store is in-memory; updates are atomic.

### 4. Performance is automatic

The `equal` check in `useStore` skips re-renders when a component's slice didn't change. You can have 50 components subscribed; an update only re-renders the 3 that actually care.

### 5. One write path

If you want to log every state change, add it inside `setState`. If you want to record actions for replay, just save the `(updater, label)` pairs. If you want time-travel debugging like Redux DevTools, snapshot `state` after each `setState`. All of this is possible because **every change goes through one function**.

---

## Part 10 — Common confusions, cleared up

### "Does the GW component poll the store?"

No. Polling = "ask every X milliseconds, did anything change?" That's wasteful.

The store **pushes** to subscribers. The component sleeps until the store wakes it up. This is event-driven, not polling.

### "Is there a WebSocket somewhere?"

No. Everything is in-memory inside one tab. The store is just a JavaScript object, and the broadcast is a `forEach` loop.

WebSockets would only be needed for **server → multiple clients** sync. Inside one tab, all components share one process and one memory.

### "How does React know to re-render?"

`setSlice(next)` is React's `useState` setter. When you call it with a different value than before, React schedules a re-render of that component. That's vanilla React behavior. Our store just **triggers** the setter.

### "What if two actions fire at the same time?"

JavaScript is single-threaded. Two `setState` calls can never run at literally the same time. They run sequentially. Each one notifies all subscribers before the next one starts.

### "What about when admin and GW are different users in production?"

In production, you'd have a backend. Admin's "unpublish" sends a `POST /orders/3526/unpublish` to the server. The server updates the database, then **pushes** to all connected clients via WebSocket. Each client receives the push, calls its own equivalent of `EFActions.orders.patch`, and the same in-tab broadcast happens.

The pattern doesn't change — it just gains one more layer (server → client push) at the top.

---

## Part 11 — Try it yourself in DevTools

Open the app, open DevTools console, then run:

```js
// 1. See current state
window.__store.getState().entities.orders.byId[3526]
// → { id: 3526, status: 'available', ... }

// 2. Subscribe a custom listener
const unsubscribe = window.__store.subscribe((state) => {
  console.log('Store changed!', state.meta.lastAction);
});

// 3. Trigger a change (any action)
window.EFActions.orders.patch(3526, { status: 'on_hold' });
// → Console logs: "Store changed! orders.patch"

// 4. See the new state
window.__store.getState().entities.orders.byId[3526]
// → { id: 3526, status: 'on_hold', holdReason: ..., ... }

// 5. Cancel your subscription
unsubscribe();
```

You just **manually** did what every component does automatically through hooks. The mechanism is identical.

---

## Part 12 — TL;DR

1. **The store is one JavaScript object** with three methods: `getState`, `setState`, `subscribe`.
2. **Components subscribe** by calling `useStore(selector)` (or any hook that wraps it). Their callback joins a list (`listeners`).
3. **Actions publish** by calling `store.setState(...)`. The store updates `state` and **calls every callback** in the list.
4. Each callback **runs its selector** against the new state, compares to the previous slice, and **re-renders** if different.
5. **The publisher and subscriber never know about each other.** They both only know the store.
6. In our app, "admin unpublishes job" = `EFActions.orders.patch(id, { status: 'on_hold' })`. This updates one entity, broadcasts to all subscribers, and the GW's `useOrders({ filter: 'available' })` selector naturally excludes the order. **The card disappears.**
7. **Cross-tab** doesn't work because each tab has its own store. That's a known limitation of this in-memory prototype.

---

## What to do next

1. Read `src/core/store.js` end-to-end. It's 74 lines. You now understand all of them.
2. Read `src/core/hooks.js` lines 16–29 (`useStore`). 13 lines that do all the React glue.
3. Open the app, follow the DevTools experiment in Part 11. Watch the broadcast happen live.
4. Read `frontend_architecture_learning.md` again with this in mind. Pub/sub is the missing piece that makes "reactive state" stop sounding magical and start sounding like obvious code.

