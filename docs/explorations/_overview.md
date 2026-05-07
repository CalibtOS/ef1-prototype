# Explorations Overview
> This folder is the Requirements Engineering thinking space.
> Nothing here is a confirmed decision unless graduated to [`decisions_log.md`](../decisions_log.md).
> Last updated: May 2, 2026

---

## What "Exploration" Means Here

An exploration is:
- A problem space we know we need to solve
- With one or more candidate approaches documented
- With trade-offs and open questions captured
- That has NOT been decided yet

When an exploration is decided, the confirmed approach moves to `decisions_log.md` and `business_rules.md`. The exploration file is then archived or reduced to a pointer.

---

## Active Exploration Areas

### 1. Communication System (3 Layers)

The communication system is split into three architectural layers — see [`communications/_overview.md`](communications/_overview.md) for the full layered model.

**Confirmed principle (Ferhat, Apr 29):** All customer↔GW communication passes through the platform. Neither party gets the other's direct contact.

#### Layer 1 — Proxy Mechanics

| Channel | File | Options | Status |
|---------|------|---------|--------|
| Email proxy | [`communications/email.md`](communications/email.md) | 3 options | ✅ Provider confirmed: Cloudflare + Workers (D-15) |
| WhatsApp proxy | [`communications/whatsapp.md`](communications/whatsapp.md) | 4 options | Exploring — groups leading, virtual numbers researched, direct-DM as fallback |
| Voice / IVR | [`communications/voice.md`](communications/voice.md) | 4 providers · 2 bridge modes · 3 auth methods | Exploring — Yasser researching providers |

#### Layer 2 — Unified Chat Presentation

| File | Status |
|------|--------|
| [`communications/unified_chat.md`](communications/unified_chat.md) | **Pattern confirmed** (Kleinanzeigen-style) — implementation specifics open |

#### Layer 3 — AI Layer

| File | Status |
|------|--------|
| [`communications/ai_layer.md`](communications/ai_layer.md) | Exploring — 6 features cataloged; v1 scope to be confirmed by Berat |

**Common goals across all layers:**
- Privacy: neither party sees the other's real contact
- Visibility: every message/call accessible to Berat in admin view
- Moderation: content can be intercepted, held, or blocked
- Evidence: full trail for dispute resolution
- **Single source of truth:** all comms surface in the unified chat regardless of medium

**Related decisions log entries:** E-01 through E-05 + E-07, E-08 → [`decisions_log.md`](../decisions_log.md)

---

### 2. Employee (Service Worker) Access Control

**Context:** Berat can outsource tasks to co-workers. These workers need a restricted platform role.

**File:** [`employee_access.md`](employee_access.md)

**Status:** Framework direction established (Ferhat, Apr 29) — exact permission rules and moderation thresholds undefined. Berat input required before this can be specified further.

**Related decisions log entry:** E-06 → [`decisions_log.md`](../decisions_log.md)

---

### 3. Internationalization & Localization

**File:** [`internationalization.md`](internationalization.md)

**Status:** **Confirmed direction (Ferhat, Apr 29)** — i18n is a first-class concern from day 1. App built English-first with localization files. Multi-currency, multi-country variants on the table. Architecture choice (single deployment vs multi-tenant vs UI variants) depends on Berat's market list.

**Related decisions log entry:** E-09 → [`decisions_log.md`](../decisions_log.md)

---

### 5. AI-Powered BI Dashboard

**Context:** Ferhat described this as a core platform direction (May 2, 2026). Berat should be able to query his own business data through natural language prompts — the system auto-generates SQL and a UI view for the result. Custom master prompt context makes outputs domain-accurate, unlike generic AI tools.

**File:** [`ai_bi_dashboard.md`](ai_bi_dashboard.md)

**Status:** High-confidence direction — not yet formally decided. Implementation options (pre-built UI components vs LLM-generated HTML vs template matching), LLM provider, and v1 vs later-phase scope are all open.

**Related decisions log entry:** E-11 → [`decisions_log.md`](../decisions_log.md)

---

### 4. Payment Methods (Beyond Confirmed Stripe + Bank Transfer)

**File:** [`payment_methods.md`](payment_methods.md)

**Status:** Exploring — cash support raised by Ferhat (avoid shadow IT), multi-currency tied to internationalization decisions.

**Related decisions log entry:** E-10 → [`decisions_log.md`](../decisions_log.md)

---

## How Explorations Graduate to Decisions

```
Exploration file: options documented, trade-offs clear, open questions identified
        ↓
Open questions answered (Berat / team research)
        ↓
Team or Ferhat explicitly picks one option
        ↓
New entry added to decisions_log.md (D-xx)
Confirmed facts added to business_rules.md
Exploration file reduced to a pointer or archived
```

---

## Folder Structure

```
explorations/
├── _overview.md                  ← you are here
├── communications/
│   ├── _overview.md              ← 3-layer architecture (proxy / chat / AI)
│   ├── email.md                  ← Layer 1: email proxy options
│   ├── whatsapp.md               ← Layer 1: WhatsApp proxy options
│   ├── voice.md                  ← Layer 1: voice/IVR options
│   ├── unified_chat.md           ← Layer 2: Kleinanzeigen-style chat presentation
│   └── ai_layer.md               ← Layer 3: sentiment, miscommunication, HIL
├── ai_bi_dashboard.md            ← AI-powered BI dashboard (prompt → SQL → UI)
├── employee_access.md            ← service worker role hypotheses
├── internationalization.md       ← i18n / multi-language / multi-country
└── payment_methods.md            ← cash, multi-currency, gateway choices
```
