# eFactory Proposal — Business-Case Audit & Improvement Plan

> Review of `eFactory Proposal.html` (17 slides) against `berat_proposal_deck.md` (v2) and the live prototype/docs.
> Lens: **not** "is this a good UI prototype" — it is "does this make the business case for *continuing to invest* in a project the client has already reviewed and endorsed in direction." Audience: Berat Özdemir (owner of eFactory, co-owner of CalibtOS).
> Date: 2026-06-05.

---

## ✅ Implementation status (2026-06-05) — 🔴 High tier DONE

The four High-priority items are implemented in `berat_proposal_deck.md` + `eFactory Proposal.html` (deck is now **18 slides**; the moat is **Slide 10**, the demo **Slide 12**, the ask **Slide 18**):
1. **Demo landmine** — guardrail added to the moat slide's speaker note ("show only the 3-party chat + dispute lock; don't open the stale GW screens"); the prototype-code fix is queued as a separate task.
2. **Cost of doing nothing** — **new Slide 5** ("Doing nothing has a price too": forced bill · growing tax · data left dark), rendered & verified; Slide 4 note now adds the €-value + bridge.
3. **Re-anchor to the moment** — Slide 2 banks the prototype endorsement + ask becomes "build it for real"; demo slide reframed reveal→hardening; ask slide right-sized and close trimmed.
4. **Single source of truth** — MD declared canonical; `gen-notes.py` regenerates the HTML `#speaker-notes` from each slide's *What you say* (no more two-copy drift).

Verified: 18 sections = 18 notes = 18 MD slides; numbering sequential 02–18; no slide clips its frame. **Remaining: Medium + Low tiers (§10), the queued GW-screen fix, and a final human eyeball on Slide 5's visual polish.**

---

## 0. Executive summary & verdict

**The deck is strong, coherent, and unusually well-targeted to this specific buyer.** Its spine — *keep your freedom, remove the busywork, and it pays off across both your companies* — is the right spine. The design is disciplined (one message per frame, status chips, real numbers only). This is already a top-decile pitch.

But you asked me to be critical and to test it against one question:

> **"Why should I continue investing in this project instead of continuing with my existing manual process?"**

**Verdict: the deck answers this *emotionally and strategically* (freedom, asset-not-a-job, both-companies flywheel) but does not close the *financial* loop, and it is framed for the wrong moment in the relationship.** A founder asking "what's the return on the next euro?" leaves without a number. The five highest-leverage gaps:

1. **Wrong moment baked in.** The deck pitches *"your go-ahead to start"* and treats the prototype as a reveal ("Everything so far isn't a promise — we built it"). But Berat has **already reviewed the prototype and endorsed the direction**. The deck never banks that endorsement, never absorbs the *"adjustments still needed"* feedback, and asks for a smaller commitment than the situation warrants. → **Re-anchor as a continuation/commitment case, not a first pitch.**
2. **No economics anywhere.** Benefits float (Slide 12) with no cost side, no payback, no cost-of-doing-nothing. The one question you told me to test is fundamentally financial, and all commercials are deferred. → **Add a decision-economics / cost-of-inaction beat using only real figures.**
3. **A verified demo landmine.** Slide 9 (the moat — your single most distinctive slide) describes the *new* D-28/D-29 architecture, but the clickable GW screens behind the live demo still say the *opposite* ("auto-CC efactory1," "sent two ways at once," "financial questions auto-redirect"). A sharp ex-consultant clicking scene 3 will see the contradiction. → **Fix or fence off those screens before presenting.**
4. **The strategic/data upside is buried.** Continuity/key-person risk, delegation, onboarding, structured-data-as-a-moat, and the AI/BI future all sit in the appendix or are absent — yet this buyer *co-owns a software company*. These are the non-obvious benefits that make "continue investing" obvious. → **Surface one "your data becomes an asset" beat.**
5. **Speaker notes live in two files and have already drifted.** The MD's "What you say" and the HTML's `#speaker-notes` JSON array are separate hand-maintained copies. → **Make the MD canonical; generate the HTML array from it.**

Everything below is organized as the nine deliverables you requested.

---

## 1. HTML ↔ MD mapping & single-source-of-truth findings

### 1.1 Slide-by-slide mapping (1:1, clean)

