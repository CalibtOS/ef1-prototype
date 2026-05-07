# Voice / Call System — Options Comparison
> Part of the Communication Proxy exploration.
> Parent: [`_overview.md`](../_overview.md) · Full open questions: [`open_questions.md`](../../open_questions.md)
> Status: **Exploring** — architecture hypothesis established, provider not selected. Yasser researching.
> Last updated: April 29, 2026

---

## The Problem to Solve

Berat currently receives calls on his personal number. He has no way to know which order a call relates to, no recording, no routing — it's entirely manual. Customers also call GWs directly.

The platform needs to:
1. Provide a single German phone number for all efactory calls
2. Identify the caller and which order(s) they're calling about
3. Route the call to the right person (GW, Berat, or support)
4. Bridge both call legs so neither party needs the other's real number
5. Record the call and make it accessible to Berat
6. Work bidirectionally (customers call in, GWs call in, platform initiates outbound)

---

## Architecture Hypothesis (Not Yet Decided)

```
Caller dials efactory number
        ↓
Voice API answers (IVR)
        ↓
Phone number lookup → DB match
        ↓
Routing decision (see IVR logic below)
        ↓
Outbound call to target person
        ↓
Conference bridge: both legs in same room
        ↓
Call recorded · Berat can monitor · Ends programmatically
```

Three sub-decisions within this architecture, each explored below:
1. Which Voice API provider?
2. Call bridging: Simple Dial vs Conference Room?
3. Caller authentication method?

---

## Sub-Decision 1 — Voice API Provider

### Candidate A — Twilio

**Model:** Cloud API, webhook-driven (TwiML XML instructions). Caller triggers webhook → backend returns instructions → Twilio executes.

**Strengths:**
- Industry standard — most documentation, most community support
- German numbers available
- Built-in speech recognition (de-DE)
- Conference rooms, recording, real-time streaming all available
- EU data residency region available
- Used by Uber, Airbnb, Lyft for exactly this use case

**Weaknesses:**
- Most expensive option (~€0.01/min + number rental)
- Call recording stored on Twilio servers by default (GDPR: data leaves Germany)

**Best for:** Prototyping and development — fastest to get running.

---

### Candidate B — SIPGATE

**Model:** German-native VoIP provider with SIP + REST API. Direct German infrastructure.

**Strengths:**
- German company, German data centers — strongest GDPR/BDSG compliance position
- Native German number reputation (customers see a local DE number they trust)
- Flat monthly rates — more predictable cost at scale
- SIP access gives deepest control over call handling

**Weaknesses:**
- Less developer-friendly than Twilio — fewer pre-built abstractions
- Smaller community / documentation pool
- SIP integration requires more configuration than webhook-driven approach

**Best for:** Production — best cost and compliance fit for a German business.

---

### Candidate C — Telnyx

**Model:** Cloud API (similar to Twilio) with EU infrastructure.

**Strengths:**
- Best per-minute pricing (~€0.004/min — roughly 2.5x cheaper than Twilio)
- EU data centers (GDPR-friendly)
- German numbers available
- WebSocket streaming for real-time audio (useful if AI transcription added later)
- Mission Control Portal for configuration

**Weaknesses:**
- Smaller ecosystem than Twilio
- Less community documentation for edge cases

**Best for:** Production if cost is the primary driver.

---

### Candidate D — Vonage (formerly Nexmo)

**Model:** Cloud API, webhook-driven (NCCO JSON instructions).

**Strengths:**
- Strong European presence and established
- German numbers available
- Good real-time audio streaming support

**Weaknesses:**
- Pricing similar to Twilio — not the cheapest
- Developer experience less polished than Twilio in recent years

**Best for:** Alternative to Twilio if Twilio has availability issues; no strong unique advantage here.

---

### Provider Comparison Table

