/* PASS 2 on the Astro build:
   A) static assertions — content must exist BEFORE any JS runs
   B) runtime boot — classic scripts enhance the pre-rendered HTML */
const fs = require("fs");
const { JSDOM } = require("jsdom");
const html = fs.readFileSync("dist/index.html", "utf8");

let errors = [];
const A = (c, m) => c ? console.log("  ✓ " + m) : errors.push(m);

/* ---------- A · static (JS disabled) ---------- */
{
  const d = new JSDOM(html).window.document;
  A(d.querySelector("#feat-slot .feat"), "static: featured card pre-rendered");
  A(/Traumrunde/.test(d.querySelector(".feat-title").textContent), "static: featured is Traumrunde");
  A(d.querySelectorAll("#works-grid .card").length === 3, "static: 3 grid cards pre-rendered");
  A(d.querySelectorAll(".card--reserved").length === 2, "static: 2 reserved slots pre-rendered");
  A(d.querySelectorAll("#cap-list .cap").length === 4, "static: 4 capability rows pre-rendered");
  A(d.querySelector('a.card[href="guide/"]'), "static: this-site card links to guide/");
  A(d.querySelector('.feat-links a[href*="traumrunde"]'), "static: repo link present");
  A(d.querySelector('.feat-top .mono, .feat-top')?.textContent.includes("001"), "static: numbering starts 001");
  A(d.querySelector("#hud").getAttribute("data-ref-lap") === "6:57.000", "static: HUD carries reference lap");
  A(d.querySelectorAll("canvas[data-telemetry][data-seed]").length === 2, "static: telemetry seeds in markup");
  A(d.querySelector('meta[name="generator"]')?.content.includes("Astro"), "static: Astro generator meta");
  A(d.querySelector('link[rel="canonical"]')?.href === "https://kluthstudios.com/", "static: canonical URL");
}

/* ---------- B · runtime boot (classic scripts, no WebGL) ---------- */
{
  const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "https://kluthstudios.com/" });
  const { window } = dom;
  window.matchMedia = q => ({ matches: false, media: q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  window.addEventListener("error", e => errors.push("runtime error: " + e.message));
  for (const f of ["public/js/scene.js", "public/js/main.js"]) { // no three → no-webgl path
    try { window.eval(fs.readFileSync(f, "utf8")); } catch (e) { errors.push(f + ": " + e.message); }
  }
  window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));
  window.dispatchEvent(new window.Event("scroll"));
  const d = window.document;
  A(d.body.classList.contains("no-webgl"), "runtime: no-WebGL fallback engaged");
  A(window.KS_SCENE && window.KS_SCENE.ready, "runtime: KS_SCENE ready without WebGL");
  A(d.querySelectorAll(".manifesto .sr-mask").length >= 6, "runtime: manifesto split into masked words");
  A(d.querySelectorAll(".manifesto .serif-i").length === 2, "runtime: split preserved serif accents");
  A(d.querySelectorAll("[data-reveal].is-in").length === d.querySelectorAll("[data-reveal]").length, "runtime: no-IO fallback revealed all targets");
  A(/^S[1-4] \/ 4$/.test(d.getElementById("hud-sector").textContent), "runtime: sector readout " + d.getElementById("hud-sector").textContent);
  A(/^\d+:\d{2}\.\d{3}$/.test(d.getElementById("hud-lap").textContent), "runtime: lap timer " + d.getElementById("hud-lap").textContent);
  A(d.getElementById("grid-overlay").children.length === 12, "runtime: grid overlay built");
  A(/\d{2}:\d{2}:\d{2}/.test(d.querySelector("[data-clock]").textContent), "runtime: clock ticking");
  A(d.getElementById("year").textContent === String(new Date().getFullYear()), "runtime: year current");
}

if (errors.length) { console.error("\nFAILURES:"); errors.forEach(e => console.error("  ✗ " + e)); process.exit(1); }
console.log("\nDIST SMOKE PASS — static + runtime green");
process.exit(0);
