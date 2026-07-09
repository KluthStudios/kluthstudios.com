/* ============================================================
   KLUTH STUDIOS — SCENE
   One fixed WebGL canvas behind the whole page.
   Scroll position drives uCycle (0 = dawn … 1 = night):
   sky, fog, terrain and the ribbon all interpolate through
   three keyframed palettes. Requires three.min.js (r128).
   ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("scene");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.KS_SCENE = { ready: false, ok: false, setProgress: function () {}, setPointer: function () {} };

  if (!canvas || typeof THREE === "undefined") { fail(); return; }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch (e) { fail(); return; }
  if (!renderer.getContext()) { fail(); return; }

  function fail() {
    document.body.classList.add("no-webgl");
    window.KS_SCENE.ready = true;
    document.dispatchEvent(new Event("ks:scene-ready"));
  }

  /* ---------- shared noise (GLSL + JS twins, keep in sync) ---------- */
  var NOISE_GLSL = [
    "float ksHash(vec2 p){ return fract(sin(p.x*127.1 + p.y*311.7)*43758.5453); }",
    "float ksNoise(vec2 p){",
    "  vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.0-2.0*f);",
    "  float a=ksHash(i), b=ksHash(i+vec2(1.,0.)), c=ksHash(i+vec2(0.,1.)), d=ksHash(i+vec2(1.,1.));",
    "  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);",
    "}",
    "float ksHeight(vec2 xz){",
    "  float f=0.06;",
    "  float h = ksNoise(xz*f)*0.62 + ksNoise(xz*f*2.17 + vec2(11.3,7.1))*0.38;",
    "  float y = (h-0.45)*6.8;",
    "  y *= 1.0 - smoothstep(-8.0, 6.0, xz.y);", // flatten toward camera
    "  return y;",
    "}"
  ].join("\n");

  function jsHash(x, y) { var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function jsNoise(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    var a = jsHash(ix, iy), b = jsHash(ix + 1, iy), c = jsHash(ix, iy + 1), d = jsHash(ix + 1, iy + 1);
    return (a + (b - a) * ux) + ((c + (d - c) * ux) - (a + (b - a) * ux)) * uy;
  }
  function jsHeight(x, z) {
    var f = 0.06;
    var h = jsNoise(x * f, z * f) * 0.62 + jsNoise(x * f * 2.17 + 11.3, z * f * 2.17 + 7.1) * 0.38;
    var y = (h - 0.45) * 6.8;
    var t = Math.min(Math.max((z + 8) / 14, 0), 1); // smoothstep(-8, 6, z)
    y *= 1 - t * t * (3 - 2 * t);
    return y;
  }

  /* ---------- palettes: dawn (0) → dusk (.55) → night (1) ---------- */
  function C(hex) { return new THREE.Color(hex); }
  var PAL = {
    sky:     [C(0xEDEFEA), C(0x39443D), C(0x080D0B)],
    horizon: [C(0xE4E9DF), C(0xD08A4A), C(0x15211B)],
    hi:      [C(0xCBD4C7), C(0x556257), C(0x131D18)],
    lo:      [C(0x83948A), C(0x1E2A24), C(0x050907)],
    line:    [C(0xE8420E), C(0xFF5A19), C(0xFF7A2E)],
    mote:    [C(0xFFFFFF), C(0xFFD9A0), C(0xFFB454)]
  };
  var LINE_GLOW = [0.5, 1.0, 1.7];
  var MOTE_A    = [0.5, 0.32, 0.75];
  var CONTOUR   = [0.16, 0.10, 0.05];

  function lerpStops(colors, t, target) {
    // stops at 0 / .55 / 1
    if (t <= 0.55) { target.copy(colors[0]).lerp(colors[1], t / 0.55); }
    else { target.copy(colors[1]).lerp(colors[2], (t - 0.55) / 0.45); }
    return target;
  }
  function lerpNum(vals, t) {
    return t <= 0.55 ? vals[0] + (vals[1] - vals[0]) * (t / 0.55)
                     : vals[1] + (vals[2] - vals[1]) * ((t - 0.55) / 0.45);
  }

  /* ---------- renderer / scene / camera ---------- */
  var DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(DPR);
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(52, 1, 0.1, 260);
  camera.position.set(0, 6.8, 16);

  var uniforms = {
    uTime:    { value: 0 },
    uSky:     { value: C(0xEDEFEA) },
    uHorizon: { value: C(0xE4E9DF) },
    uHi:      { value: C(0xCBD4C7) },
    uLo:      { value: C(0x83948A) },
    uContour: { value: 0.16 }
  };

  /* ---------- terrain ---------- */
  var terrainGeo = new THREE.PlaneGeometry(200, 130, 156, 100);
  var terrainMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: [
      NOISE_GLSL,
      "varying vec3 vW; varying float vH;",
      "void main(){",
      "  vec3 p = position;",                         // plane lies in XY before rotation
      "  vec4 w = modelMatrix * vec4(p, 1.0);",
      "  float y = ksHeight(vec2(w.x, w.z));",
      "  w.y += y; vH = y; vW = w.xyz;",
      "  gl_Position = projectionMatrix * viewMatrix * w;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "varying vec3 vW; varying float vH;",
      "uniform vec3 uSky, uHorizon, uHi, uLo; uniform float uContour;",
      "void main(){",
      "  float hMix = smoothstep(-3.4, 3.6, vH);",
      "  vec3 col = mix(uLo, uHi, hMix);",
      "  float c = smoothstep(0.46, 0.5, fract(vH * 1.6)) * smoothstep(0.54, 0.5, fract(vH * 1.6));",
      "  col = mix(col, uHi * 1.12, c * uContour * 4.0);",
      "  float d = length(vW - vec3(0.0, 6.8, 16.0));",
      "  float fog = smoothstep(26.0, 95.0, d);",
      "  col = mix(col, uHorizon, fog * 0.85);",
      "  col = mix(col, uSky, smoothstep(70.0, 130.0, d));",
      "  gl_FragColor = vec4(col, 1.0);",
      "}"
    ].join("\n")
  });
  var terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.set(0, 0, -28);
  scene.add(terrain);

  /* ---------- the dream-lap ribbon ---------- */
  var ctrl = [
    [-26, -14], [-31, -26], [-22, -40], [-27, -52], [-12, -57],
    [4, -50], [-2, -38], [10, -30], [24, -37], [30, -25],
    [21, -15], [6, -18], [-8, -12]
  ].map(function (p) {
    return new THREE.Vector3(p[0], jsHeight(p[0], p[1]) + 0.55, p[1]);
  });
  var curve = new THREE.CatmullRomCurve3(ctrl, true, "centripetal", 0.6);
  var ribbonGeo = new THREE.TubeGeometry(curve, 480, 0.16, 10, true);
  var ribbonUniforms = {
    uTime: uniforms.uTime,
    uLine: { value: C(0xE8420E) },
    uGlow: { value: 0.5 }
  };
  var ribbonMat = new THREE.ShaderMaterial({
    uniforms: ribbonUniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: [
      "varying vec2 vUv; varying vec3 vN; varying vec3 vV;",
      "void main(){",
      "  vUv = uv;",
      "  vec4 w = modelMatrix * vec4(position, 1.0);",
      "  vN = normalize(mat3(modelMatrix) * normal);",
      "  vV = normalize(cameraPosition - w.xyz);",
      "  gl_Position = projectionMatrix * viewMatrix * w;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "varying vec2 vUv; varying vec3 vN; varying vec3 vV;",
      "uniform float uTime, uGlow; uniform vec3 uLine;",
      "void main(){",
      "  float dash = smoothstep(0.42, 0.5, fract(vUv.x * 46.0 - uTime * 0.55));",
      "  dash *= smoothstep(0.62, 0.54, fract(vUv.x * 46.0 - uTime * 0.55));",
      "  float rim = pow(1.0 - abs(dot(vN, vV)), 1.6);",
      "  float a = clamp(dash * 0.9 + rim * 0.55, 0.0, 1.0) * clamp(uGlow, 0.2, 2.0);",
      "  vec3 col = uLine * (0.75 + uGlow * 0.6 * (dash + rim * 0.4));",
      "  gl_FragColor = vec4(col, clamp(a, 0.0, 0.95));",
      "}"
    ].join("\n")
  });
  var ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
  scene.add(ribbon);

  // start/finish beacon
  var sfGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6);
  var sfMat = new THREE.MeshBasicMaterial({ color: 0xE8420E, transparent: true, opacity: 0.9 });
  var sf = new THREE.Mesh(sfGeo, sfMat);
  var sfPos = curve.getPointAt(0);
  sf.position.set(sfPos.x, sfPos.y + 1.3, sfPos.z);
  scene.add(sf);

  /* ---------- fog motes ---------- */
  var MOTES = 340;
  var moteGeo = new THREE.BufferGeometry();
  var mpos = new Float32Array(MOTES * 3);
  var mrnd = new Float32Array(MOTES);
  for (var i = 0; i < MOTES; i++) {
    mpos[i * 3]     = (Math.random() - 0.5) * 120;
    mpos[i * 3 + 1] = Math.random() * 16 - 1;
    mpos[i * 3 + 2] = -Math.random() * 90 + 12;
    mrnd[i] = Math.random();
  }
  moteGeo.setAttribute("position", new THREE.BufferAttribute(mpos, 3));
  moteGeo.setAttribute("aRnd", new THREE.BufferAttribute(mrnd, 1));
  var moteUniforms = {
    uTime: uniforms.uTime,
    uMote: { value: C(0xFFFFFF) },
    uAlpha: { value: 0.5 },
    uPx: { value: DPR }
  };
  var moteMat = new THREE.ShaderMaterial({
    uniforms: moteUniforms,
    transparent: true, depthWrite: false,
    vertexShader: [
      "attribute float aRnd; varying float vR;",
      "uniform float uTime, uPx;",
      "void main(){",
      "  vR = aRnd;",
      "  vec3 p = position;",
      "  p.y += sin(uTime * 0.12 + aRnd * 6.28) * 1.4;",
      "  p.x += cos(uTime * 0.07 + aRnd * 6.28) * 2.0;",
      "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
      "  gl_PointSize = (36.0 * (aRnd * 0.8 + 0.4)) * uPx / max(1.0, -mv.z * 0.16);",
      "  gl_Position = projectionMatrix * mv;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "varying float vR; uniform vec3 uMote; uniform float uAlpha;",
      "void main(){",
      "  float d = length(gl_PointCoord - 0.5);",
      "  float a = smoothstep(0.5, 0.05, d) * uAlpha * (0.25 + vR * 0.55);",
      "  gl_FragColor = vec4(uMote, a);",
      "}"
    ].join("\n")
  });
  scene.add(new THREE.Points(moteGeo, moteMat));

  /* ---------- state / loop ---------- */
  var progress = 0, progressTarget = 0;
  var px = 0, py = 0, pxT = 0, pyT = 0;
  var clock = new THREE.Clock();
  var needsFrame = true;
  var hidden = false;

  var tmp = new THREE.Color();

  function applyCycle(t) {
    lerpStops(PAL.sky, t, uniforms.uSky.value);
    lerpStops(PAL.horizon, t, uniforms.uHorizon.value);
    lerpStops(PAL.hi, t, uniforms.uHi.value);
    lerpStops(PAL.lo, t, uniforms.uLo.value);
    lerpStops(PAL.line, t, ribbonUniforms.uLine.value);
    lerpStops(PAL.mote, t, moteUniforms.uMote.value);
    uniforms.uContour.value = lerpNum(CONTOUR, t);
    ribbonUniforms.uGlow.value = lerpNum(LINE_GLOW, t);
    moteUniforms.uAlpha.value = lerpNum(MOTE_A, t);
    sfMat.opacity = 0.55 + t * 0.45;
    renderer.setClearColor(lerpStops(PAL.sky, t, tmp));
  }

  function resize() {
    var w = canvas.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < 760 ? 62 : 52;
    camera.updateProjectionMatrix();
    needsFrame = true;
  }

  function frame() {
    var dt = Math.min(clock.getDelta(), 0.05);
    if (!reduced) uniforms.uTime.value += dt;

    progress += (progressTarget - progress) * (reduced ? 1 : 0.06);
    px += (pxT - px) * 0.05;
    py += (pyT - py) * 0.05;

    applyCycle(progress);

    camera.position.x = px * 1.7;
    camera.position.y = 6.8 + py * -0.9 + (reduced ? 0 : Math.sin(uniforms.uTime.value * 0.18) * 0.22);
    camera.lookAt(px * 3.4, 1.6, -30);

    renderer.render(scene, camera);
  }

  function loop() {
    if (!hidden) {
      if (!reduced) { frame(); }
      else if (needsFrame || Math.abs(progressTarget - progress) > 0.001) { frame(); needsFrame = false; }
    }
    requestAnimationFrame(loop);
  }

  window.KS_SCENE.setProgress = function (p) { progressTarget = Math.min(Math.max(p, 0), 1); needsFrame = true; };
  window.KS_SCENE.setPointer = function (x, y) { pxT = x; pyT = y; needsFrame = true; };
  window.KS_SCENE.ok = true;

  document.addEventListener("visibilitychange", function () { hidden = document.hidden; });
  window.addEventListener("resize", resize, { passive: true });

  resize();
  applyCycle(0);
  frame();
  window.KS_SCENE.ready = true;
  document.dispatchEvent(new Event("ks:scene-ready"));
  requestAnimationFrame(loop);
})();
