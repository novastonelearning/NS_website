# Handoff: Novastone Learning — Leadership Film Series website

## Overview
Marketing + course-delivery site for an educational-leadership film series sold to institutions of higher
education that teach graduate-level leadership in education. The product is a set of ten short films (10–13 min)
that dramatize the gray area of school-leadership decision-making, plus an AI layer where students hold a
one-on-one conversation with any character in a film to probe motive, knowledge, and blind spots.

What exists today: **one page — the landing page.** It is complete and hi-fi. The rest of the site
(listed under "Pages still to build") is not designed yet; this document gives the system to build it in.

## About the Design Files
The files in this bundle are **design references authored in HTML** — a prototype showing intended look,
copy, and behavior. They are **not production code to copy**.

`Landing Page.dc.html` is written for a component runtime used by the design tool (`<x-dc>`, `{{ }}` template
holes, `<sc-for>`/`<sc-if>`, a `Component extends DCLogic` class, `<image-slot>` drag-drop placeholders). None of
that should ship. Read it as a spec: the markup structure, the inline styles, and the data arrays in the logic
class are the source of truth for layout, tokens, and copy.

**The task is to recreate this design in the target codebase's own environment** — its framework, router,
component library, and styling approach. If no codebase exists yet, pick the appropriate stack
(Next.js + Tailwind is a reasonable default for a marketing site with a gated student area) and build it there.

Map the prototype's constructs as follows:
- `<sc-for list="{{ films }}">` → a normal `.map()` over the films array
- `<sc-if value="{{ modal }}">` → conditional render of the trailer dialog
- `{{ activeTitle }}`, `{{ trackX }}`, `{{ dots }}` → derived values from carousel state
- `<image-slot src="...">` → a plain `<img>` / `next/image`. These were author-fillable placeholders; several
  still hold stand-in art (see **Assets**)
- inline `style-hover="…"` → real `:hover` rules
- All inline styles → the codebase's styling layer; extract the token table below first

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, and interaction behavior are final and should be matched
closely. Two caveats:
- **Copy is placeholder where noted.** All ten film titles, loglines, themes, and runtimes are invented, as is
  the faculty testimonial ("Placeholder quote — faculty attribution" is literally on the page). Do not ship them.
- Runtime values in the film cards read "2:14" etc. (trailer lengths) while the section intro says films run
  10–13 min. Confirm which number belongs on the card.

## Design Tokens

### Color
| Token | Hex | Use |
|---|---|---|
| ink-900 | `#0B0713` | page background, hero band, film section |
| ink-800 | `#0F0A1B` | AI chat panel background |
| ink-700 | `#150C24` | alternating section background, cards, CTA panel |
| ink-600 | `#1E1330` | carousel card background |
| ink-500 | `#221836` | AI reply bubble |
| plum-700 | `#200537` | hero copy-band background; header uses `#200537D1` (82% alpha) |
| plum-600 | `#22143B` | text on gold, gradient endpoint in AI section |
| gold-500 | `#F4AA00` | primary accent: CTA fill, stat numerals, eyebrows, active dot |
| gold-400 | `#FFC53D` | gold hover |
| brass-500 | `#AD974F` | serif eyebrow text, bullet dots, subdued labels |
| paper-100 | `#F3EFE7` | primary text on dark |
| paper-200 | `#EDE8DE` | list copy, AI reply text |
| paper-300 | `#D9D2C6` | hero body copy, nav links (`#D9D2C6`) |
| paper-400 | `#D2CABB` | section body copy |
| paper-500 | `#B4AB9C` | secondary/meta copy |
| paper-600 | `#8C8375` | footer text |
| hairline | `rgba(243,239,231,0.12)` | borders, dividers (0.10 on cards, 0.16 on stat rule, 0.25–0.35 on outline buttons) |

Scrim gradients (hero photo): top `linear-gradient(180deg,#0B0713 0%,rgba(11,7,19,.55) 45%,rgba(11,7,19,0) 100%)`
at 140px tall; bottom `linear-gradient(180deg,rgba(11,7,19,0) 0%,rgba(11,7,19,.9) 72%,#0B0713 100%)` at 180px tall.
AI section background: `linear-gradient(180deg,#150C24 0%,#22143B 100%)`.
Film thumbnail overlay: `linear-gradient(180deg,rgba(11,7,19,0) 45%,rgba(11,7,19,.85) 100%)`.

