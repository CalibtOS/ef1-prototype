# eFactory Prototype — Implementation Tracker

Tracks the suggestions from the May 2026 prototype review. Status legend:

- `[x]` done & smoke-tested
- `[ ]` not started
- `[~]` in progress
- `[-]` deferred / out of scope

**Architecture note:** This prototype is single-tab, single in-memory store. "Real-time" here means *the next render reads fresh state* — i.e. when the demo user switches persona, the new view reflects all prior actions. Multi-tab sync is intentionally not implemented.

---

## Priority A — Critical for demo realism

### [x] A1. Make messaging real (admin ↔ GW ↔ customer ↔ system)
**Result:** Composer surfaces in admin inbox, GW messages, and customer chat all write to the same `state.entities.threads.byId[*].messages` array. Sending as Antigone makes the message appear in Isabel's `gw/messages.jsx` thread view AND fires a `notify({to:'gw'})` (verified end-to-end during smoke test).

**Tasks**
- [x] Extended the `threads` entity so each thread owns a `messages[]` array and per-role `unread` counters in `src/core/entities.js`.
- [x] Seeded the existing `INBOX_THREADS` with 4–6 messages each (8 threads total, including new `t8` for the demo spine).
- [x] Added `EFActions.threads.send({ orderId, role, body, attachments })` with financial-keyword detection, automatic system-message redirect, unread bumping, and cross-role notifications.
- [x] Added `EFActions.threads.markRead`, `threads.redirect`, `threads.flagFollowUp`, `threads.snooze` so admin actions stop being toast-only.
- [x] Wired `src/admin/inbox.jsx` to read `thread.messages` and call the new send/redirect/flag/snooze actions.
- [x] Wired `src/gw/messages.jsx` to read `thread.messages` (filtered by Isabel's `gwId`) and send via the action.
- [x] Wired `src/customer/view.jsx` `CustOrderChat` and `CustMessagesList` to the same store.
- [x] Replaced each component's hardcoded `transcript` / `baseConv` arrays.

### [x] A2. Customer notification bell + demo spine order
**Result:** Antigone now sees a working notification bell with three seeded notifications (interim, GW assigned, payment confirmed) and reacts live to any future `notify({to:'customer'})`. Order #3518 now has `gwId: 'gw-iw'` (Isabel) so the demo storyline traverses all four personas.

**Tasks**
- [x] Mounted `<NotifBell>` inside `CustHeader` (`src/customer/view.jsx`), wired to `useNotifications('customer')` + `markAllRead('customer')`.
- [x] Promoted `customerDemoOrder()` (#3518) to `gwId: 'gw-iw'`.
- [x] Added a third customer seed notification (`cn3`: assignment intro from Isabel) so the bell has unread on first load.
- [x] Updated `docs/demo-paths.md` with the canonical four-persona click-through.

### [x] A3. Make admin dashboard's "Needs your decision" + "Today's deadlines" reactive
**Result:** Both panels now derive entirely from the live store. After triggering `gw.requestExtension(3603, …)`, the "Needs your decision" panel showed a new "Extension requested · #3603" card on the next render. Cards rank by urgency (violations → claims → extensions/delays → disputes → blocked release → flagged threads).

**Tasks**
- [x] Replaced hardcoded `Needs your decision` cards with derived rows from `useOrders()` + `useSubmissions()` + `useThreads()`.
- [x] Replaced hardcoded `Today's deadlines` with derived rows from active orders' `interimDeadline`, `interim2Deadline`, `finalDeadline` within a -1d/+5d window.
- [x] Empty state for "0 actions — all clear".
- [x] Sorted by urgency.

### [-] A4. Wire activity feed to real events
Deferred per scope decision: the demo user is also the actor, so a live feed adds little for single-tab playthrough. Synthetic stream still rolls in the background.

### [x] A5. Admin response UI for extension / delay / dispute
**Result:** Each panel renders inline on `admin/order-detail.jsx` when the order is in the matching state. Approve/Reject/Counter/Close flows all call store actions and notify customer + GW.

**Tasks**
- [x] Added `EFActions.orders.approveExtension`, `rejectExtension` (notify GW + customer; mutate scope/deadline/fee).
- [x] Added `EFActions.orders.acceptDelay`, `proposeNewDelay`.
- [x] Added `EFActions.orders.closeDispute(orderId, resolution)`.
- [x] Inline panels in `src/admin/order-detail.jsx`: `ExtensionResolutionPanel`, `DelayResolutionPanel`, `DisputeResolutionPanel`. Each surfaces request details + Approve/Reject/Resolve buttons + override-deadline / counter-deadline inputs / resolution textarea.
- [x] Notifies customer + GW on resolution.

### [x] A6. Admin resolution UI for AI / plagiarism violations
**Result:** Visiting #3517 (the seeded AI violation) now shows a `ViolationResolutionPanel` with the submission's actual scores, the GW's lifetime/rating/banned state, and three actions: confirm (shadow-ban + return order to job board), clear (false positive), open audit thread.

**Tasks**
- [x] Added `EFActions.orders.confirmViolation` (shadow-bans GW, returns order to `available`, lifts payment block, notifies customer about reassignment).
- [x] Added `EFActions.orders.clearViolation` (clears flag/paymentBlocked, restores `delivered` or `qa_review`, notifies GW + customer).
- [x] `ViolationResolutionPanel` shows submission scores + GW priors. Replaces the previous static red banner.
- [x] Surfaces in A3's "Needs your decision" feed (urgency 1).

---

## Priority B — Important sync & UX

- [ ] B1. Order-level activity timeline (`entities.events`, populated by every action; renders in order-detail Audit tab).
- [ ] B2. GW dashboard "Inbox" widget (awaiting feedback / revision inbound / unread customer messages).
- [ ] B3. Banned-GW UX (banner + disabled claim + notification gate).
- [ ] B4. Customer satisfaction rating on `acceptFinal` (1–5★ feeds GW.rating).
- [ ] B5. Real GW workload heatmap derived from assignments + deadlines.
- [ ] B6. Sync side-effects on inbox redirect/flag/snooze (no more toast-only). **Partially done in A1** — redirect/flag/snooze now mutate state; remaining: customer-facing toast feedback + thread.snooze respected by inbox filtering.
- [ ] B7. First-contact wizard creates a real opening message in the thread + sets `firstContactDone`.
- [ ] B8. Pipedrive/Sevdesk/Stripe "Sync now" creates a real notification + activity entry.

---

## Priority C — Polish

- [ ] C1. Typing-indicator / read-receipts on threads.
- [ ] C2. Parametrize Live Activity flavor templates with real entity names from state.
- [ ] C3. Customer profile notification preferences actually filter `useNotifications`.
- [ ] C4. Thread search across role inboxes.
- [ ] C5. Order status pill next to threads in inbox.
- [ ] C6. "Last seen" timestamps on persona avatars.
- [ ] C7. Cross-role action toast / sound when viewer is not the source.
- [ ] C8. Audit export ("Export this order's activity as CSV").
- [ ] C9. Empty-state copy consistency pass.
- [ ] C10. Dark-mode pass on customer portal.

---

## Smoke-test log (2026-05-10)

End-to-end verification done in a real browser via the dev server:

1. **Admin dashboard renders** — KPIs, "Needs your decision" pulled live (Maja's claim #3526, Isabel's claim #3601, AI violation #3517, two open disputes, plus extension after we triggered it). "Today's deadlines" derived (#3604 today 18:00, #3508 D-2, #3530 final, #3532, #3518 demo spine, #3603).
2. **Admin inbox** — full thread list with last-message previews from real `messages[]`. Active thread renders the entire conversation (4 messages on t1). Voice thread (t6) preserved with metadata-only handling. AI assist suggestions still work.
3. **Customer view** — Antigone sees `NotifBell` with red dot. Dropdown lists 3 real notifications (interim, GW intro, payment). Order #3518 card shows GW = "Isabel Walter" (demo spine link confirmed).
4. **Cross-role messaging** — Sent `threads.send({orderId:3518, role:'customer', body:'TEST: …Kapitel 4 weitermachen.'})` as Antigone. Switched persona to Isabel → her **GW Messages** tab shows the new message at the bottom of the t8 thread, with a "Neue Nachricht · #3518" entry in her notification feed.
5. **A5 panel** — Triggered `gw.requestExtension(3603, …)`. Admin dashboard "Needs your decision" gained an "Extension requested · #3603" card. Order detail #3603 shows the `ExtensionResolutionPanel` with justification, +6 pages, +€280, override-deadline input, Approve/Reject buttons. Same page also renders `DisputeResolutionPanel` because the seed has `disputeOpen: true`.
6. **A6 panel** — Order detail #3517 shows `ViolationResolutionPanel` with submission file/scores (87% AI, 12% plag), Anna König's stats including "already shadow-banned", and the three verdict buttons.

One issue caught and fixed during smoke test: `ChatMessage` crashes when `attachments` prop is `null` (its default `= []` only kicks in for `undefined`). Fixed by omitting the field entirely when no attachments exist (in both the seed hydrator and the live `sendMessage` action).

---

## Notes

- Architecture is single-tab — `localStorage` mirroring intentionally not added so reload = clean demo reset.
- Every `EFActions.*` write must continue to stamp `meta.lastAction` so observers stay reactive.
- Workflow rules in `src/core/workflow.js` are the source of truth — new actions go through `canTransition` where possible.