| # | HTML `<section>` `data-label` | HTML action title (on slide) | MD section heading | Notes source today |
|---|---|---|---|---|
| 1 | Title | eFactory: from manual hustle to a system that scales | Slide 1 — Title | MD "What you say" → HTML `notes[0]` |
| 2 | The proposal | Keep your freedom. Remove the busywork. | Slide 2 — The whole proposal in one slide | MD → `notes[1]` |
| 3 | Today, every order runs through you | *(same)* | Slide 3 — Today, every order touches nine tools | MD → `notes[2]` |
| 4 | What 'normal' costs you each week | "Normal" already costs you 6–10 hours a week | Slide 4 — What "normal" is actually costing you | MD → `notes[3]` |
| 5 | Zapier is the timing, not the reason | *(same)* | Slide 5 — A practical moment to clean this up | MD → `notes[4]` |
| 6 | A Monday where the busywork already happened | *(same)* | Slide 6 — Where eFactory could be | MD → `notes[5]` |
| 7 | One platform, three doors | *(same)* | Slide 7 — How it works: one platform, three doors | MD → `notes[6]` |
| 8 | The system suggests — you decide | *(same)* | Slide 8 — And it keeps your freedom | MD → `notes[7]` |
| 9 | Your moat, enforced by architecture | *(same)* | Slide 9 — Your moat, enforced | MD → `notes[8]` |
| 10 | Six building blocks, and where each stands | *(same)* | Slide 10 — What's inside: six building blocks | MD → `notes[9]` |
| 11 | It's built — see it run | *(same)* | Slide 11 — See it run | MD → `notes[10]` |
| 12 | What the platform is worth | *(same)* | Slide 12 — What it's worth | MD → `notes[11]` |
| 13 | One decision, both companies win | *(same)* | Slide 13 — This is bigger than eFactory | MD → `notes[12]` |
| 14 | Built for reliability, not just speed | *(same)* | Slide 14 — Built to be reliable | MD → `notes[13]` |
| 15 | Phased and parallel — never standing on one leg | *(same)* | Slide 15 — The plan: a quick win first, then phased and safe | MD → `notes[14]` |
| 16 | The judgment calls stay yours | *(same)* | Slide 16 — The calls that stay yours | MD → `notes[15]` |
| 17 | The ask — your go-ahead to start | Your go-ahead to start. | Slide 17 — Next steps | MD → `notes[16]` |
| — | *(none)* | *(none — not built as slides)* | **Appendix A1–A8** | n/a |

**Every slide exists in the MD, and every slide has speaker notes.** Task-1 coverage is already satisfied at the structural level. The mechanism (`deck-stage.js:1092` `_loadNotes()`) maps the JSON array **by index** to `<section>` document order, so order integrity matters: inserting a slide without inserting a matching note silently shifts every later note by one.

### 1.2 Single-source-of-truth findings (these are the real issues)

- **SSOT-1 · Notes are duplicated and have drifted (HIGH process / MED impact).** The MD "What you say" blocks and the HTML `#speaker-notes` array are two independent copies. They are *not* identical — the HTML versions are condensed edits of the MD (e.g., Slide 2 drops the "Zapier gives us a practical date…" sentence; Slide 11 compresses the 6-step demo into a bracketed 5-step). Two hand-maintained copies will keep diverging. **Fix:** declare the MD canonical and regenerate the HTML JSON from the MD's "What you say" blocks (a tiny script, or a documented manual step), so there is one place to edit.
- **SSOT-2 · The MD describes layouts the HTML overrode (MED).** The MD's "On the slide" for Slide 2 is a dense paragraph; the HTML renders it as four numbered quadrant cards + an ask bar. Slide 16's MD still carries `[FILL with Ferhat]` / `[FILL]` markers; the HTML resolved both to "Set the rule together at kickoff." If the MD is the source of truth, it should reflect the *delivered* structure (note the quadrants; replace the `[FILL]`s with the resolved answer or an explicit "open — Berat owns RD-04 / E-12"). Otherwise the next person editing the MD reintroduces stale content.
- **SSOT-3 · The MD's `[Date]` placeholder was never filled (LOW).** MD Slide 1 says `[Date]`; HTML says "June 2026." Reconcile.
- **SSOT-4 · The appendix exists only in the MD (MED — see §9).** A1–A8 are described as "pull up on demand," but there are **no appendix slides in the HTML**. If you intend to answer deep Q&A by "pulling up" a slide, there is nothing to pull up.