### Typography
Two families, loaded from Google Fonts:
- **Archivo** (400/500/600/700) — all UI and headlines.
- **Libre Caslon Text** (400, 400 italic, 700) — eyebrows/kickers (uppercase, wide tracking) and the pull quote.

> These are **stand-ins**. The brand standards supplied for this project specify Founders Grotesk and Adobe
> Caslon, neither of which is licensed for web embedding by default. If the institution holds web licenses,
> swap them in via self-hosted `@font-face`; Archivo → Founders Grotesk and Libre Caslon Text → Adobe Caslon
> are the intended substitutions.

| Role | Spec |
|---|---|
| H1 (hero) | Archivo 700, `clamp(40px,5.6vw,86px)`, line-height .97, letter-spacing −.03em, max-width 24ch, `text-wrap:balance` |
| H2 (section) | Archivo 700, `clamp(32px,4vw,52px)`, lh 1.05, ls −.03em |
| H2 (CTA panel) | Archivo 700, `clamp(28px,3.4vw,42px)`, lh 1.08, ls −.03em, max-width 22ch |
| H3 (carousel) | Archivo 700, `clamp(26px,2.6vw,38px)`, lh 1.1, ls −.025em |
| H3 (film card) | Archivo 700, 22px, lh 1.15, ls −.02em |
| Hero body | Archivo 400, `clamp(16px,1.5vw,20px)`, lh 1.55, max-width 58ch |
| Section body | Archivo 400, 17px, lh 1.62, max-width 48–50ch |
| Card body | Archivo 400, 14.5px, lh 1.55 |
| Eyebrow / kicker | Libre Caslon Text 400, 12–13px, ls .26–.28em, uppercase |
| Card meta label | Libre Caslon Text 400, 11.5px, ls .20em, uppercase |
| Pull quote | Libre Caslon Text 400 italic, 18px, lh 1.6 |
| Stat numeral | Archivo 700, 30px, ls −.03em, gold |
| Stat label | Archivo 400, 13px, ls .10em, uppercase |
| Buttons | Archivo 600, 15–16px (13px on the thumbnail trailer chip) |
| Nav links | Archivo 500, 14px |
| Wordmark | Archivo 600, 14px, ls .14em over Libre Caslon 11.5px, ls .14em uppercase |

### Spacing / geometry
- Content container: `max-width:1180px; margin:0 auto`; horizontal page padding 32px.
- Section vertical rhythm: 104px top and bottom (`padding:104px 32px`). Hero copy band 72/32/56. Footer 44px.
- Header: `padding:26px 32px`, sticky, `backdrop-filter:blur(14px)`, 1px bottom hairline, `z-index:60`.
- Radii: 999px (pills, dots, avatars), 22px (CTA panel), 20px (carousel card), 18px (AI panel, modal),
  16px (film card, chat bubbles — bubbles use `16px 16px 4px 16px` / `16px 16px 16px 4px` for the tail).
- Gaps: 44px (stat row, feature split), 26px (film grid), 22px (card interior), 14px (button row), 12px (list items).
- No box-shadows anywhere. Depth comes from background steps + hairlines.

## Screens / Views

### Landing page (`Landing Page.dc.html`) — the only screen designed
Anchor-scrolled single page. Section ids: `#top`, `#approach`, `#films`, `#ai`, `#adopt`.

**1. Header — global, must persist on every page of the site**
Sticky, full-width, `rgba(32,5,55,.82)` + 14px blur, hairline bottom. Left: wordmark lockup linking to `#top`
("Novastone Learning" / "LEADERSHIP FILM SERIES"). Right: nav — Our Approach, The Films, Talk to Characters,
For Faculty — then a gold pill "Request Access". Nav is `flex-wrap:wrap; justify-content:flex-end; gap:12px 22px;
white-space:nowrap`. No mobile/hamburger treatment is designed yet — you need one (see open items).

**2. Hero (`#top`)** — three stacked bands, deliberately *not* overlapping:
- a. Copy band on `#200537`: serif gold eyebrow "Graduate Programs in Educational Leadership"; H1
  "Leadership Training Meets Cinematic Storytelling"; body paragraph; two pills — gold "Watch the trailers"
  (→ `#films`) and outlined "Bring it to your course" (→ `#adopt`).
