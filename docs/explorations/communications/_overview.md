# Communication System — Layered Architecture
> Parent: [`../_overview.md`](../_overview.md)
> Last updated: April 29, 2026

---

## The 3 Layers

The communication system is split into three architectural layers. Each layer has its own exploration file. They are independent decisions but stack on top of each other.

```
┌──────────────────────────────────────────────────────────┐
│ LAYER 3 — AI Layer                                       │
│   sentiment · miscommunication detection · auto-suggest  │
│   human-in-the-loop dashboard                            │
│   → ai_layer.md                                          │
├──────────────────────────────────────────────────────────┤
│ LAYER 2 — Unified Chat Presentation                      │
│   single chat history surfacing email + WhatsApp + calls │
│   Kleinanzeigen-style: external mediums, internal log    │
│   → unified_chat.md                                      │
├──────────────────────────────────────────────────────────┤
│ LAYER 1 — Proxy Mechanics                                │
│   how messages physically flow between customer and GW   │
│   email proxy · WhatsApp proxy · voice/IVR proxy         │
│   → email.md · whatsapp.md · voice.md                    │
└──────────────────────────────────────────────────────────┘
```

---

## Layer 1 — Proxy Mechanics (Pre-existing)

How a message physically gets from one party to the other without exposing real contact details. Purely a transport problem.

| Channel | File | Status |
|---------|------|--------|
| Email | [`email.md`](email.md) | Catch-all webhook leading |
| WhatsApp | [`whatsapp.md`](whatsapp.md) | Group-per-order leading; virtual numbers under research |
| Voice / IVR | [`voice.md`](voice.md) | Architecture hypothesis set; Yasser researching providers |

---

## Layer 2 — Unified Chat (New, Apr 29)

How all communications surface inside the platform UI as a single chat history per order — regardless of which medium was used externally.

**Confirmed pattern (Ferhat, Apr 29):** Kleinanzeigen-style. External communication tools (email client, WhatsApp app) keep working for the user, but every exchange is also logged in the platform's chat view. WhatsApp messages render inline; emails and calls render as expandable remarks.

→ [`unified_chat.md`](unified_chat.md)

---

## Layer 3 — AI Layer (New, Apr 29)

What intelligence runs on top of the recorded communication stream — sentiment, miscommunication detection, auto-suggestions, and human-in-the-loop alerts.

**Important constraint:** Phone calls are excluded from inline AI analysis (recording legal complications). AI operates on email + WhatsApp + web chat only in v1.

→ [`ai_layer.md`](ai_layer.md)

---

## Why these layers must be separate decisions

- A new proxy mechanism (Layer 1) doesn't change how the chat UI looks (Layer 2)
- The chat UI doesn't depend on which AI features ship (Layer 3)
- AI features can ship in any order without breaking the chat or proxy
- Each layer can be in a different RE state: Layer 1 is mid-exploration, Layer 2 has a confirmed pattern, Layer 3 is fully exploratory

Decoupling them in the docs prevents one layer's progress from being blocked by another's open questions.

---

## Open Questions Across All Layers

→ [`../../open_questions.md`](../../open_questions.md) — Section 5: Communication System
