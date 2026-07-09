/* ============================================================
   KLUTH STUDIOS — MAIN
   UI behaviour. Zero dependencies, no framework.
   All content is pre-rendered at build time by Astro; this file
   only enhances it: telemetry art, preloader, reveals, lap HUD,
   cursor, tilt, clocks, grid overlay.
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- tiny seeded PRNG for the card art ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- tiny DOM helper ---------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  /* ============================================================
     2 · PROCEDURAL TELEMETRY ART (each card unique, from seed)
     ============================================================ */
  function drawTelemetry(canvas) {
    var seed = parseInt(canvas.getAttribute("data-seed") || "1", 10);
    var rnd = mulberry32(seed * 1013 + 77);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth || 300, h = canvas.clientHeight || 190;
    if (w < 4 || h < 4) return;
    canvas.width = w * dpr; canvas.height = h * dpr;
    var x = canvas.getContext("2d");
    if (!x) return;
    x.scale(dpr, dpr);

    var BG = "#0D1512", INK = "#EDEFEA", DIM = "rgba(150,162,154,.55)",
        LINE = "rgba(150,162,154,.16)", SIG = "#E8420E", AMB = "#FFB454";

    x.fillStyle = BG; x.fillRect(0, 0, w, h);

    // faint grid
    x.strokeStyle = LINE; x.lineWidth = 1;
    var step = 26;
    x.beginPath();
    for (var gx = step; gx < w; gx += step) { x.moveTo(gx + 0.5, 0); x.lineTo(gx + 0.5, h); }
    for (var gy = step; gy < h; gy += step) { x.moveTo(0, gy + 0.5); x.lineTo(w, gy + 0.5); }
    x.stroke();

    // ghost index number
    x.fillStyle = "rgba(237,239,234,.05)";
    x.font = "700 " + Math.round(h * 0.9) + "px Archivo, sans-serif";
    x.textBaseline = "middle";
    x.fillText(String(seed % 97).padStart(2, "0"), w * 0.55, h * 0.62);

    // speed trace (smooth seeded wave)
    var harmonics = [];
    for (var i = 0; i < 4; i++) harmonics.push([1 + rnd() * (3 + i * 2), rnd() * Math.PI * 2, (0.5 - rnd()) * 0.9]);
    function trace(t) {
      var v = 0;
      harmonics.forEach(function (hh) { v += Math.sin(t * hh[0] * Math.PI * 2 + hh[1]) * hh[2]; });
      return v / harmonics.length;
    }
    var mid = h * (0.42 + rnd() * 0.14), amp = h * 0.24;
    x.strokeStyle = INK; x.lineWidth = 1.4; x.beginPath();
    for (var px = 0; px <= w; px += 3) {
      var t = px / w, y = mid + trace(t) * amp;
      px === 0 ? x.moveTo(px, y) : x.lineTo(px, y);
    }
    x.stroke();

    // throttle / brake band
    var bandY = h - 26, tt = 0;
    while (tt < 1) {
      var seg = 0.04 + rnd() * 0.16, brake = rnd() > 0.62;
      x.fillStyle = brake ? SIG : AMB;
      x.globalAlpha = brake ? 0.9 : 0.55;
      x.fillRect(tt * w, bandY, Math.max(seg * w - 3, 2), 7);
      tt += seg;
    }
    x.globalAlpha = 1;

    // mini closed circuit, top right
    var cx = w - 52, cy = 44, R = 24;
    x.strokeStyle = DIM; x.lineWidth = 1.3; x.beginPath();
    var pts = 90;
    for (var k = 0; k <= pts; k++) {
      var a = (k / pts) * Math.PI * 2;
      var r = R * (0.72 + 0.28 * Math.sin(a * (2 + Math.floor(rnd() * 2)) + seed) * Math.cos(a * 3 + seed * 0.7));
      var xx = cx + Math.cos(a) * r, yy = cy + Math.sin(a) * r * 0.8;
      k === 0 ? x.moveTo(xx, yy) : x.lineTo(xx, yy);
    }
    x.closePath(); x.stroke();
    x.fillStyle = SIG;
    x.fillRect(cx + R * 0.62, cy - 2, 4, 4); // start/finish

    // corner ticks along bottom trace
    x.fillStyle = DIM;
    x.font = "500 8px 'Martian Mono', monospace";
    var corners = 3 + Math.floor(rnd() * 3);
    for (var c = 0; c < corners; c++) {
      var tx = (0.08 + rnd() * 0.5) * w;
      x.fillRect(tx, bandY - 6, 1, 4);
      x.fillText("T" + (1 + Math.floor(rnd() * 12)), tx - 4, bandY - 10);
    }

    // frame ticks
    x.fillStyle = DIM;
    x.fillText("KS/" + String(seed).padStart(3, "0"), 10, 16);
    x.fillText("Δ " + (rnd() * 2 - 1).toFixed(3), 10, h - 8);
  }

  var artCanvases = [];
  function paintAllArt() { artCanvases.forEach(drawTelemetry); }

  /* ============================================================
     3 · PRELOADER  (waits for fonts + scene, capped)
     ============================================================ */
  function preloader() {
    var box = $("#preloader");
    if (!box) { start(); return; }
    if (reduced) { box.classList.add("done"); document.body.classList.remove("is-loading"); start(); return; }

    var timeEl = $(".pl-time", box), bar = $(".pl-bar i", box);
    var t0 = performance.now(), MIN = 1050, CAP = 2400, assetsDone = false;

    function assetsReady() { assetsDone = true; }
    if (window.KS_SCENE && window.KS_SCENE.ready) assetsReady();
    else document.addEventListener("ks:scene-ready", assetsReady, { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {});

    (function tick() {
      var e = performance.now() - t0;
      var mm = Math.floor(e / 60000), ss = Math.floor(e / 1000) % 60, ms = Math.floor(e % 1000);
      timeEl.textContent = mm + ":" + String(ss).padStart(2, "0") + "." + String(ms).padStart(3, "0");
      var p = Math.min(e / MIN, 1) * (assetsDone ? 1 : 0.9);
      if (e >= CAP) p = 1;
      bar.style.transform = "scaleX(" + p + ")";
      if (p >= 1 && e >= MIN) {
        timeEl.textContent = "Lights out";
        setTimeout(function () {
          box.classList.add("done");
          document.body.classList.remove("is-loading");
          start();
        }, 260);
        return;
      }
      requestAnimationFrame(tick);
    })();
  }

  /* ============================================================
     4 · REVEALS
     ============================================================ */
  function setupReveals() {
    // split marked headings into masked words, preserving inline
    // children (e.g. <span class="serif-i">) as single masked units
    $$(".split").forEach(function (node) {
      var units = [];
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          ch.textContent.split(/\s+/).forEach(function (wd) {
            if (wd) units.push({ text: wd });
          });
        } else if (ch.nodeType === 1) {
          units.push({ node: ch });
        }
      });
      node.textContent = "";
      units.forEach(function (u, i) {
        var mask = el("span", "sr-mask");
        mask.style.display = "inline-block";
        var inner = el("span", "sr-in");
        inner.style.setProperty("--d", (i * 0.05) + "s");
        if (u.node) inner.appendChild(u.node);
        else inner.textContent = u.text;
        if (i < units.length - 1) inner.appendChild(document.createTextNode("\u00A0"));
        mask.appendChild(inner);
        node.appendChild(mask);
      });
    });

    if (!("IntersectionObserver" in window) || reduced) {
      $$("[data-reveal]").forEach(function (n) { n.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -6% 0px" });
    $$("[data-reveal]").forEach(function (n) { io.observe(n); });
  }

  /* ============================================================
     5 · LAP HUD + SCROLL → SCENE
     ============================================================ */
  function setupLap() {
    var run = $("#hud .hud-run"), dot = $("#hud .hud-dot"),
        track = $("#hud .hud-track"), hudBox = $("#hud"),
        secEl = $("#hud-sector"), lapEl = $("#hud-lap");
    var L = 0;
    if (run && run.getTotalLength) {
      L = run.getTotalLength();
      run.style.strokeDasharray = L;
      run.style.strokeDashoffset = L;
    }

    // reference lap: full page = one flying lap (see data-ref-lap on #hud)
    var ref = (hudBox && hudBox.getAttribute("data-ref-lap")) || "6:57.000";
    var m = ref.match(/(\d+):(\d+)\.(\d+)/);
    var REF_MS = m ? (+m[1] * 60 + +m[2]) * 1000 + +m[3] : 417000;

    var sectorAnchors = [];
    function measure() {
      sectorAnchors = ["#studio", "#works", "#capabilities", "#pit"].map(function (s) {
        var n = $(s); return n ? n.offsetTop : 1e9;
      });
    }
    measure();
    window.addEventListener("resize", debounce(function () { measure(); paintAllArt(); }, 180), { passive: true });

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var p = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;

        if (window.KS_SCENE) window.KS_SCENE.setProgress(p);
        if (hudBox) hudBox.classList.toggle("lap-done", p > 0.996);

        if (L && run) {
          run.style.strokeDashoffset = L * (1 - p);
          var pt = run.getPointAtLength(L * p);
          dot.setAttribute("cx", pt.x); dot.setAttribute("cy", pt.y);
        }
        if (lapEl) {
          var ms = Math.round(p * REF_MS);
          var mm2 = Math.floor(ms / 60000), ss2 = Math.floor(ms / 1000) % 60, mmm = ms % 1000;
          lapEl.textContent = mm2 + ":" + String(ss2).padStart(2, "0") + "." + String(mmm).padStart(3, "0");
        }
        if (secEl) {
          var y = window.scrollY + window.innerHeight * 0.5, s = 0;
          sectorAnchors.forEach(function (a, i) { if (y >= a) s = i + 1; });
          secEl.textContent = "S" + Math.max(1, Math.min(4, s || 1)) + " / 4";
        }
        headerOnScroll();
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- header hide/show ---------- */
  var lastY = 0;
  function headerOnScroll() {
    var head = $("#site-head");
    if (!head) return;
    var y = window.scrollY;
    if (y > 140 && y > lastY + 4) head.classList.add("is-hidden");
    else if (y < lastY - 4 || y < 140) head.classList.remove("is-hidden");
    lastY = y;
  }

  /* ============================================================
     6 · CURSOR + POINTER PARALLAX
     ============================================================ */
  function setupPointer() {
    var cur = $("#cursor");
    var cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;

    window.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (window.KS_SCENE) {
        window.KS_SCENE.setPointer((e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2);
      }
    }, { passive: true });

    if (!cur || coarse || reduced) return;

    var label = $(".c-label", cur);
    (function move() {
      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
      cur.style.transform = "translate3d(" + cx + "px," + cy + "px,0)";
      requestAnimationFrame(move);
    })();

    document.addEventListener("mouseover", function (e) {
      var t = e.target.closest("a, button, [data-cursor]");
      if (t) {
        cur.classList.add("is-link");
        label.textContent = t.getAttribute("data-cursor") || "open";
      } else cur.classList.remove("is-link");
    });
    document.addEventListener("mousedown", function () { cur.classList.add("is-down"); });
    document.addEventListener("mouseup", function () { cur.classList.remove("is-down"); });
  }

  /* ============================================================
     7 · CARD TILT
     ============================================================ */
  function setupTilt() {
    if (coarse || reduced) return;
    document.addEventListener("mousemove", function (e) {
      var card = e.target.closest(".card:not(.card--reserved)");
      $$(".card.is-tilt").forEach(function (c) {
        if (c !== card) { c.classList.remove("is-tilt"); c.style.transform = ""; }
      });
      if (!card) return;
      var r = card.getBoundingClientRect();
      var rx = ((e.clientY - r.top) / r.height - 0.5) * -5;
      var ry = ((e.clientX - r.left) / r.width - 0.5) * 6;
      card.classList.add("is-tilt");
      card.style.transform = "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) translateY(-3px)";
    }, { passive: true });
    document.addEventListener("mouseout", function (e) {
      var card = e.target.closest(".card");
      if (card && !card.contains(e.relatedTarget)) { card.classList.remove("is-tilt"); card.style.transform = ""; }
    });
  }

  /* ============================================================
     8 · CLOCKS, GRID OVERLAY, MISC
     ============================================================ */
  function setupClock() {
    var els = $$("[data-clock]");
    if (!els.length) return;
    function tick() {
      var d = new Date();
      var off = -d.getTimezoneOffset() / 60;
      var s = String(d.getHours()).padStart(2, "0") + ":" +
              String(d.getMinutes()).padStart(2, "0") + ":" +
              String(d.getSeconds()).padStart(2, "0") +
              " UTC" + (off >= 0 ? "+" : "") + off;
      els.forEach(function (n) { n.textContent = s; });
    }
    tick(); setInterval(tick, 1000);
  }

  function setupGridOverlay() {
    var ov = $("#grid-overlay");
    if (!ov) return;
    for (var i = 0; i < 12; i++) ov.appendChild(el("i"));
    document.addEventListener("keydown", function (e) {
      if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey && !e.altKey &&
          !/input|textarea|select/i.test(document.activeElement.tagName)) {
        document.body.classList.toggle("show-grid");
      }
    });
  }

  function debounce(fn, ms) {
    var t; return function () { clearTimeout(t); var a = arguments, c = this;
      t = setTimeout(function () { fn.apply(c, a); }, ms); };
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function start() {
    // reveal hero after the preloader lifts
    var hero = $("#hero");
    if (hero) setTimeout(function () { hero.classList.add("is-in"); }, 80);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.body.classList.add("is-loading");
    artCanvases = $$("canvas[data-telemetry]");
    paintAllArt();
    setupReveals();
    setupLap();
    setupPointer();
    setupTilt();
    setupClock();
    setupGridOverlay();
    var yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
    preloader();
  });
})();