---

## 2. Presentation audit — inconsistent / weak / duplicated / outdated

Severity: 🔴 High · 🟠 Medium · 🟡 Low.

### 2.1 Outdated / contradicted content

- 🔴 **A2-1 · The moat slide contradicts the live prototype (verified demo landmine).** Slide 9 says *"the writer never sees the customer's email … no external channel exists between them"* and tags the slide **"Working in prototype" (green)**. But the GW screens that sit behind scene 3 of the live demo still describe the **superseded** pre-D-28/D-29 model in plain text:
  - `src/gw/dashboard.jsx:120` — *"All customer chats are auto-CC'd to efactory1. Financial questions auto-redirect to kundenservice@efactory1.de."*
  - `src/gw/first-contact.jsx:174,177` — *"This is the one onboarding message — sent two ways at once … as an email **and** … the order chat,"* CC *"— enforced, non-removable."*
  - `src/gw/assignment-detail.jsx:283,611,658` — *"the introduction goes out two ways at once — as an email to [customer] (CC efactory1),"* *"efactory1 always in CC,"* *"No money discussion — redirect to kundenservice@efactory1.de."*
  
  This means (a) the slide's "no external channel / writer never sees the email" claim is **false against the clickable build**, and (b) the green "Working in prototype" chip over-states what scene 3 can actually demonstrate. The MD's own ⚠️ note flags this; the grep confirms it is still live. **Action before presenting:** either update those three screens to the structural-MITM model, or steer the live demo away from them and soften the chip to reflect "designed; chat + dispute-lock working."

- 🟠 **A2-2 · "It tests itself / automated monitoring runs every flow end-to-end" (Slide 14) is a strong claim — verify it is literally true.** On a *trust* slide, an unverifiable absolute is a liability if Berat (or Ferhat in the room) probes. If end-to-end self-testing isn't actually running yet, downgrade to the honest version ("we build automated checks into each flow as we ship it").

### 2.2 Inconsistent / weak

- 🟠 **A2-3 · Slide 8 quietly undercuts its own promise.** Slide 8 is *the* reassurance slide for a loss-of-control-averse owner — yet all four "freedom" controls carry the **blue "Designed"** chip (not built), while the *constraining* moat (Slide 9) carries the **green "Working"** chip. Subtext a sharp buyer may absorb: *"the powers that limit my writers are real; the powers that protect my freedom are still on a wishlist."* Verify the live state — per the prototype work, the **manual order path** and **post-payment re-price/override** are at least partly built (extension/scope-amendment gate). If any are working, tag them green. At minimum, add one line of speaker-note coverage: "designed and specified — these ship in the customer/admin phases, and you'll sign off on each."
- 🟠 **A2-4 · The "asset you could sell" framing is double-edged and used 2–3×.** "An asset you could one day *sell*" (Slides 12, 13, notes) is a powerful motivator *if* Berat wants optionality — but to a founder who isn't thinking about exit, it can read as "we assume you want out" or "we're commoditizing your life's work." Keep it, but frame as **optionality and de-risking** ("value that isn't trapped in your head — yours to keep, delegate, or one day sell"), and say it *once* with weight rather than three times in passing.
- 🟡 **A2-5 · Three "both companies" beats risk déjà vu.** The CalibtOS multiplier appears in Slide 2 (tease), Slide 13 (full), and Slide 17 (close). That's deliberate (tease → prove → close) and mostly fine, but the Slide 17 *spoken* close nearly re-recites Slide 13. Trim the close to one sentence and let Slide 13 carry the argument.
- 🟡 **A2-6 · Slide 4's "weeks from a wall" (Pipedrive 4,159/5,000) is the deck's only hard near-term forcing function and it's under-used.** It's stated once as a meter, then dropped. This is a *real, dated, external* cost — arguably more concrete than Zapier. It belongs in the cost-of-doing-nothing logic (§4).

### 2.3 What's genuinely good (keep — don't "fix")

- ✅ **Numbers discipline is correct.** The deck uses only the safe, real figures (3,410 deals, 4,159/5,000 slots, 5,262 leads) and the 6–10 hrs/wk is explicitly labelled a conservative estimate. **No fabricated xlsx-sample numbers appear** (no €87K receivables, no 258 GWs, no 3,510 count). Hold this line.
- ✅ **Slide 16 is honest.** Reassignment economics (RD-04) and job-board visibility (E-12 / GWS-01..03) are confirmed *still open* in `docs/open_questions.md` under Berat — so "decide together at kickoff" is accurate, not hand-waving.
- ✅ **"We kept your tools" (Slide 7) and "you decide" (Slide 8) are exactly the right anxiety-reducers** for this buyer and are consistent with D-01/D-02.

