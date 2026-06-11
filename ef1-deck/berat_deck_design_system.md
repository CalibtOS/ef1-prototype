# eFactory Deck — Design System (feed this with the prompt + MD)

> Purpose: exact visual tokens + reusable diagram archetypes so all slides render as ONE coherent executive deck. Treat these as binding; the MD is content, this is form.

## Canvas & format
- **16:9, 1920×1080.** Each slide = one frame. One message per frame.
- **Default theme: dark charcoal.** Use a **light "exhibit" theme** (paper bg) only for data-heavy slides (4, 12) if they read clearer — pick one per slide, don't mix within a slide.
- Generous whitespace. Action title top-left. The visual, not text, fills the body.

## Color tokens (use these exact values)
| Token | Hex | Use |
|---|---|---|
| `canvas` | `#181C22` | dark slide background |
| `panel` | `#11141A` | deeper insets, footer band |
| `surface` | `#232932` | cards / nodes on dark |
| `border` | `#323A45` | hairlines, dividers |
| `paper` | `#F6F8FA` | light-exhibit background |
| `ink` | `#11151B` | text on light |
| `text` | `#ECEFF3` | primary text on dark |
| `muted` | `#98A2B0` | secondary text, captions |
| `accent` (teal) | `#2E97A7` | brand accent: structure lines, key arrows, headers |
| `slate` (blue) | `#5C82BE` | secondary accent / neutral data series |
| **`built` (green)** | `#46A883` | **status: working in prototype** |
| **`designed` (blue)** | `#5B8DD6` | **status: designed / ready to build** |
| **`decision` (amber)** | `#D6A23E` | **status: needs Berat's decision** |

> Keep teal (structure) and designed-blue (status) tonally distinct — never use teal for a status chip. Greens/ambers muted, never neon.

## Typography
- **One family: Inter** (or IBM Plex Sans). Optional **serif for big stat numbers only**: Newsreader / IBM Plex Serif.
- Scale (at 1080p): action title **44/600**, section label **15/600 uppercase, +6% tracking, muted**, body **22/400**, caption **15/400 muted**, big-stat **96/600**.
- Max ~3 type sizes per slide. Titles sentence case.

## Grid & spacing
- 12-column grid, 96px side margins, 72px top/bottom, 24px gutter.
- Body word budget: **≤ 25 words of slide text** outside diagram labels. Everything else → speaker notes.

## Status chip (the green/blue/amber convention)
A small pill: 8px dot + 1px border in the status color, label in `text`. Examples: `● Working` (green) · `● Designed` (blue) · `● Your decision` (amber). Place top-right of the element it tags. **Convert every 🟢/🔵/🟠 in the MD into this chip — never render raw emoji on a slide.**

## Recurring visual archetypes (define once, reuse)
| Archetype | Where | Shape |
|---|---|---|
| **Human-connector map** | S3 (as-is) | central "You" node, 9 tool nodes around it, every line passing *through* You; tools in `surface`, lines `muted` |
| **Time equation / stacked bar** | S4 | `5 min copy-paste` (thin) **+** `20–35 min coordination` (thick) = `25–40 min/order` → `~6–10 hrs/wk`; label as *conservative estimate* |
| **Decision fork** | S5 | one road splitting into two: "replace connector only" (greyed) vs "remove the handoffs" (accent) |
| **Before/after split** | S6 | left = 9-tool Monday (cluttered, muted); right = one-platform Monday (clean, accent) |
| **Three-doors architecture** | S7 | platform slab; 3 labeled entries (Customer / You-cockpit / Ghostwriter); Sevdesk·Stripe·Pipedrive as a layer *behind* it |
| **Control panel** | S8 | row of toggles/sliders (override price, manual order, stack discount, approval gate) all set to "You decide" |
| **3-party chat triangle** | S9 | Customer—Writer—You triangle; You highlighted as participant; a lock glyph = dispute lock; no edge between Customer↔Writer outside the platform |
| **Maturity heatmap** | S10 | 6 modules × status color (green/blue/amber chips) |
| **Storyboard strip** | S11 | 5 numbered scene cards: offer → accept/pay → chat+lock → Friday 5-gate → dispute |
| **Value dashboard** | S12 | 4 metric tiles (hrs reduced · asset value · faster cash · risk caught) — conservative labels |
| **Flywheel** | S13 | 4-stage loop: eFactory proof → CalibtOS reference → reusable product → Berat freed → (back to proof) |
| **Gated rollout** | S14/S15 | horizontal phase bar 0→4 with a "parallel run" shaded lane under each phase = no big-bang switch |
| **Decision board** | S16 | rows of "We recommend → You decide" with amber chips |
| **Approval card** | S17 | single centered card: the ask + the immediate next milestone + date |

## Icons & imagery
- **One line-icon set** (Lucide), monochrome, single weight, used only to clarify business logic.
- **No** stock photos, gradients, cartoon illustration, 3D, or SaaS-marketing visuals.
- For Slide 11, prefer **real prototype screenshots** over mockups (see suggestion list).

## Mapping the MD (tell the tool explicitly)
- **`On the slide`** → body content guidance (re-laid-out as a diagram, not copied verbatim).
- **`What you say`** → speaker notes only. Never on the slide.
- **IGNORE / never render:** the "How to use" section, every `**Notes:**` block, all `⚠️` warnings, all `[FILL: …]` markers, and the ASCII diagrams (redraw them as real diagrams using the archetypes above).
- Action titles: rewrite topic-y titles ("How it works", "Built to be reliable") as **full-sentence takeaways**.
