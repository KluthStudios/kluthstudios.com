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
.github/workflows/deploy.yml  GitHub Pages workflow — NOT the live deploy path
```

## Add a project

Edit `src/data/site.ts`, append an object to `projects`, save — the dev
server hot-reloads and the types refuse anything malformed at build time.
Cards, numbering, and the generated telemetry artwork all derive from it.
Field-by-field reference with an annotated snippet: **/guide/ § 03**.

## Deploy

Cloudflare Workers serves the static `dist/` output using `wrangler.jsonc`.
Build with Node 24 using `npm ci && npm test`. Cloudflare Builds is connected to
this repository with `main` as the production branch and `npm test` as the build
command. Production builds are paused until the migration branch is merged;
then re-enable them in the Worker's Builds settings and verify a deployment.
Branch previews are enabled. The current production deployment was uploaded
with Wrangler and is available on the Worker's workers.dev address.

Cloudflare Worker custom domains serve `kluthstudios.com` and
`www.kluthstudios.com` directly. The earlier Worker routes remain configured on
both hostnames; there is no longer a Hostinger website origin to fall back to.
Cloudflare Email Routing forwards the domain's catch-all to the verified inbox.
Preserve its MX and authentication records when changing DNS.

`.github/workflows/deploy.yml` targets GitHub Pages and is **not** the live
deploy path. Pages has never been enabled on the repo, so that workflow fails on
every push; the red X is expected and does not mean the site is down. Don't
enable Pages as part of this deployment.
`public/CNAME` is a leftover from the same assumption.

To confirm what is actually live, compare the built asset hash against `dist/`:

```bash
curl -s https://kluthstudios.com | grep -o '/_astro/[^"]*\.css'
ls dist/_astro/
```

The build output is plain HTML + CSS + three classic scripts, so it runs on any
static host if the hosting ever moves.

## Honest notes

- The Traumrunde repo is **private** right now — its "View repository" button
  will 404 for the public until the repo is made public.
- `hello@kluthstudios.com` is a **placeholder** — set the real inbox once in
  `src/data/site.ts`.

## Easter eggs

Press **G** for the 12-column layout grid. The full page scroll maps to a
6:57.000 reference lap on the HUD — the time locks in amber when you cross
the line.