---

## 3. Per-slide review — founder/business-owner lens

For each slide: what it's *for*, and whether it earns its place in a *continue-investing* case. The full six-question feature lens (problem / manual effort / risk / visibility / capability / long-term value) is applied to the six modules in **§4.2**, where the actual business value lives.

| # | Slide | Founder's silent question | Does it answer it? | Fix |
|---|---|---|---|---|
| 1 | Title | "What is this meeting?" | Yes. Clear, confident. | Fill the date; consider a subtitle that signals *continuation* ("the case to build it for real"). |
| 2 | Keep freedom / remove busywork | "Give me the whole thing in 30 seconds." | Yes — excellent answer-first. | Add a 5th micro-line banking the prototype: "You've seen it. It works. Here's the case to commit." |
| 3 | Every order runs through you | "Do they actually understand my operation?" | Yes — the connector map is the strongest single visual. | None. This is the deck's best slide. |
| 4 | "Normal" costs 6–10 hrs/wk | "Is this real or consultant math?" | Partly. The estimate is honest but **lonely** — no € value, no cost side. | Tie to a € figure (his effective hourly value) and elevate the Pipedrive wall as a *dated forced cost*. |
| 5 | Zapier = timing not reason | "Are you fear-selling me a deadline?" | Yes — disarms the obvious objection well. | None; strong. |
| 6 | A Monday where busywork happened | "What does relief actually look like?" | Yes — vivid, concrete before/after. | None. |
| 7 | One platform, three doors | "Do I have to rip out my stack?" | Yes — "we kept your tools" is the right move. | None. |
| 8 | System suggests, you decide | "Will this put me in a box?" | Mostly — but see A2-3 (all chips "Designed"). | Re-tag built controls green; add one note line. |
| 9 | Your moat, by architecture | "What stops a writer stealing my customer?" | On the slide, yes — **but the prototype contradicts it (A2-1).** | Reconcile screens/chip **before** the demo. |
| 10 | Six building blocks | "What am I actually buying?" | Yes — clean menu with honest status mix. | None. |
| 11 | See it run | "Prove it's real." | Yes — but weaker if he's *already seen it*. | Reframe as "the build that hardens the prototype you reviewed," and protect scene 3 (A2-1). |
| 12 | What it's worth | "What's the return?" | **Half.** Benefits without an investment side or €. | Add ROI/payback logic; pull continuity + data-asset forward (§4, §5). |
| 13 | Both companies win | "Why is this strategic, not just ops?" | Yes — the clincher for a co-owner. | Keep; say the "frees you for CalibtOS" line once, slowly. |
| 14 | Reliability | "Will it break and embarrass me?" | Yes — but verify the self-testing claim (A2-2). | Soften the absolute if not literally true. |
| 15 | Phased & parallel | "Will this blow up my live operation?" | Yes — "never standing on one leg" + Phase 0 quick win is excellent de-risking. | None; strong. |
| 16 | Judgment calls stay yours | "Are there hidden gaps?" | Yes — reframes open questions as *his authority*. Honest. | Update MD `[FILL]`s (SSOT-2). |
| 17 | The ask | "What exactly do you want?" | Yes — but the ask is **smaller than the moment** (see §4.1, §7). | Reframe ask to "commit to the full build / Phase-1 contract," not "start." |

**Narrative arc verdict:** Act I (3–5) is well-built but risks *re-educating* a buyer who already conceded the premise. Keep all three slides, but shift their *posture* from "here's a problem you may not see" to "here's the part of it that's easy to underestimate — the ceiling and the dependency." The spoken notes already lean this way ("you know it better than anyone"); push further and **explicitly reference his prototype review** so Act I reads as confirmation, not discovery.

---

## 4. Business-value improvements (the narrative)

### 4.1 Re-anchor the whole deck on the *actual* moment

This is the single biggest narrative lever. The deck is written as a **first pitch**; the situation is a **post-review continuation decision**. Three concrete consequences:

1. **Bank the endorsement (Slide 2 + Slide 11).** Add: *"You've already seen this working and told us the direction is right. This is the business case to build it for real — and to address the adjustments you flagged."* This converts the prototype from "a thing we're revealing" into "a milestone you already validated" — which is exactly the proof that de-risks *continuing*.
2. **Absorb the "adjustments still needed" feedback (new micro-beat or Slide 16 reframe).** The client said *right direction, but adjustments*. Nowhere does the deck say "here's what we heard and how we're handling it." Slide 16 ("judgment calls stay yours") is the natural home: reframe a couple of rows as *"adjustments you raised → here's our recommendation,"* so the deck demonstrates *responsiveness*, not just foresight.
3. **Right-size the ask (Slide 17).** "Go-ahead to start" understates where you are. For someone who already endorsed the direction, the credible ask is **"commit to the full build — sign the Phase-1 contract this week."** A bigger, clearer ask is *easier* to say yes to than a vague "start," because it tells him exactly what he's deciding.

### 4.2 The six modules through the full founder lens

This is the rigorous "every major feature" pass. The deck (Slide 10) lists *what each kills*; here is the *business value* underneath — most of which belongs in speaker notes, not on the slide.

**1 · Order & Offer Engine** (20–30 steps → 0–3 clicks)
- *Problem solved:* offer creation is a manual relay across Pipedrive → Sevdesk → Outlook → Stripe.
- *Manual effort cut:* the per-offer copy/paste relay collapses to review-and-send.
- *Risk cut:* transcription errors (wrong price/pages/customer), inconsistent terms, forgotten follow-ups.
- *Visibility created:* every offer's live status (sent / viewed / accepted / expired).
- *Capability unlocked:* **anyone — not just Berat — can issue a correct, on-brand offer.** Volume stops costing his time 1:1.
- *Long-term value:* structured offer data → win-rate analytics, price optimization, terms A/B testing.

**2 · Customer Dashboard & Checkout** (kills the 2nd form; self-accept & pay)
- *Problem:* customers re-enter data; Berat chases acceptance and payment by hand.
- *Effort cut:* no manual payment links, no acceptance chasing, no re-keying.
- *Risk cut:* offer→payment drop-off; AGB/terms acceptance not captured; payment-link mistakes.
- *Visibility:* real-time funnel (viewed → accepted → paid); fewer "where's my order?" emails.
- *Capability unlocked:* serves many customers at once and **across time zones without Berat awake**; a professional experience underwrites premium pricing.
- *Long-term:* conversion-funnel data; foundation for repeat purchase and upsell.

**3 · Unified Inbox** (scattered email/WhatsApp/chat → one place)
- *Problem:* context is fragmented across Outlook/WhatsApp/chat; **Berat is the memory.**
- *Effort cut:* no app-switching; no scrolling WhatsApp to reconstruct what was agreed.
- *Risk cut:* missed messages, forgotten verbal promises, "he-said/she-said," context lost on handoff.
- *Visibility:* one conversation history per contact/order, visible to whoever needs it.
- *Capability unlocked:* **delegation and coverage** — a teammate can pick up a thread cold; the business answers when Berat is on holiday.
- *Long-term:* queryable comms history; sentiment/quality signals; future AI-assist training data.

**4 · GW Job Board & Assignment** (manual picking → apply + approve)
- *Problem:* Berat hunts for writers across channels and tracks availability in his head/Notion.
- *Effort cut:* writers self-apply; one approval queue replaces N outreach messages.
- *Risk cut:* assigning overloaded/unavailable writers; opacity/favoritism; "who's good" knowledge trapped in Berat.
- *Visibility:* who applied, who's free, who's overloaded, track record per writer.
- *Capability unlocked:* **scale the writer pool without scaling Berat's outreach**; structured matching (and later, segmentation — E-12).
- *Long-term:* writer-performance data → quality tiers, differentiated payouts, capacity forecasting.

**5 · Quality, Revisions & Disputes** (lost context → bounded loops + 5 outcomes + audit trail)
- *Problem:* revisions sprawl; disputes are reconstructed from WhatsApp; nothing is on the record.
- *Effort cut:* bounded revision rounds; a structured dispute flow instead of ad-hoc mediation.
- *Risk cut:* scope creep and unbounded free revisions eroding margin; **legal/he-said-she-said exposure**; reputational risk.
- *Visibility:* every decision and message logged; a clear five-outcome taxonomy; audit trail for tax/legal.
- *Capability unlocked:* **consistent handling by anyone**, not just Berat's judgment; defensible records.
- *Long-term:* dispute analytics (which writers/customers/order-types trigger them) → prevention; brand protection at scale.