- b. Photo band: full-bleed classroom image, `height:clamp(360px,52vh,620px)`, `background-size:cover`,
  `background-position:center 22%`, with the two scrim gradients above/below so it melts into the dark bands.
  **The crop matters** — this band exists specifically so the headline never covers the faces. Keep text out of it.
- c. Stat row: hairline rule, then metrics in a wrapping flex row, gold numeral over uppercase label.
  Currently "10 / Films in the series", "18 / AI characters to interview", and **an empty third slot** —
  it previously read "90 min / Built for one class session". Either restore a third stat or delete the slot.

**3. Carousel (`#approach`)** on `#150C24` — the "What We Do / Who We Are / How It Works / Why It Works" requirement.
Header row: serif eyebrow "The Series", H2 that shows the **active slide's kicker**, and prev/next circular
buttons (52px, 1px hairline, transparent; hover → gold border + gold glyph) pinned right.
Track: `display:flex`, each slide `flex:0 0 100%`, `transform:translateX(-i*100%)`,
`transition:transform 520ms cubic-bezier(.22,1,.36,1)`, clipped by a `border-radius:20px; overflow:hidden` frame.
Slide card: two wrapping columns — text `flex:1 1 380px` (padding `clamp(28px,4vw,52px)`), image `flex:1 1 320px`
(min-height 320px, left hairline). Text column = serif gold kicker, H3 headline, body, then 3 bullets with
7px brass dots. Below the track: progress dots, 4px tall, 24px wide inactive `rgba(243,239,231,.28)` /
56px wide gold active, `transition:all 300ms`, each clickable to jump.
Index wraps in both directions (`(n + len) % len`). No autoplay. Slide copy is final — take it from the
`slides()` array verbatim.

**4. Film grid (`#films`)** on `#0B0713` — the clickable thumbnails requirement.
Header row: eyebrow "The Films", H2 "Ten decisions with no clean answer", and a right-aligned 38ch note.
Grid: `repeat(auto-fill,minmax(min(100%,300px),1fr))`, 26px gap. Card: `#150C24`, hairline border → gold
`rgba(244,170,0,.55)` on hover, 16px radius, clipped.
Card top: 16:9 image, bottom-up dark overlay, and a gold pill bottom-left — "▶ Trailer · {runtime}" —
that opens the trailer. Card body: brass serif theme label, title, logline.
The array holds **six** films but the section headline says ten; the real catalogue is ten, so the data source
needs four more entries.

**5. Trailer modal** — `position:fixed; inset:0; z-index:100`, `rgba(6,4,11,.88)` + 8px blur, click-anywhere-to-close,
centered panel `min(920px,100%)`. 16:9 player area (`#08050E`) currently holds a gold play disc and the words
"Trailer embed goes here" — **this is the one unimplemented interaction: no video is wired.** Below it: theme
label, title, logline, and a "Close" outline button. Needs: real embeds, Esc-to-close, focus trap, and
`aria-modal`/labelled dialog semantics.

