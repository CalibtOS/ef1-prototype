# eFactory Platform — Business Proposal  (v2)
### Presentation to Berat Özdemir · prepared by CalibtOS

---

## How to use this file

One section per slide. Each has: **On the slide** (what Berat sees — keep it sparse), **What you say** (your spoken script — adapt to your voice), **Notes** (prep / reminders, not shown).

**Single source of truth:** this MD is canonical. The HTML deck's `#speaker-notes` array is generated from each slide's *What you say* block by `python3 gen-notes.py` — edit notes here and regenerate; never hand-edit the HTML JSON (that's how the two drifted before).

**Framing assumption baked into v2:** Berat **co-owns CalibtOS** and separately owns eFactory. So this is a strategic-alignment conversation with a co-owner, not a vendor sale. Act III leans into that (Slide 14). Tone there = *shared strategic logic*, not "why hire us" — he already knows he owns CalibtOS; you're articulating how the pieces compound.

**Status legend** (small corner tags — never let a proposal read as "done"):
- 🟢 **Working in the prototype today** · 🔵 **Designed, ready to build** · 🟠 **Needs your decision**

> ⚠️ **Verify every 🟢/🔵 against the live prototype before presenting.** You know its real state.

**Numbers to confirm before presenting.** Use Berat's *real* figures + your/Ferhat's Excel — **never the fabricated xlsx sample** (€87K receivables, exact 3,510 order count, 258 GWs all trace to it; he'll recognize his own dummy data).
- ✅ Safe & real (from your live-system screenshots): **3,410 Pipedrive deals**, **4,159/5,000 subscriber slots used**, **5,262 leads logged**, ~913 Flamingo submissions, €49–€79/page pricing.
- Conservative planning estimate until Excel validates it: **3,410 deals over ~4 years ≈ 16 deals/week** as a historical baseline. If Berat spends only **5 min/order** on mechanical copy/paste, that is **~1.3 hrs/week**. The real load is the extra coordination: customer negotiation, GW questions, assignment decisions, payment checks, deadline chasing, and exceptions. Use **25–40 min/order total admin touch** as a conservative range → **~6–10 hrs/week** at that baseline.
- Still needed from real data: open receivables, current monthly order volume, actual offers/week, support/dispute frequency, ROI/€-saved.

Suggested length: **~35–40 min + discussion.** 18 core slides; depth in the Appendix.

---
---

## Slide 1 — Title

**On the slide:**
> # eFactory: from manual hustle to a system that scales
> Business Proposal · CalibtOS × eFactory
> [Date] · Presented by Ferhat & Yasser

**What you say:**
> "Berat — thanks for the time. Over the last weeks we mapped how eFactory actually runs: every form, every tool, every manual step to move one order from inquiry to delivery. Today: what we found, what we've already built, and a clear path to put it to work — plus the few calls that are yours to make. About thirty-five minutes, and please interrupt me anytime."

**Notes:** "Interrupt me anytime" suits his consulting reflex; answer-first (Slide 2) means it never derails you.

---

## Slide 2 — The whole proposal in one slide

**On the slide:**
> **You've built thousands of orders on freedom and grit.**
> That freedom now runs on **9 disconnected tools** — with Berat still doing the coordination between them.
> Zapier creates a practical timing point, but the real case is bigger: **keep your freedom and remove the busywork.**
> You've already reviewed the working prototype and confirmed the direction — now it's the decision to build it for real.
> And because **CalibtOS** builds it, this compounds across **both** your companies.
>
> **The ask:** your **go-ahead to build it for real** — first automation milestone live before July 31.

**What you say:**
> "If you take one thing from today, it's this slide — the rest is proof.
> You've run thousands of orders, basically by hand, and made it work — impressive. But it runs on nine separate tools, and the coordination between them still runs through you.
> Zapier gives us a practical date to work around, but it is not the reason to build eFactory. The reason is that the current process works because *you* absorb the complexity.
> We have a working prototype that proves the workflow: it removes the repetitive coordination without taking the freedom you run the business with. And because it's CalibtOS building it, this isn't just an eFactory win; it compounds across both companies. We'll get to that.
> And remember — you've already seen this working and told us the direction is right. So today isn't 'should we try' — it's 'should we build it for real.' That's all I'm asking: your go-ahead to build it, so the first automation milestone is live before that date."

**Notes:** Pyramid-principle answer-first. The CalibtOS kicker is a *tease* — don't explain it yet (Slide 14). Watch his face on "keeps your freedom."

---
---

# ACT I — The situation (mirror his reality back, sharper)

---

## Slide 3 — Today, every order touches nine tools

**On the slide:**
```
   WordPress (17 forms)
        │  Zapier  ← replace by Jul 31
        ▼
   Pipedrive ──► Sevdesk ──► Stripe
        │            │          │
        └──────► Google Sheets (4 tabs) ◄── you, by hand
                     │
              Notion · Outlook · WhatsApp
```
> *9 tools. One person holding them together: you.*

**What you say:**
> "I won't lecture you about your own business — you know it better than anyone. I just want to show you what we saw mapping it end to end, because in one picture it's striking.
> A customer inquires on WordPress. Zapier pushes it to Pipedrive. You open Sevdesk for the offer. Outlook to send it. Stripe for the payment link. Google Sheets — four tabs — is your real source of truth. Notion is the writers' board. WhatsApp is where half the real conversations live.
> Nine tools. None talk to each other. The thing connecting them is you, copying between them. Not a criticism — it's how the business grew. But it's the honest picture."

**Notes:** Respect, not pity. The cost comes next.

---

## Slide 4 — What "normal" is actually costing you

**On the slide:**
> **One order still creates many small admin touches** across Sevdesk, Pipedrive, Stripe, email, WhatsApp, Sheets, and the GW side.
> Conservative baseline: **~16 orders/week × 25–40 min admin touch = ~6–10 hrs/week**.
> Pure copy/paste alone may be only **~1.3 hrs/week** at 5 min/order — the bigger cost is negotiation, assignment, payment checks, deadline chasing, and exceptions.
> **Pipedrive: 4,159 / 5,000 subscriber slots used** — weeks from a wall. (3,410 deals · 5,262 leads logged.)
> **The real cost:** none of it runs without *you*. You're not the owner — you're the engine.

**What you say:**
> "You've done it so long it feels normal. So let's be conservative and put a number on 'normal.' If the mechanical copy-paste is only five minutes per order, that is not the main argument — at about sixteen orders a week, it's just over an hour.
> The real time is the invisible coordination around the order: answering the customer's negotiation question, deciding whether the scope is real, finding the right writer, checking whether the writer can take it, confirming payment, watching deadlines, handling a delay, chasing a missing invoice, or remembering what was agreed on WhatsApp. Conservatively, that is 25 to 40 minutes of admin touch per order — around 6 to 10 hours a week at the historical baseline.
> Look at this number too — your Pipedrive is at 4,159 of 5,000 contacts. You're weeks from a wall you'll have to pay your way around. Put your own hourly value on those 6–10 hours and it's real money every week — but hold that thought, because staying manual has a bigger, rising cost I'll show you next.
> But the minutes aren't the real cost. The real cost is this: *none of it happens without you.* You're not running eFactory — you *are* eFactory. That's the ceiling. And — we'll come back to this — it's also what's keeping you from the thing you actually want to build."

**Notes:** Present these as planning estimates, not measured facts. Math: 3,410 Pipedrive deals over ~4 years ≈ 16/week historical baseline. Time model: 5 min/order mechanical copy/paste + 20–35 min/order coordination = 25–40 min/order total admin touch. Replace the baseline with the last 8–12 weeks from Berat/Ferhat Excel if it differs before final pricing or ROI.

---

## Slide 5 — The cost of doing nothing

**On the slide:**
> **Doing nothing has a price too.** Staying manual isn't the free option — it's a bill you keep paying, in three currencies:
> - 📅 **A forced bill, already dated** — Pipedrive at 4,159/5,000 + Zapier retires 31 Jul. You spend on the current setup either way, for nothing new.
> - 📈 **A tax that grows with you** — ~6–10 hrs/week of coordination stays on your desk, and every new order adds more (it scales with *your* time, not the team's).
> - 🗄️ **Four years of data, left dark** — 3,410 deals · 5,262 leads, unqueryable across 9 tools → no reporting, no automation, no AI possible.
>
> *The question was never "spend or save." It's keep paying the inaction tax — or invest once and own the asset.*

**What you say:**
> "One honest counter-argument before we go further — 'it works, so why spend anything?' Let me show that doing nothing isn't actually the free option; there are three bills you keep paying.
> First, a forced one with a date on it: Pipedrive is nearly full and Zapier retires end of July, so you'll spend on the current setup either way — and get nothing new for it.
> Second, the weekly tax — those 6 to 10 hours don't go away; they grow, because the work scales with your time, not the team's.
> Third, the quiet one: four years of deals and leads sit locked across nine tools, so reporting, automation, and AI simply aren't possible on that data — and that stays true as long as it's scattered.
> So the real choice was never spend versus save. It's keep paying that tax, forever — or invest once and turn the spend into an asset you own."

**Notes:** This is the slide that directly answers "why invest vs stay manual." Use ONLY real, defensible numbers (4,159/5,000 · 3,410 deals · 5,262 leads · Zapier 31 Jul) — never the fabricated xlsx sample. State it as plain arithmetic, don't over-press; then hand to the Zapier/timing slide. Mirrors Slide 13's value tiles inverted (cost tiles in Act I ↔ value tiles in Act III).

---

## Slide 6 — A practical moment to clean this up

**On the slide:**
> **Zapier is not the business case. It is the timing trigger.**
> By July 31, the intake automation needs attention anyway.
>
> The decision:
> • Replace the connector and keep the same manual system
> • Use the moment to remove the handoffs that keep landing on you

**What you say:**
> "I don't want to overstate Zapier. Zapier is not the business case — it is just a useful timing trigger. By July 31, the intake automation needs work either way.
> So the real question is simple: do we replace the connector and keep the same manual operating model, or do we use the same moment to remove the handoffs that keep landing on you? This proposal is the second option."

**Notes:** Do not sell fear. Berat already knows the process works. The point is: if we are touching the intake layer anyway, use that moment to reduce dependency on Berat.

---
---

# ACT II — What we built, and why it fits *you*

---

## Slide 7 — Where eFactory could be

**On the slide:**
> **From:** 9 tools + you as the glue → **To:** one platform + you as the owner who *decides*
> *A Monday where the busywork already happened.*

**What you say:**
> "Picture the other side. A Monday where the busywork already happened without you. New inquiries already in your pipeline without you retyping them. Offers out in a click. Customers accept and pay themselves. Writers apply for jobs in one place, and you approve the right one. And you spend your morning on the things that actually need *you* — pricing the tricky deals, checking quality, deciding how to grow. Not copy-pasting across nine tabs. That's the platform. Let me show you."

**Notes:** Vivid future-pacing — the relief picture for someone drowning in ops.

---

## Slide 8 — How it works: one platform, three doors

**On the slide:**
```
        ┌─────────────────────────────────────────┐
        │            eFACTORY PLATFORM             │
        │   Order lifecycle: inquiry → delivery    │
        └─────────────────────────────────────────┘
         ▲                  ▲                   ▲
    Customer            You (Admin)         Ghostwriter
   (dashboard)        (one cockpit)        (job board)
   Behind it, wired in — not operated by hand:
   Sevdesk (invoices) · Stripe (payments) · Pipedrive (CRM)
```

**What you say:**
> "The whole thing in one picture. One platform, three doors — customers, you, writers — all looking at the same order in real time.
> And notice what we did *not* do: we didn't throw away your tools. Sevdesk still issues every legal invoice. Stripe still takes the money. Pipedrive still holds the CRM. They stay — they work, and they keep you compliant. What changes is *you* stop being the wiring between them. The platform does that, in the background."

**Notes:** "We kept your tools" shrinks the perceived change. Sevdesk/Pipedrive staying authoritative is a real decision (D-01/D-02).

---

## Slide 9 — And it keeps your freedom

**On the slide:**
> Ferhat said it: *"He's lived in total freedom for years. To give it up, we have to give him something actually better."*
> So we built the freedom **in**:
> - ✏️ Override **any** price — even after payment 🔵
> - 📱 Create an order by hand for a WhatsApp customer 🔵
> - 🏷️ Stack multiple discounts, your way 🔵
> - 🔓 Manual override everywhere — the system suggests, **you decide**
>
> **You lose the 20 steps. Not the control.**

**What you say:**
> "Now — the real question in the back of your mind. You've run this in total freedom for years. Will a system put you in a box? We designed against that from day one. You can still override any price — even after the customer paid. Still create an order by hand when someone WhatsApps you. Still stack discounts however a deal needs. The software *suggests* — you always get the final say.
> You lose the twenty manual steps. You don't lose one bit of control."

**Notes:** **Most important slide for his personal hesitation.** Slow down; pause after "you decide." If he probes an edge case, answer with override/manual-path; log genuinely-open ones for Slide 18.

---

## Slide 10 — Your moat, enforced 🟢

**On the slide:**
> Your model is a **matchmaker in the middle** — your value is that the writer can't run off with your customer. The platform makes "the middle" **structural** — not something you police by hand:
> - 🟢 **Customer and writer only ever meet in the platform's 3-party chat** — and you're a participant in every one, seeing everything live
> - 🟢 **They never get a private line** — the writer never sees the customer's email or phone; the customer's intro is a chat message, and the only email they get just links them back into the platform (no reply-to, no writer content)
> - 🟢 **No external channel exists between them** — so there's no back door for a side deal, nothing to leak
> - 🟢 **During a dispute the chat locks** — no one can sidestep you
>
> *Your biggest business risk — losing a customer to a writer — designed out, by architecture.*

**What you say:**
> "This one's specific to *your* model. eFactory works because you sit in the middle — the matchmaker. The day a writer and a customer cut you out, you've lost the customer and the margin. Today you protect that by personally watching every email and CC'ing yourself on everything.
> We didn't build a filter to police that — we made it so there's nothing *to* police. The writer and the customer can only ever talk in the platform's order chat, and you're a participant in every single one. The writer never even sees the customer's email — their introduction is just a chat message, and the customer only gets a link back into the platform. There's no private channel between them, so there's no back door. And during a dispute, the chat locks so no one can slip around you. Your biggest business risk — designed out, not by you watching, but by the architecture itself." [Demo guardrail: when this runs live, show only the 3-party chat and the dispute chat-lock — both work. Do NOT open the older GW onboarding screens; they still describe the previous CC-based model and contradict this slide until fixed.]

**Notes:** **Corrected per D-28/D-29.** The old "CC efactory1 on every email" + "financial-keyword auto-redirect" mechanisms were *removed* — superseded by admin being a structural participant in the 3-party chat (`communication_architecture.md` §5.1; `selectors.js:335`). The 3-party chat + dispute chat-lock are coded (🟢). ⚠️ **Stale-UI warning for the demo:** `gw/first-contact.jsx`, `gw/assignment-detail.jsx`, and `gw/dashboard.jsx` still show old "sent two ways at once / CC efactory1 / financial auto-redirect" language that contradicts this slide — fix or avoid those screens before demoing.

---

## Slide 11 — What's inside: six building blocks

**On the slide:**

| # | Module | What it kills | Status |
|---|--------|---------------|--------|
| 1 | **Order & Offer Engine** | 20–30 steps → **0–3 clicks** | 🟢/🔵 |
| 2 | **Customer Dashboard & Checkout** | the second form; customers accept & pay themselves | 🔵 |
| 3 | **Unified Inbox** | email, WhatsApp & chat scattered → one place | 🟢 |
| 4 | **GW Job Board & Assignment** | manual writer-picking → writers apply, you approve from one queue | 🟢/🔵 |
| 5 | **Quality, Revisions & Disputes** | lost context → bounded loops + 5 structured outcomes + full audit trail | 🟢 |
| 6 | **Payments & GW Payouts** | log-checking & Friday spreadsheet math → auto-confirm + a 5-gate release | 🔵 |

**What you say:**
> "Six building blocks. I'll show you the heart of each in a second, so here just the headline of what each one *removes*: the offer engine turns repeated Sevdesk/email/payment work into a controlled review-and-send flow; the dashboard lets customers accept and pay themselves; the inbox keeps external messages visible in one place; the job board lets writers apply while you keep approval; quality-and-disputes gives bounded revision rounds and a clean record of every decision; and payments confirm themselves instead of you checking logs every Friday."

**Notes:** Confirm each label against the live prototype. This is the menu; the demo is the meal.

---

## Slide 12 — See it run 🟢

**On the slide:**
> ### Live walkthrough — the system enforcing *your* rules
> *Legend:* 🟢 working now · 🔵 designed · 🟠 your call
> *[DEMO — switch to prototype]*

**What you say (framing before you switch):**
> "You've clicked through this already, so I'll keep it quick — the point today isn't 'look, it exists,' it's to remind us what we're hardening into the real, wired-up build. Two honesty notes: the screens and flows are all real and clickable today; wiring them to your *live* Sevdesk, Stripe and Pipedrive is the build we're proposing. And any amber tag is a decision I'll need from you later."

**Demo script — narrate "it runs my rules," not "look how many features":**
> 1. **Offer in a click** → "Customer's details already here, pricing calculated. Generate and Send. The twenty steps — gone."
> 2. **Customer accepts & pays** → "On their own dashboard. Watch the status flip to Paid by itself."
> 3. **The moat, live** → "Here's the order chat — customer, writer, and you, all in one thread. The writer can't see the customer's email; they have no other way to reach each other, and you're in every conversation. Now I'll open a dispute — watch the chat lock so neither side can sidestep you."
> 4. **Friday batch — the showpiece** → "Here's payday. The system won't release a writer's fee until five things are true: customer satisfied, quality passed, no open dispute, *every* customer installment received, and the writer's invoice in. Look at the Blocked list — each one tells you exactly why it's held. That's *your* rule — 'pay the writer only after all the customer's money is in' — running itself."
> 5. **When it goes wrong** → "Unhappy customer. Dispute panel: chat locks, you mediate, you pick one of five outcomes, every message logged. No more digging through WhatsApp to remember what was agreed."
> 6. **The receipts** → "And every action is timestamped here — useful for taxes, disputes, compliance."

**Notes:** This is the emotional peak — give it room. Rehearse cold on a **clean dataset**; have a **screen recording** fallback. The Friday 5-gate batch and the 3-party-chat-with-dispute-lock are your two "wow, this is real and it's *mine*" moments.

---
---

# ACT III — The case, the multiplier, the ask

---

## Slide 13 — What it's worth

**On the slide:**
> - ⏱️ **~6–10 hrs/week of admin drag reduced or delegated** — conservative estimate from the historical order baseline
> - 🏛️ **A business that runs without you** — an asset you could one day *sell* (value decoupled from you)
> - 📈 **More orders with the same team** — capacity grows because coordination no longer scales 1:1 with Berat's time
> - 💶 **Faster offer → accept → pay** = faster cash; higher prices justified by a clearly professional experience
> - 🛡️ **Catch a missed deadline before the customer does**; every dispute on the record
> - 🌍 **A path to expansion you can't manage manually** — Austria/Switzerland, language support, more structured writer operations
>
> *Working estimate: validate against Berat/Ferhat Excel before commercials.*

**What you say:**
> "What does it return? I want to be conservative here. The model says around 6 to 10 hours a week of admin drag can be reduced or delegated at the historical order baseline. Not because copy-paste alone is ten hours — it isn't. The copy-paste may only be an hour or so. The real gain is removing the repeated negotiation follow-up, writer coordination, payment checking, deadline chasing, and exception handling that keeps coming back to you.
> But the headline isn't hours saved — it's this: today eFactory can't run without you, so it isn't really an asset, it's a job. The platform turns it into a company that can run through rules, queues, and approvals — something you could *sell* one day, with value that isn't trapped in your head. More volume with the same team. Problems caught before customers complain. And a path to expansion you simply can't manage by hand. I'd rather under-promise on the numbers and have every one hold."

**Notes:** Lead the *asset/sellability* framing — it's a bigger motivator than time-saved and sets up Slide 14. Do not present the 6–10 hrs/week as audited; it is a conservative planning model. If Berat challenges it, say: "Let's measure it together from a normal week — the proposal does not depend on pretending this is exact."

---

## Slide 14 — This is bigger than eFactory

**On the slide:**
> Because **CalibtOS** builds it, one project pays off across **both** your companies:
> - 🔁 **Left hand to right hand** — the spend moves between two companies you own, and comes back as an **asset on both balance sheets**
> - 🏅 **CalibtOS's flagship reference client** — 4 years of real data, real complexity, running live. *No other client can give CalibtOS this.*
> - 🗣️ **The ultimate sales proof** — "we run our own business on this." Dogfooding is the strongest pitch CalibtOS has
> - 📦 **A product, not a project** — if it works for eFactory, CalibtOS can **license it to other agencies**. eFactory becomes the template
> - 🎯 **It frees you for CalibtOS** — eFactory's manual grind is exactly what's kept you from the company you set out to build
>
> *One decision. Both companies win.*

**What you say:**
> "And here's why this is bigger than eFactory — this part's just us, owner to owner. You own both. So the money for this moves from one of your companies to the other and comes back as an asset on *both* sides.
> CalibtOS needs a flagship reference client — and there is no better one than its own co-owner's business, four years of real data, running live. Every future CalibtOS pitch gets to say 'we run our own operation on this.' That's the most credible thing a software company can say.
> And if it works for eFactory — it will — CalibtOS can sell this same platform to other agencies like yours. eFactory becomes the template for CalibtOS's first product.
> The honest one, last: eFactory's manual grind is the thing that's kept you from building CalibtOS the way you wanted from the start. Systematizing eFactory is how you finally get to focus on it. One decision — and both companies win."

**Notes:** **The clincher for a co-owner.** Frame as *shared strategic logic* (he knows he owns CalibtOS) — not "why hire us." The "frees you for CalibtOS" line is the emotional core; deliver it sincerely, then pause.

---

## Slide 15 — Built to be reliable

**On the slide:**
> - Modern, proven, scalable tech — no lock-in
> - Your systems of record **don't change**: Sevdesk = invoicing, Pipedrive = CRM
> - **Reliability over speed** — we don't ship a flow until its edge cases are right
> - Automated monitoring runs every flow end-to-end — catches a break *before* a customer hits it
> - *Full technical detail → Appendix*

**What you say:**
> "I won't bore you with architecture — four things matter. Modern, proven tech, no lock-in. Your legal and financial systems of record don't change. Our rule is reliability over speed — we don't ship a flow until the messy edge cases are right. And the system tests its own flows automatically, so we catch a break before a customer ever hits it. Deep detail's in the appendix."

**Notes:** Trust slide for an owner, ~45 sec. If Ferhat's in the room, hand technical probes to him.

---

## Slide 16 — The plan: a quick win first, then phased and safe

**On the slide:**

| Phase | What lands | When |
|-------|-----------|------|
| **0 — Quick win** | Visualize your years of Flamingo/website lead data you've *never seen* — value before the build | **first** |
| **1 — Intake & sync safety** | Replace the fragile intake automation: website → Pipedrive/Sevdesk flow. *Nothing breaks.* | **before Jul 31** |
| **2 — Customer self-service** | Dashboard + checkout (kill the 2nd form) + auto-payment | next |
| **3 — Writers** | GW portal, job board, payout gates | next |
| **4 — Communication** | Email/WhatsApp into the platform + dispute panel live | next |

> *Each phase runs alongside what you do today until you trust it. No big-bang switch.*

**What you say:**
> "We don't rip your operation out overnight — that's the thing that makes any owner nervous, rightly. Phases. And before the real build, a quick win: you've got *years* of lead data from your own website you've literally never seen visualized — we turn that into a dashboard first, so you get value in week one. Then Phase 1 does one practical job: make intake and sync safe before July 31. Then customer self-service, then writers, then communication. Each phase runs *next to* what you do today until you trust it. You're never standing on one leg."

**Notes:** Phase 0 (Flamingo quick win) de-risks and builds momentum — ideal for an inertia buyer. Phase 1 uses the Zapier date as a practical sequencing point, not the central reason for the project. "Never standing on one leg" is the line to land.

---

## Slide 17 — The calls that stay yours 🟠

**On the slide:**
> Not gaps — **the judgment calls that stay with you, not the software.** A few examples of what we'll decide *together* once we start:
> 1. **Post-payment pricing** — *Customer pays installment 1, then adds 10 pages. Re-price after payment?* → **Rec: yes, with a logged override.**
> 2. **Off-form orders** — *Customer WhatsApps you, never uses the form. You create the order by hand?* → **Rec: yes — manual order path.**
> 3. **Deadline changes** — *A writer needs 3 more days. Auto-tell the customer, or you approve first?* → **Rec: you approve first.**
> 4. **Reassignment** — *Swap a writer mid-order. Does the first get paid for partial work; who absorbs the cost?* → **Rec: [FILL with Ferhat].**
> 5. **Job-board visibility** — *Every writer sees every job, or only writers you've tagged?* → **Rec: [FILL].**
>
> *We bring the recommendation. You make the call.*

**What you say:**
> "Last thing about the product — and it's about *you*, not the software. As we build, some judgment calls should always be yours. I'll show one: a customer pays their first installment, then asks to add ten pages — should the system let you re-price after payment? We'd say yes, with a logged note. That's the kind of call — we recommend, you decide. There's a handful like this; we don't settle them today, that's what our first sessions after kickoff are for. I just wanted you to see the control stays with you."

**Notes:** Persuasion, not requirements-gathering — proves depth + reinforces control. Walk **one** live, max. Full open list in Appendix.

---

## Slide 18 — Next steps

**On the slide:**
> 1. **Today** — your **go-ahead to build it for real**
> 2. **This week** — contract & kickoff, with the first automation milestone scoped
> 3. **At kickoff** — requirements sessions (where the calls above get made) + build begins
> 4. **Before Jul 31** — Phase 1 intake/sync safety live
>
> *Commercials: in the contract proposal, separately — kept real even left-hand-to-right-hand, so eFactory is a legit reference client.*

**What you say:**
> "So here's the ask. Today: your go-ahead to build it for real — that's it. This week we move to contract and kickoff, with the first automation milestone scoped clearly. Once we kick off, the first sessions lock the details and the build begins, with Phase 1 live before the current intake automation becomes a risk. Commercials we put in front of you separately — and we keep them real even though it's your money on both sides, because that's what makes eFactory a legitimate reference client for CalibtOS.
> Berat — this is the rare decision that wins on both sides of your table. The real question isn't whether Zapier is scary — it isn't. It's whether this is the moment to stop patching the old operating model and build the thing you've already validated. I say it is."

**Notes:** Single clean ask = the go-decision. The both-companies close is the payoff — land it, then **stop talking** and let him respond. Commercials deferred but flagged as real (legit reference client).

---
---

# Appendix (for Q&A — don't present; pull up on demand)

- **A1 · As-is vs to-be lifecycle** — the full 14-step current journey vs platform replacement (`docs/flows/customer/customer_workflow.md`).
- **A2 · The system is a real state machine** — 21 order states, guarded transitions, 5-gate Friday release, dispute outcomes A–E, QA + AI/plagiarism → account-block. (Proof it's not a CRUD mock-up.)
- **A3 · Built-vs-designed status table** — exactly what's clickable today vs what Phase 0–4 build.
- **A4 · The moat in detail** — structural MITM via the 3-party order chat (admin always a participant), no customer↔writer external channel, content-free intro email (D-29), dispute chat-lock, GW account-block vs shadow-ban. *(The old "CC efactory1 on every email" + financial-keyword redirect were superseded by D-28/D-29 — admin participating makes them unnecessary.)*
- **A5 · AI / BI roadmap** — ask-your-data-in-plain-language (prompt→SQL→view), sentiment + hostile-conversation detection, human-in-the-loop. (Direction, not v1.)
- **A6 · Growth enablers** — i18n/multi-currency, employee roles with GDPR-safe scoped access (delegate without exposing GW rates/customer PII).
- **A7 · Full open-questions list** — every decision by domain (`docs/open_questions.md`), beyond the 5 headline ones.
- **A8 · Security & compliance** — GDPR, AGB acceptance capture, magic-link auth.

---

*Draft v2 — co-owner framing baked in. Re-verify all 🟢/🔵 against the live prototype. Use the real screenshot numbers (3,410 deals · 4,159/5,000 · 5,262 leads), never the fake xlsx sample. Admin-time numbers are conservative planning estimates until validated against Berat/Ferhat Excel.*