**6 · Payments & GW Payouts** (Friday spreadsheet math → auto-confirm + 5-gate release)
- *Problem:* Berat checks Stripe logs and does Friday payout math by hand.
- *Effort cut:* payments auto-confirm; payout eligibility computed; no manual reconciliation.
- *Risk cut:* **paying a writer before all the customer's money is in** (cash-flow/margin risk); overpayment; paying out a disputed order.
- *Visibility:* the Blocked list shows exactly *why* each payout is held; clearer cash position.
- *Capability unlocked:* **the payout policy is enforced by the system** — anyone can run payday; margin protected structurally.
- *Long-term:* payout/cash-flow data → forecasting; the "pay only after all customer money in" rule **survives Berat.**

**Cross-cutting · The moat (3-party chat + dispute lock)** — the existential one
- *Problem:* customer↔writer could cut Berat out → lose customer *and* margin.
- *Effort cut:* no manual email-watching/CC-policing.
- *Risk cut:* **the existential disintermediation risk — designed out structurally**, not by vigilance.
- *Visibility:* Berat sees every customer↔writer exchange live.
- *Capability unlocked:* grow the network and delegate comms **without proportionally growing leakage risk.**
- *Long-term:* the matchmaker moat is enforced by architecture — it holds as the business scales or changes hands.

---

## 5. Hidden / non-obvious benefits (scored against the deck)

The benefits you enumerated, graded by how well the *current* deck communicates them, with where each should live. **Most are under-sold precisely because they are the "obvious-once-said" arguments that make *continuing* obvious.**

| Benefit | Deck coverage today | Where to put it |
|---|---|---|
| **Reduced founder dependency** | ✅ Covered — core theme (S4, S12). | Keep as spine. |
| **Business continuity / key-person risk (bus factor)** | ❌ Missing as a *named* risk. "Runs without you" is framed as convenience, never as **"today, if you're sick or away, eFactory stops."** | New beat in S12 or a one-liner: "Today, eFactory has a single point of failure — you." This is a **risk reduction** a founder feels immediately. |
| **Easier delegation** | 🟠 Partial — appendix A6 (scoped roles) only. | S12 note: "hire a junior ops person who *couldn't* exist in the current setup." |
| **Better onboarding** | ❌ Missing. | S12/S15 note: "a new admin or writer onboards in days, not months, because the process is the software." |
| **Process standardization** | 🟠 Implied (state machine, A2) but never *named as a benefit*. | One phrase on S10: "the process becomes the software — same every time, regardless of who runs it." |
| **Better reporting** | 🟠 Partial — Phase 0 viz (S15), A5. | Fold into a "data becomes an asset" beat (see §8, New Slide D). |
| **Better historical visibility** | 🟠 Partial — audit trail (S11/S12). | Already decent; reinforce in the data beat. |
| **Easier future automation** | ❌ Missing on main deck (A5 only). | Data beat: "once the data is structured, automation and AI become *possible* — they aren't today." |
| **Easier scaling** | ✅ Covered (S12 "more orders, same team"; expansion). | Keep. |
| **Better customer retention** | 🟠 Weak — "professional experience justifies higher prices," but no retention/repeat/LTV. | S12 note: "a professional, transparent experience is why customers come *back* — repeat business with no new acquisition cost." |
| **Better operational intelligence** | ❌ Missing on main deck (A5 only). | Data beat. |
| **Competitive advantage from structured data** | ❌ Missing on main deck. **Biggest miss for this buyer.** | Data beat — "4 years of structured order data is an asset your competitors don't have and can't buy." |
| **Future AI & analytics** | 🟠 Appendix A5 only. | Data beat, clearly labelled *direction, not v1* — but **surface it**, because this buyer co-owns a software company. |
| **Strategic value for both companies** | ✅ Covered — S13, the strongest slide. | Keep. |

**Pattern:** the deck is rich on the *freedom / asset / both-companies* axis and thin on the *continuity / delegation / data-as-a-moat / AI-future* axis. The second axis is exactly what reframes the spend from "an ops cost" to "building a compounding strategic asset" — which is the answer to "why keep investing."

