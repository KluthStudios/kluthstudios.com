# CLAUDE.md

Guidance for Claude Code when working in this repo. Read `README.md` and the
on-site build guide (`src/pages/guide/index.astro`, served at `/guide/`) for the
full walkthrough — this file covers orientation, conventions, and open notes.

## What this is

`kluthstudios.com` — the Kluth Studios portfolio. A static **Astro** site themed
as one continuous racing lap "dawn to night": scrolling drives a fixed WebGL
landscape through dawn → dusk → night, a lap-timer HUD ticks sectors S1–S4, and
the whole page maps to a 6:57.000 reference lap. Hand-written, **zero client-side
framework**, compiled to pure static HTML. Only runtime JS is three hand-written
scripts + three.js r128.

## Commands

```bash
npm run dev       # astro dev — http://localhost:4321, hot reload
npm run build     # astro check (types) then astro build → dist/
npm run preview   # serve the production build
npm test          # build+types, html-validate, smoke, reduced-motion passes
```

`astro dev` runs as a background daemon: `npx astro dev status` / `... stop`.

## Layout of the code

- `src/data/site.ts` — **the data file.** Studio info + `projects` / `capabilities`
  arrays. Cards, numbering, and telemetry art are generated from it at build time.
  Adding a project = append an object here (see `/guide/` § 03).
- `src/pages/index.astro` — the lap (homepage); composes the components.
- `src/pages/guide/index.astro` — build guide; **paper theme, no JS**.
- `src/pages/{terms,privacy,disclaimer}.md` — legal docs; use `Legal.astro`.
- `src/layouts/Base.astro` — head/meta/fonts/global CSS + body slot. Props:
  `title, description, path, bodyClass?, themeColor?, noindex?`.
- `src/layouts/Legal.astro` — paper legal layout (sets `bodyClass="legal-body"`).
- `src/components/*.astro` — Header, Hero, Hud, Studio, Works, Capabilities, Pit
  (footer), Gate, GridOverlay, Preloader, Cursor, Mark.
- `src/styles/main.css` — the entire design system, in numbered sections.
- `public/js/` — `scene.js` (WebGL dawn→night), `main.js` (HUD/reveals/cursor/
  procedural card art), `three.min.js` (r128, only runtime dep).
- `public/fonts/*.woff2` — self-hosted, subset (no CDN, no trackers).

## Design system (match these when editing)

All tokens live in `:root` in `main.css`. Palette: `--nebel` (paper), `--tanne`
(ink), `--nacht` (night), `--moos`/`--asche` (quiet text on paper/night),
`--signal`/`--signal-ink` (marshal red; `-ink` is the AA-safe on-paper variant),
`--amber`, `--line-l`/`--line-d` (hairlines). Fonts: `--f-disp` Archivo (variable
width axis, used at `wdth` 100–125), `--f-serif` Instrument Serif (italic accents),
`--f-mono` Martian Mono. Spacing off `--gutter`.

Conventions:
- **Paper vs night.** Guide + legal pages are light "paper" (`body.legal-body` /
  the guide's own block). The lap is dark.
- **`mix-blend-mode: difference`** on `#site-head` and the `#hud` lap timer —
  they invert against whatever's behind, so they read on any scene color.
- **Big display headings** (hero wordmark, section titles, pit CTA) use the
  Archivo width axis + `clamp(min, vw, max)` sizing. They clip off the right on
  wide screens if `wdth`/size are too aggressive. When tuning, verify fit by
  measuring **glyph ink width vs container width**, not the block box — these
  headings are block-level and fill their column, so `getBoundingClientRect()` on
  the element is misleading; use a `Range` over the text (or `scrollWidth` vs
  `clientWidth`) instead.
- **Hero block alignment.** `#hero` is a flex column; `.wrap`'s `margin-inline:
  auto` would shrink-wrap and center it. `#hero > .wrap` overrides that to
  left-align to the gutter.

## Gotchas

- **Automated screenshots of the lap hang.** The homepage runs a continuous
  WebGL render loop plus an infinite film-grain CSS animation, so the page never
  goes idle and screenshot capture can time out. Prefer verifying layout by
  measuring geometry in the page (`getBoundingClientRect`, glyph ink width) over
  relying on screenshots. Legal/guide (paper) pages capture fine.
- `hello@kluthstudios.com` in `src/data/site.ts` is a **placeholder** inbox.
- The Traumrunde "View repository" link points at a currently-private repo.

## Deploy

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`) builds with
Astro and deploys to GitHub Pages. `public/CNAME` binds `kluthstudios.com`.

## Notes / follow-ups

- **HUD overlap on inner sections (resolved).** The fixed lap HUD (`#hud`,
  bottom-left, `mix-blend-mode: difference`) overlaid body copy in Studio / Works
  / Capabilities / Pit as you scroll — measured at **38 distinct text elements**,
  most at the HUD's full 172px width. Fixed two different ways above and below
  700px, because the HUD is a different object at each size.

  Measurement killed two of the options that had been discussed: because the HUD
  is *fixed* while copy scrolls through its band, **shrinking or moving it barely
  helps** (compact form 38 → 37 collisions; moved bottom-right 38 → 27). Bottom
  padding only rescues sections pinned to the viewport bottom (`#hero`) or the
  page end — which is why the hero's "pit-lane" strip worked there and nowhere
  else. Only *horizontal* separation actually fixes it.

  **Fix ≥701px — reserve the lane.** `--hud-w` / `--hud-lane` tokens in `:root`,
  and the inner sections' `> .wrap` indents `calc(var(--gutter) + var(--hud-lane))`
  so the HUD gets a reserved left instrument rail (§ 20 of `main.css`). Body-copy
  collisions are now **0**, with ~28px clearance. The rule is capped at 2079px
  because `.wrap` is `max-width: 1680px` and centred — past that the column drifts
  clear on its own. `#hero` keeps gutter alignment (title card), gates stay
  centred, and `#pit` no longer needs its 200px HUD cool-down zone.

  **Fix ≤700px — dock it as chrome.** A rail is impossible at phone widths, so
  the HUD stops floating: the track map drops, and it becomes a full-bleed bottom
  telemetry strip (§ 17 media block). `mix-blend-mode` **must** go to `normal`
  here — blended against its own backdrop it inverts the copy passing underneath,
  which is the collision being fixed. A `blur(14px) brightness(.6)` backdrop
  (solid `rgba(10,16,14,.84)` fallback via `@supports`) keeps it legible across
  the whole dawn → night range; verified against both paper and night sections.
  Copy now scrolls *under* opaque chrome instead of through it, and `#pit`'s
  4.5rem bottom padding leaves ~40px clearance at rest.

  Sizing constraint for that strip: all three readouts need **424px** (384px of
  type + gutters), so `≤480px` hides the static TRACK figure and keeps the live
  SECTOR / LAP pair, which needs only 309px and fits a 320px phone. If you ever
  restyle the strip, re-check that number before un-hiding TRACK.

  Still unresolved: the huge `.gate-word` outline type ("Sector 02/04") crosses
  the HUD, since it is centred and nearly fills the column — indenting it moves
  it ~1px. Left as a deliberate full-bleed moment.

  When re-measuring this: `html` has `scroll-behavior: smooth`, so a synchronous
  `scrollTo` + immediate read reports `scrollY` 0 — set `scrollBehavior='auto'`
  first. `body.is-loading` (preloader) also locks scroll with `overflow: hidden`.
  And measure **glyph ink via a `Range`**, not `getBoundingClientRect()` — the
  centred gate paragraphs report full-column boxes and produce false positives.
