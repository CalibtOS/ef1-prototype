# Team Conventions
> Working agreements about *how we work*, not *what we build*.
> These are confirmed by Ferhat in meetings. Contradicting them is rework.
> Last updated: April 29, 2026

---

## TC-01 — Whitelist / Blacklist Documentation Pattern

**Confirmed by:** Ferhat, Apr 29 meeting

**The rule:** Every option we considered must appear in the docs — including the ones we're rejecting. Never silently drop an option.

**Why:**
> "It's not about saying 'hey, everything else is not what we want to do'. It's saying 'hey, this could be everything else, and we're actively deciding against this part of everything else because of that and that'."
> — Ferhat

**Practical application:**
- In every `explorations/*.md` file, list **all** options you considered
- For options you're rejecting, include a `### Option X — Assessed & Set Aside` block with explicit reasons
- When presenting to Berat: he sees the full menu + why we rejected each item, not just our preferred path
- Future-proofs the work: in 6 months when someone asks "did we consider X?", the answer is in the doc

**Already applied in:**
- `explorations/communications/email.md` — Options B and C marked as rejected
- `explorations/communications/whatsapp.md` — Option C (Business API) rejected with reasons
- `explorations/communications/voice.md` — Option C (voiceprint auth) rejected
- `explorations/communications/ai_layer.md` — v1 scope marked as whitelist + blacklist with reasons

---

## TC-02 — Fireflies Meeting Title Convention

**Confirmed by:** Ferhat, Apr 29 meeting

**The format:**
```
Meeting with [Client] - [Project] - [Topic]
```

**Why:**
- Allows automatic fetching of all meetings tied to a project / client later
- Prevents Fireflies transcripts from becoming an unsorted dumping ground
- Consistent with how Ferhat has named meetings historically

**Examples:**
- ✅ `Meeting with Berat - eFactory - Communication Proxy`
- ✅ `Meeting with Berat - eFactory - RE Phase Kickoff`
- ❌ `Daily Standup`
- ❌ `Weekly`

---

## TC-03 — RE Phase: Explore Everything, Decide Nothing

**Confirmed by:** Ferhat, Apr 29 meeting (multiple restatements)

**The rule:** During the Requirements Engineering phase (current), we are exploring. We are **not** deciding.

> "What is important is to have the overview of all the potential options."
> "It is not about saying we should be using it. It is about saying it because we should be aware that we could be using it."
> — Ferhat

**Practical application:**
- Don't say "let's not do this" in meetings — instead, document it as a considered-and-rejected option (TC-01)
- Don't push for a decision unless the topic has been fully explored
- A decision belongs in `decisions_log.md` only when the team + Ferhat (and where relevant, Berat) explicitly agree

---

## TC-04 — Documentation as a Single Source of Truth

**Confirmed by:** Ferhat (across multiple sessions)

**The rule:** Information lives in **one** place. Cross-references, never duplication.

- A confirmed business fact lives in `business_rules.md`. Other files link to it.
- An open question lives in `open_questions.md`. Other files link to it.
- A confirmed decision lives in `decisions_log.md`. Other files link to it.
- An exploration option lives in `explorations/*`. Other files link to it.

When information is updated, it's updated in **one** place. The links resolve to the latest state. No file ever holds stale duplicates.

→ Standing instructions about how to maintain this are in `~/.claude/.../feedback_doc_updates.md`.

---

## TC-05 — Naming Decisions Belong to the Team

**Confirmed by:** Ferhat (D-05)

**The rule:** Entity names, ID field names, route names, column names — must be agreed by the team explicitly. No AI-generated names without team sign-off.

**Why:** Naming decisions made by an AI without team review have repeatedly conflicted with the team's mental model and the German business context.

→ This is also recorded as `D-05` in `decisions_log.md`.