| Criterion | Twilio | SIPGATE | Telnyx | Vonage |
|-----------|--------|---------|--------|--------|
| German numbers | ✅ | ✅ native | ✅ | ✅ |
| GDPR / EU data | ✅ EU region | ✅ Germany | ✅ EU | ✅ |
| Cost/min (approx) | ~€0.01 | Flat monthly | ~€0.004 | ~€0.01 |
| Developer experience | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Call recording | ✅ | ✅ | ✅ | ✅ |
| Conference bridge | ✅ | ✅ (via SIP) | ✅ | ✅ |
| Real-time audio stream | ✅ | ✅ | ✅ WebSocket | ✅ |
| Community/docs | Largest | Small (DE) | Medium | Medium |
| **Best role** | Dev/prototype | Production (compliance) | Production (cost) | Fallback |

**Leading hypothesis:** Twilio for development → evaluate SIPGATE or Telnyx for production.

**Research owner:** Yasser — evaluate against: German number availability, GDPR compliance documentation, per-minute cost, recording storage location.

---

## Sub-Decision 2 — Call Bridging Method

### Option A — Simple Dial (`<Dial>`)

Platform receives inbound call → returns instruction to dial the target number → Twilio/provider connects both legs.

```xml
<Response>
  <Dial><Number>+49151XXXXXXX</Number></Dial>
</Response>
```

**Pros:** Trivially simple, fast to implement.
**Cons:** No recording. No way for Berat to join as listener. No programmatic termination. No ability to add a third party. Caller ID shows the platform number to both parties (may confuse GW).

---

### Option B — Conference Room ⭐ Leading

Platform places both parties into the same named conference room:

```
1. Inbound call → Customer joins Conference "order-3491"
2. Platform makes outbound call to GW
3. GW answers → joins same Conference "order-3491"
4. Both parties hear each other · platform stays in the bridge
```

**Pros:**
- Full call recording (both legs)
- Berat can join as silent listener at any time
- Third party (e.g. Berat) can be added if escalation needed
- Call can be terminated programmatically
- Conference can have a "hold music" while waiting for second leg

**Cons:**
- Slightly more implementation complexity than simple Dial
- Requires managing conference room names (need to be unique per order, not globally)

**Assessment:** Conference room is clearly superior for this use case. The additional capabilities (recording, monitoring, moderation) are all required. Simple Dial is a prototype shortcut, not a production approach.

---

## Sub-Decision 3 — Caller Authentication

### Option A — Phone Number Match (Primary Method) ⭐ Leading

The inbound call's phone number (caller ID) is matched against the platform DB. If found → caller is identified and routing proceeds.

**Pros:** Zero friction for the caller. Already have the data (GW/customer phone numbers are in DB). No additional UX step.

**Cons:** Caller ID can be spoofed. But spoofing someone else's number to call Berat's system is an unlikely attack vector for this context.

---

### Option B — OTP Fallback (For Unknown Numbers)

If the inbound number is not in the DB:

```
IVR: "We don't recognize this number. We're sending a code to your registered contact."
        ↓
Platform sends OTP → registered WhatsApp / SMS / email
        ↓
IVR: "Please enter the 6-digit code"
        ↓
Code matches → proceed · Code fails → escalate or reject
```

**Pros:** Allows legitimate users calling from a new/temporary number to authenticate. Shifts liability: if someone gets in fraudulently, they had to compromise the user's phone/email first.

**Cons:** Adds friction for the caller. Requires OTP delivery to work (user must have WhatsApp/SMS accessible while on the call — possible but slightly awkward on a single phone).

---

### Option C — Voice Recognition (Voiceprint) — Assessed & Set Aside

User enrolls a voiceprint on first call. Platform verifies identity by voice on subsequent calls.

**Why set aside:**
- Significantly more complex to implement
- Vulnerable to voice cloning (increasingly cheap/accessible)
- If the platform is fooled by a voice clone, efactory bears the liability
- Options A + B achieve acceptable security with far less complexity and zero liability shift

---

### Authentication Comparison Table

| Method | Friction | Complexity | Spoofing risk | Platform liability if fooled |
|--------|----------|-----------|---------------|------------------------------|
| Phone number match | None | Very Low | Low (spoofing unlikely) | Platform |
| OTP fallback | Medium | Low | Very Low | User (compromised device) |
| Voice recognition | Low | High | High (cloning) | Platform |
| **Recommended** | A + B combined | — | — | — |