---

## 6. Speaker-notes improvements

The notes are already good. Targeted upgrades (the highest-value ones), as before → after:

- **Slide 2 (`notes[1]`) — bank the prototype.** Add to the end: *"And remember — you've already seen this working and said the direction is right. So today isn't 'should we try'; it's 'should we build it for real.' That's the only decision on the table."*
- **Slide 4 (`notes[3]`) — give the hours a € value and a deadline.** Add: *"Put your own hourly value on those 6–10 hours and it's real money every week — but the harder cost is the Pipedrive wall: at 4,159 of 5,000 you have a dated, forced expense coming whether or not we do anything. The question is whether you pay to extend the old model or invest in replacing it."*
- **Slide 8 (`notes[7]`) — cover the "Designed" chips.** Add: *"A note on the tags — these controls are designed and specified; some already work in the prototype, the rest ship in the customer and admin phases, and you sign off on each one. The point isn't that they're done today; it's that freedom is in the design from the start, not bolted on later."*
- **Slide 9 (`notes[8]`) — honesty guardrail for the demo.** Add a bracket: *"[If demoing live: show the 3-party chat and the dispute chat-lock — both work. Do NOT click into the older GW onboarding screens; they still describe the previous CC-based model we've since replaced.]"*
- **Slide 11 (`notes[10]`) — reframe from reveal to hardening.** Change the opener from "Everything so far isn't a promise — we built it" to: *"You've clicked through this already, so I'll be quick — the point today isn't 'look, it exists,' it's to remind us what we're hardening into the real, wired-up build."*
- **Slide 12 (`notes[11]`) — add the continuity + data lines.** Append: *"Two things people underrate. One: today eFactory has a single point of failure — you. If you're sick or away, it stops. The platform removes that. Two: four years of your order data is structured for the first time — which makes reporting, then automation, then AI actually possible. None of that is buildable on four spreadsheet tabs."*
- **Slide 14 (`notes[13]`) — soften the absolute if needed.** If end-to-end self-testing isn't fully live, change "the system tests its own flows automatically" → *"we build automated checks into each flow as we ship it, so breaks surface before a customer hits them."*
- **Slide 17 (`notes[16]`) — right-size the ask and trim the repeat.** Replace "your go-ahead to start" with *"your commitment to build it for real — the Phase-1 contract this week,"* and cut the close to one line so it doesn't re-recite Slide 13.

(The remaining notes — 1, 3, 5, 6, 7, 10, 13, 15, 16 — are solid as-is.)

---

## 7. Recommended slide changes (concrete, per slide)

