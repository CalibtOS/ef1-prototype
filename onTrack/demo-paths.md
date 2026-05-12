# eFactory Frontend Demo Paths

Use these paths to verify that the prototype behaves like one connected SaaS system after frontend state changes.

> **Single-tab demo.** All four personas share one in-memory store. Switch personas via the role switcher in the same tab to see the consequences of any action. Multi-tab is intentionally not supported — open one tab, perform an action, switch persona, observe.

## Demo Spine — the canonical four-persona click-through

Order **#3518 · "Strategisches Controlling im Maschinenbau"** is wired so all four demo personas touch one lifecycle:

- Customer: **Antigona Berisha** (`c-ab`)
- Ghostwriter: **Isabel Walter** (`gw-iw`)
- QA Reviewer: **Lina Hoffmann**
- Admin: **Berat Özdemir**

Demo seed: order is in `under_customer_review`, Isabel has uploaded interim 1, Antigone has 1 unread message in chat and a `cn1` notification ("Zwischenstand verfügbar").

Suggested click-through:

1. Start as **Antigone** (Customer) → bell shows unread → open #3518 → review interim → click *Zwischenstand freigeben* (or *Überarbeitung anfordern*) → see toast + status pill change.
2. Switch to **Berat** (Admin) → notification bell shows the customer's interim approval → "Needs your decision" updates → activity-driven panels reflect the new state.
3. Switch to **Isabel** (GW) → her dashboard shows the order back in `active` (interim approved) or `revision_required` → her thread shows the customer's reply.
4. Have Isabel upload a final → switch to **Lina** (QA) → queue shows the new submission → pass it.
5. Back to Antigone → "Endabgabe annehmen" appears → accept → Friday batch becomes releasable for Berat.

## Core Operational Flows

| Flow | Expected synchronized result |
|---|---|
| GW claims a job | Order leaves job board, appears as pending approval for admin, admin notification is created. |
| Admin approves claim | Order becomes active, GW and customer notifications are created simultaneously, customer can see GW contact. |
| GW submits interim | Submission audit entry is recorded, order moves to customer review, customer and admin notifications appear. |
| Customer approves interim | Order returns to active work, GW/admin views update, interim satisfaction is tracked separately from final satisfaction. |
| Customer requests revision | Order moves to revision required, revision round increments, GW/admin queues update. |
| GW submits final | Submission is appended to QA queue, order moves to QA review, dashboard QA KPI updates. |
| QA passes final | Submission closes, order moves to delivered, customer receives quality-check-passed notification, customer order card now offers an "Endabgabe annehmen" CTA. |
| QA flags AI/plagiarism | Submission and order are flagged, payment gate blocks, admin receives urgent review notification. |
| Customer accepts final | Order moves to payment_pending with `customerSatisfied: true`, GW + admin notifications fire, the Friday-batch release gate flips green. |
| Admin marks installment paid | Customer balance, order release gate, Friday count, and financial dashboard recompute. |
| Friday batch release | Only fully gated orders release, orders move to completed, GW notifications are generated. |
| Admin shadow-bans GW | GW registry and all GW lookups update without mutating seed data. |
| GW reports delay | Order moves to delay reported, customer and admin are notified together. |
| GW requests extension | Order moves to extension requested and awaits admin/customer approval before extra work proceeds. |

## Business Rules To Preserve

- Interim work is auto-forwarded to the customer.
- Final work and revisions enter QA before customer delivery.
- GW payment is never released without all five gates: customer satisfied, quality approved, revisions complete, all customer installments paid, and GW invoice received.
- A customer interim approval is not final customer satisfaction for payment release.
- `customerSatisfied: true` is set only when the customer accepts the final delivery via the customer portal — never automatically.
- GWs never discuss payment with customers; financial questions route to `kundenservice@efactory1.de`.
- Assignment starts only after payment and admin approval, except admin self-assignment.
- Shadow-banned GWs lose notifications but can still exist in the registry.
