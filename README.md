# kluthstudios.com

The Kluth Studios portfolio — one continuous lap from dawn to night.
Authored as **Astro** components, compiled to pure static HTML.
Zero client-side framework, no stock assets; the only runtime JS is three
small hand-written scripts (the WebGL scene, the lap HUD, the flourishes).

**Full walkthrough (concept, design system, deploy, editing): open `/guide/` on the site.**

## Run it

```bash
npm install
npm run dev       # http://localhost:4321  — hot reload
npm run build     # type-checks (astro check), then builds to dist/
npm run preview   # serve the production build locally
npm test          # the four QA passes: build+types, validate, smoke, reduced-motion
```

## Structure

```
src/
  pages/index.astro         the lap
  pages/guide/index.astro   how it was built + how to extend it (no JS)
  pages/404.astro           gravel trap
  layouts/Base.astro        head, meta, fonts, global CSS
  components/*.astro        Header, Hud, Hero, Studio, Gate, Works, …
  data/site.ts              ★ SITE DATA — the only file to edit for a new project
  styles/main.css           the whole design system
public/
  js/scene.js               WebGL dawn→night scene (classic script)
  js/main.js                HUD, reveals, cursor, procedural card art
  js/three.min.js           three.js r128 (MIT) — only runtime dependency
  fonts/*.woff2             Archivo, Instrument Serif, Martian Mono (OFL, subset)
  favicon.svg · og.png · CNAME · robots.txt
.github/workflows/deploy.yml  push to main → build → GitHub Pages
```

## Add a project

Edit `src/data/site.ts`, append an object to `projects`, save — the dev
server hot-reloads and the types refuse anything malformed at build time.
Cards, numbering, and the generated telemetry artwork all derive from it.
Field-by-field reference with an annotated snippet: **/guide/ § 03**.

## Deploy to kluthstudios.com (≈10 min, then automatic forever)

1. Push this repo to GitHub, e.g. `KluthStudios/kluthstudios.com` (branch `main`).
2. Repo → Settings → Pages → Source: **GitHub Actions**.
   The included workflow builds and deploys on every push from then on.
3. DNS at the registrar: apex `A` records → `185.199.108.153`, `.109.153`,
   `.110.153`, `.111.153`; `www` CNAME → `kluthstudios.github.io`.
4. Settings → Pages → Custom domain `kluthstudios.com` → wait for check →
   Enforce HTTPS. (`public/CNAME` keeps the domain bound across deploys.)

Netlify / Vercel / Cloudflare Pages also work: connect the repo, accept the
auto-detected Astro defaults (`npm run build`, output `dist`), attach the domain.

## Honest notes

- The Traumrunde repo is **private** right now — its "View repository" button
  will 404 for the public until the repo is made public.
- `hello@kluthstudios.com` is a **placeholder** — set the real inbox once in
  `src/data/site.ts`.

## Easter eggs

Press **G** for the 12-column layout grid. The full page scroll maps to a
6:57.000 reference lap on the HUD — the time locks in amber when you cross
the line.