---

## IVR Routing Logic (Hypothesis)

| Caller type | Caller scenario | Proposed action |
|-------------|-----------------|----------------|
| Customer | One ongoing order | Bridge directly to assigned GW |
| Customer | Multiple ongoing orders | IVR menu: select which order |
| Customer | Completed orders only | Route to assigned GW if active; else support |
| Customer | Unknown / new inquiry | Bot collects name, topic, pages → creates lead |
| GW | Calling in | IVR menu: select which order/customer |
| GW | One active order | Bridge directly to that customer |
| Anyone | GW unavailable | IVR: "GW unavailable — would you like to leave a voicemail?" |

---

## What Gets Captured — Metadata vs Recording vs Transcription

Per the Apr 29 meeting (Ferhat), there are three layers of capture, with very different cost and legal profiles:

| Layer | Examples | Legal risk in DE | Customer-facing impact |
|-------|----------|-----------------|----------------------|
| **Metadata only** | Caller, recipient, IVR navigation, exit point, duration, completion status | Low — no spoken content captured | None |
| **Audio recording** | The full call audio | Medium — requires consent announcement | ❌ Out of scope — Berat confirmed no (D-16) |
| **Transcription** | Text version of the audio | Same as recording — but adds AI/processing surface | ❌ Out of scope — Berat confirmed no (D-16) |

**Confirmed (Apr 29):** Metadata logging is in scope regardless of recording decision. It's the foundation of the proactive task generation feature (E from `ai_layer.md`).

**Confirmed (May 1, D-16):** Berat said NO to call recordings AND NO to transcriptions. Metadata-only is now the confirmed scope. C-10 and C-11 are closed.

**Remaining open idea (not confirmed):** Ferhat floated transient sentiment analysis — process the audio, extract sentiment signal, immediately delete the source. This was not confirmed by Berat. Documented here for completeness per D-14.

---

## Call Metadata Use Cases (Even Without Recording)

Confirmed direction (Apr 29) — metadata alone enables several useful features without touching audio:

| Signal | Action |
|--------|--------|
| Customer entered IVR, picked an order, hung up before connecting to GW | Create task: "Customer dropped IVR mid-flow — call back" |
| Repeated short calls between customer and GW (< 30s) | Possible miscommunication / connection issue — flag |
| GW unavailable repeatedly when customer calls | Flag GW for capacity check |
| Customer first call in many days near deadline | Possible escalation — surface to Berat |

→ Full feature catalog: [`ai_layer.md`](ai_layer.md), Feature E.

---

## GDPR / Legal Considerations

German law (§201 StGB, BDSG) requirements for call recording:

- All parties must be informed before recording begins
- IVR must announce: *"Dieses Gespräch wird zu Qualitätssicherungszwecken aufgezeichnet."*
- Recording storage location must comply with GDPR — prefer German or EU servers
- Retention period must be defined and enforced (auto-delete after X months)
- Only authorized users (Berat, designated admin) may access recordings

**Twilio specifics (confirmed by Yasser):** Twilio plays the consent announcement automatically before recording starts. Pin Twilio account to EU region for data residency.

**Open question:** Retention period, storage location, and access control policy — needs Berat + legal input. See [`../../open_questions.md`](../../open_questions.md).

---

## Speech Recognition (Optional Enhancement)

Beyond keypad input, the IVR could accept spoken responses:

| Option | Accuracy (de-DE) | Cost | Complexity |
|--------|-----------------|------|-----------|
| Provider built-in (Twilio Gather speech) | Good | Included | Low |
| Deepgram | Excellent, real-time | Per-minute | Medium |
| OpenAI Whisper + GPT | Excellent + intent parsing | Per-request | High |

For v1: keypad (DTMF) input only. Speech recognition is an enhancement for a later iteration.

→ Open questions: [`open_questions.md`](../../open_questions.md) — Voice section
