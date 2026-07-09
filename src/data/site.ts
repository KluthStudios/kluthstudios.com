/* ============================================================
   KLUTH STUDIOS — SITE DATA
   ------------------------------------------------------------
   This is the only file you need to touch to add a project.
   Append an object to `projects` below and rebuild. Cards,
   numbering, telemetry art and layout are generated from it —
   at build time, as static HTML.
   Full instructions: /guide  (§ 03 — Adding a project)
   ============================================================ */

export interface ProjectLink {
  label: string;
  href: string;
}

export interface Project {
  /** "featured" = spotlight card · "card" = grid card · "reserved" = redacted slot */
  kind: 'featured' | 'card' | 'reserved';
  id: string;
  title?: string;
  kicker?: string;
  year?: string;
  type?: string;
  status?: string;
  desc?: string;
  tags?: string[];
  /** featured cards only — [label, value] pairs */
  stats?: [string, string][];
  links?: ProjectLink[];
  /** any integer — drives the generated telemetry artwork.
      Change it until you like the card's waveform. */
  seed?: number;
  /** reserved slots only */
  eta?: string;
}

export interface Capability {
  title: string;
  note: string;
  tags: string[];
}

export const studio = {
  name: 'Kluth Studios',
  est: 'MMXXVI',
  base: 'United States',
  heart: 'Eifel, DE',
  coords: 'N50.3356° · E6.9647°', // Nürburgring GP-Strecke, roughly
  contact: 'hello@kluthstudios.com', // ← placeholder, set your real inbox
  github: 'https://github.com/KluthStudios',
  referenceLap: '6:57.000', // full page scroll ≈ one flying lap
} as const;

export const projects: Project[] = [
  {
    kind: 'featured',
    id: 'traumrunde',
    title: 'Traumrunde',
    kicker: 'The dream lap, playable',
    year: '2026',
    type: 'Driving simulation',
    status: 'Private beta',
    desc: 'A browser-native Nürburgring driving sim built as one obsessive prototype: bespoke vehicle physics, a flat-six soundtrack synthesised live in WebAudio, multiple broadcast-style cameras and a fully modelled GT car — no engine, no plugins, one file of hand-written Three.js.',
    tags: ['Three.js', 'Custom physics', 'WebAudio synthesis', 'Camera systems', 'Zero dependencies'],
    stats: [
      ['Track', 'Nordschleife'],
      ['Engine', 'None — hand-rolled'],
      ['Audio', 'Procedural flat-six'],
      ['Build', 'Single file'],
    ],
    links: [{ label: 'View repository', href: 'https://github.com/KluthStudios/traumrunde' }],
    seed: 19,
  },
  {
    kind: 'card',
    id: 'this-site',
    title: 'kluthstudios.com',
    kicker: 'This very website',
    year: '2026',
    type: 'Interactive portfolio',
    status: 'You are here',
    desc: 'One continuous lap from dawn to night: a scroll-driven WebGL landscape, a live lap-timer HUD, self-hosted variable fonts and procedural card art — authored as Astro components, compiled to pure static HTML, zero client-side framework.',
    tags: ['Astro', 'WebGL / GLSL', 'Variable fonts', 'Procedural art'],
    links: [{ label: 'Read the build guide', href: 'guide/' }],
    seed: 4,
  },
  {
    kind: 'reserved',
    id: 'slot-002',
    eta: 'In development — S2 2026',
  },
  {
    kind: 'reserved',
    id: 'slot-003',
    eta: 'Slot reserved — pitch us',
  },
];

export const capabilities: Capability[] = [
  {
    title: 'Game prototypes & mechanics',
    note: 'Where we started. Feel-first playable prototypes that answer the only question that matters: is it fun in the hand?',
    tags: ['Vehicle dynamics', 'Game feel', 'Rapid iteration'],
  },
  {
    title: 'Realtime 3D for the web',
    note: 'Simulation, product visualisation and interactive scenes that run in a browser tab — no installs, no engine tax.',
    tags: ['Three.js / WebGL', 'GLSL shaders', 'Performance budgets'],
  },
  {
    title: 'Interfaces & interactive design',
    note: 'Sites and interfaces with an actual point of view — typography, motion and systems thinking doing real work together.',
    tags: ['Design systems', 'Motion design', 'Typography'],
  },
  {
    title: 'Tools, pipelines & automation',
    note: 'The unglamorous multipliers: internal tools, scripts and pipelines that let small teams ship like bigger ones.',
    tags: ['Internal tools', 'Scripting', 'CI & handoff docs'],
  },
];