**6. AI section (`#aid)** on the plum gradient — two wrapping columns, `gap:clamp(36px,5vw,64px)`.
Left: eyebrow "Interview the Characters", H2 "Ask the principal why she did it", explanatory body, italic
pull quote, and the attribution placeholder line. Right: a static **mock** of the chat — avatar + character
name/film, one gold user bubble right-aligned, one dark character bubble left-aligned, and two outlined
suggested-question chips. It is a picture of the product, not the product; the real conversational UI is a
separate build (see below).

**7. CTA (`#adopt`)** — one panel, `#150C24`, 1px `rgba(244,170,0,.35)` border, 22px radius, 56/48 padding,
headline + body left, gold "Request faculty access" pill right, wrapping to stacked on narrow widths.
Body copy says "all six films" — update to ten.

**8. Footer** — hairline top, copyright left ("© 2026 Lipscomb University · College of Education" — **stale,
the brand is now Novastone Learning; reconcile which entity owns the site**), three anchor links right.

## Interactions & Behavior
- **Nav / CTAs**: in-page anchor scrolling on the landing page; become route links once other pages exist.
  Add `scroll-behavior:smooth` and `scroll-margin-top` equal to header height so anchors don't land under it.
- **Carousel**: prev/next buttons and dot clicks; wrap-around; 520ms cubic-bezier(.22,1,.36,1) translate.
  Missing and worth adding: keyboard arrows, swipe, `aria-live` announcement of the active panel.
- **Film card**: the trailer pill is the click target. Make the whole card clickable in production.
- **Modal**: opens with film index, closes on overlay click or Close. Add Esc, focus return, scroll lock.
- **Hover states**: gold pills → `#FFC53D`; outline circles → gold border+glyph; film card → gold border;
  links `#F4AA00` → `#FFC53D`.
- **Responsive**: everything is fluid — `clamp()` type, `flex-wrap` with `flex:1 1 <basis>`, `minmax(min(100%,300px),1fr)`
  grid. There is **no designed breakpoint for the header nav** and no mobile-specific hero. Both need design
  before launch.
- Not designed: focus-visible rings, loading skeletons, form validation, error states, reduced-motion fallback.

## State Management
Landing page needs only local UI state:
- `activeSlide: number` (0–3) — carousel index; derives the H2 text, track transform, and dot styles.
- `openFilm: number | null` — index into the films array; non-null renders the modal.
Content (`slides`, `films`) is static in the prototype. In production put films in a CMS or a typed content
file: `{ id, title, theme, runtime, logline, trailerUrl, poster, characters[] }`. No data fetching on this page.

The AI conversation feature, when built, is the only genuinely stateful surface: per-student threads,
per-character system context, transcript persistence (faculty use transcripts as discussion material), and
auth-gated access.

## Pages still to build
The nav already promises these; only the landing page exists.
1. **The Films** — full catalogue index (ten) + a per-film detail page: synopsis, trailer, runtime, themes,
   character roster, facilitation guide download, "start a conversation" entry point.
2. **Talk to Characters** — the real conversational UI. Character picker, chat thread, transcript export.
   The landing-page mock defines its visual vocabulary (bubble shapes, colors, suggested-question chips).
3. **Our Approach** — long-form version of the carousel content; pedagogy, standards alignment, evidence.
4. **For Faculty** — licensing, syllabus integration, discussion protocols, screening logistics, request form.
5. **Request Access** — institutional inquiry form and its success/error states.
6. Plus the unglamorous set: student auth, 404, privacy/terms, accessibility statement.

## Assets
All in this folder. **Every image is a stand-in** dropped into an author-fillable slot; none is final art.
- `hf_20260914_185723_cc84cc3a-26c1-4932-9b-mu1n1jcy-viw5.png` — hero classroom photo (used as a CSS background
  at `center 22% / cover`). The two unused `hf_…` files are earlier variants of the same shot.
- `screenshot-2026-09-14-at-5-48-52-pm-mu1u5gp6-f49h.png` — sits in the carousel's image column. Because the
  slot lives inside the repeated template, **all four carousel slides show this one image**. Production needs
  four distinct images, one per slide (the `photoHint` field in each slide object says what each should be).
- `ideological-borders-mu1ufal8-g9de.png` — same problem in the film grid: **all cards render this single image**.
  Each film needs its own 16:9 still.
- `lp-ai-avatar` (the AI panel's 40px circle) is still empty — needs a character portrait.
- No icon set is used. The only glyphs are the text characters ▶ ← →; replace with a real icon library.

## Files
- `Landing Page.dc.html` — the design (template + logic + content arrays). Reference implementation.
- `support.js`, `image-slot.js` — runtime files for the design tool. **Do not port these.** They are included
  only so the HTML opens and renders locally in a browser for review.
- `*.png` — placeholder imagery, as above.

## Before you start: things only the client can answer
1. Brand ownership — "Novastone Learning" in the header vs. "Lipscomb University · College of Education" in the
   footer. Which is the site owner, and are the Lipscomb brand standards binding on it?
2. Real font licensing (Founders Grotesk / Adobe Caslon web licenses — yes or no).
3. The actual ten films: titles, loglines, themes, runtimes, stills, trailer URLs, character rosters.
4. Where trailers are hosted (Vimeo/YouTube/self-hosted) and whether full films are gated.
5. Which LLM backs the character conversations, what each character may and may not know, and how transcripts
   are stored given student-privacy obligations (FERPA).
6. A real faculty testimonial with attribution.