- **Slide 1** — fill the date; optional subtitle signalling continuation.
- **Slide 2** — add a 5th quadrant micro-line or a strip that banks the prototype endorsement ("Seen it. It works. This is the build decision.").
- **Slide 4** — add a € translation of the hours and promote the Pipedrive wall from a side meter to part of the core "cost of normal" logic (it's your only dated forcing function).
- **Slide 8** — re-tag any built controls green; add the note-line covering the "Designed" status so the reassurance slide doesn't read as a wishlist.
- **Slide 9** — **before presenting**, reconcile with the prototype (fix the three GW screens *or* soften the chip to "chat + dispute-lock working; full no-external-channel model designed") and add the demo guardrail to the notes.
- **Slide 11** — retitle/reframe to "hardening the prototype you reviewed"; lock scene 3 to the chat + dispute-lock only.
- **Slide 12** — this is the slide to upgrade most: add continuity/key-person-risk, delegation/onboarding, and a "data becomes an asset" tile (or split the data story into its own slide — §8). Keep the "asset you could sell" line but say it once, as optionality.
- **Slide 16** — resolve the MD `[FILL]`s; reframe ≥1 row as "an adjustment you raised → our recommendation."
- **Slide 17** — right-size the ask to "commit to the full build / Phase-1 contract"; one-sentence close.

---

## 8. New-slide recommendations

Net guidance: the deck is already 17 slides / ~35–40 min. **Add at most two**, and fold the rest into existing slides or the appendix.

- **New Slide B — "The cost of doing nothing" (HIGH — add).** Place after Slide 4 or fold into it. Three real, defensible facts, no fabrication: (1) the Pipedrive wall is a dated forced cost regardless; (2) the Zapier intake needs work by 31 July regardless; (3) every week, ~6–10 hrs of your time stays locked in coordination, and four years of data stays unusable. **This is the slide that directly answers your challenge question.** It reframes the decision as *invest vs. keep paying the inaction tax*, not *spend vs. save*.
- **New Slide D — "Your data becomes an asset" (MED–HIGH — add or fold into S12).** Pull appendix A5 forward as *one* beat: structured order/customer/writer data → reporting (Phase 0 already proves this) → operational intelligence → automation → AI assist. Label the AI part clearly as *direction, not v1*. For a software co-owner this is the most strategically resonant non-obvious benefit and currently it's buried.
- **Appendix mini-deck (MED — build 3–4 real slides).** A1 (as-is/to-be lifecycle), A2 (the state-machine proof — 21 states, 5-gate release, dispute outcomes), A3 (built-vs-designed table), A8 (GDPR/AGB/magic-link). Right now "pull up on demand" promises slides that don't exist. Even rough exhibits beat flipping to a Markdown file in front of the client.
- **Do *not* add** a separate "continuity/delegation/onboarding" slide — fold those into Slide 12 as tiles/notes to avoid bloat.

---

## 9. Missing-content report

| Missing | Why it matters for *continue-investing* | Severity |
|---|---|---|
| **Any economics** — cost, payback, ROI, or cost-of-inaction | The challenge question is financial; the deck answers it only emotionally. Commercials are deferred, but a *decision-economics frame* (real figures) is not the same as a price and should be present. | 🔴 |
| **Explicit acknowledgment that the prototype was reviewed & endorsed** | The deck's strongest de-risking proof (it already works, he already liked it) is left on the table. | 🔴 |
| **Response to "adjustments still needed"** | The client gave conditional approval; the deck never shows it heard the conditions. | 🟠 |
| **Business-continuity / key-person-risk as a named risk** | The most visceral founder benefit ("if you're out, it stops") is implied, never stated. | 🟠 |
| **Structured-data / operational-intelligence / AI future on the main deck** | The most strategic non-obvious benefit for a software co-owner sits in the appendix. | 🟠 |
| **Customer retention / repeat-business / LTV angle** | The platform's experience advantage is sold as "justifies higher prices," not "wins repeat customers." | 🟡 |
| **Appendix slides** | "Pull up on demand" with nothing to pull up. | 🟠 |
| **Competitive context** | No "what your competitors' customers experience" beat to frame the portal as differentiation. | 🟡 |

---

## 10. Priority improvements (High / Medium / Low)

### 🔴 High — do before presenting
1. **Fix the demo landmine (A2-1).** Reconcile the three GW screens with Slide 9, or fence them off and soften the chip + add the notes guardrail. A visible contradiction on your signature slide is the worst failure mode.
2. **Add a "cost of doing nothing" / decision-economics beat (§8 New Slide B, §6 Slide-4 note).** This is the direct answer to "why keep investing." Real figures only.
3. **Re-anchor to the actual moment (§4.1).** Bank the prototype endorsement (S2/S11), right-size the ask to "commit to the build" (S17). Cheap edits, large effect.
4. **Make the MD the single source of truth for notes (SSOT-1).** Stop the drift before the next edit makes it worse.

### 🟠 Medium — do before the *next* iteration
5. **Surface the data-as-asset / continuity / delegation benefits (§5, §8 New Slide D, §6 Slide-12 note).** Reframes spend as building a compounding asset.
6. **Fix Slide 8's status optics (A2-3) and verify Slide 14's self-testing claim (A2-2).**
7. **Build the appendix mini-deck (§8).**
8. **Reconcile MD ↔ HTML structure drift (SSOT-2, SSOT-3): quadrants, `[FILL]`s, date.**
9. **Reframe ≥1 Slide-16 row as "an adjustment you raised → our recommendation" (§4.1).**

### 🟡 Low — polish
10. Calibrate the "asset you could sell" framing to optionality; say it once (A2-4).
11. Trim the Slide-17 close so it doesn't re-recite Slide 13 (A2-5).
12. Add a customer-retention line to Slide 12; consider a one-line competitive-context beat.

---

### Bottom line
You don't have a weak deck — you have a strong deck aimed half a step behind where the relationship actually is. Close the financial loop, bank the endorsement you've already earned, protect the moat demo, and surface the data/continuity upside, and it stops being "a good pitch to start" and becomes "the obvious case to finish what you've validated."
