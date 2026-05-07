# Unified Chat — Kleinanzeigen-Style Presentation Pattern
> Layer 2 of the communication system. See [`_overview.md`](_overview.md).
> Status: **Pattern confirmed by Ferhat (Apr 29)** — implementation specifics still open.
> Last updated: April 29, 2026

---

## The Problem to Solve

Customers and GWs use different mediums to communicate:
- Email (their preferred default)
- WhatsApp (mobile, fast)
- Phone calls (urgent or complex)

The platform must:
1. Capture every exchange in one chronological log per order
2. Allow Berat to scan an order's full communication history at a glance
3. Let users keep using their preferred external medium (don't force them into a web chat)
4. Surface all comms in a uniform view inside the platform UI

---

## Confirmed Pattern: Kleinanzeigen-Style

**Reference:** Kleinanzeigen Open Marketplace (formerly eBay Kleinanzeigen) — a long-standing German marketplace.

**The flow Ferhat described:**

```
1. Party A sends a message inside the platform (or external email replies to platform)
        ↓
2. Platform stores message in chat history for order #N
        ↓
3. Platform sends an email to Party B containing:
   - The message body
   - A reply address auto-generated for this order
        ↓
4. Party B can reply directly from their email client
        ↓
5. Platform's catch-all inbox receives the reply
        ↓
6. Platform parses → adds to chat history → sends notification email to Party A
        ↓
7. Both parties see complete history in the platform; both got every message in their inbox
```

**Why this pattern works:**
- No friction: parties keep using email — no forced login required
- Full audit trail: platform sees every message
- Both-sides UX: Berat sees clean chat in admin, parties see normal email
- Same pattern works for WhatsApp messages (different display rule, see below)

---

## Display Rules in the Platform Chat View

Confirmed by Ferhat (Apr 29): each medium renders differently in the unified chat.

| Medium | Display in chat |
|--------|----------------|
| WhatsApp message | **Inline** — full message body rendered like a chat bubble |
| Email | **Expandable remark** — "Email sent from [party]" — click to view full body |
| Phone call | **Expandable remark** — "Call from [party] · 4m 12s · [recording link]" — click to view metadata |
| Web chat (in-platform) | **Inline** — same as WhatsApp |

**Reasoning:** WhatsApp and web chat are short, conversational, and high-volume. Emails are typically longer and more formal — expanding inline would dominate the view. Calls have only metadata + recording, no body text.

---

## Architecture Implications

For Layer 2 to work, every Layer 1 channel must be wired to feed the chat:

| Layer 1 channel | What gets into the chat |
|-----------------|-------------------------|
| Email proxy (catch-all webhook) | Inbound email body + sender + timestamp |
| WhatsApp proxy (bot or virtual number) | Message body + direction + timestamp |
| Voice (Twilio/SIPGATE) | Call metadata: caller, duration, completion, recording URL |
| Web chat (platform native) | Direct DB write |

The chat is the **single source of truth**. The proxy mechanisms are just intake adapters.

---

## Data Model Sketch (Hypothesis)

```
ChatEntry {
  id              UUID
  order_id        FK → orders
  medium          enum(email, whatsapp, voice, web)
  direction       enum(customer→gw, gw→customer, system, admin_note)
  body            text         -- for messages
  metadata        json         -- for calls: duration, recording_url, etc.
  external_ref    string       -- email Message-ID, WhatsApp ID, Twilio CallSid
  created_at      timestamp
}
```

A single table for all mediums keeps queries simple ("show me everything for order 3491 in chronological order"). The `medium` field drives display logic in the UI.

---

## Open Questions

| # | Question |
|---|----------|
| UC-01 | When the customer replies from email, how do we extract just the new content (not the quoted history)? |
| UC-02 | What's the reply-to convention for per-order email addresses? (`order-3491@efactory1.de`?) |
| UC-03 | If an email reply has attachments, where do they live? (S3? Object storage?) |
| UC-04 | Do we surface "system events" in the same chat (e.g. "GW assigned at 14:32")? Or in a separate panel? |
| UC-05 | Berat's preference: chronological or grouped-by-medium view? |

→ All tracked in [`../../open_questions.md`](../../open_questions.md) — Section 5

---

## Why This Is Layer 2, Not Layer 1

The proxy files (email.md, whatsapp.md, voice.md) describe how a message physically moves between two parties. This file describes how those messages all converge into one platform view. The proxy can be implemented with any technology — the chat presentation logic doesn't care.

If Berat decides tomorrow to switch from a catch-all email proxy to a per-mailbox approach, this file doesn't change. That's the value of layering.
