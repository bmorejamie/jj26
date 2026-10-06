/* ---------------------------------------------------------------------------
   Live 3D devices — experiment (Boulder Crest).

   A laptop and a phone built in the page with three.js, wearing the real
   captures from the case plates as their screens. Matte clay bodies, thin
   clay rims, no reflections, no texture: flat, but 3D. They float well
   above a square plate in the page column and cast soft, offset shadows
   onto it. The plate is the frame: it crops them.

   How it behaves
   - Lazy: nothing (not even three.js) loads until the plate nears the
     viewport. Off-screen, or once the motion has settled, nothing renders.
   - Motion: each device has a start pose and an end pose (position and
     rotation). Scroll progress runs 0 -> 1 from the plate entering the
     viewport, through 0.5 with it centred, to 1 as it leaves (or the page
     runs out, whichever is first),
     through a critically damped spring (no overshoot, no 1:1 jitter). Each
     device runs through its poses at its own speed, the phone nearer the
     camera and faster, so the two part in depth as you scroll.
   - Reduced motion: both devices hold their halfway pose, still.
   - Small screens: a taller plate and its own composition (CONFIG.narrow).
   - Day & Night: plate, body, bezel and shadow come from the --device
     tokens in site.css; a flip of the switch cross-fades them on the same
     duration and curve as the page ground (--t-base, --ease).
   - Pixel-exact screens: each screen is the capture's exact aspect, sRGB,
     unlit (no tone mapping), mipmapped with anisotropic filtering.
   - Shadows are analytic: each device's outline is projected onto the
     plate along the light, then drawn as a soft rounded-rectangle field
     that grows softer and fainter the higher the device floats. No shadow
     maps, so no aliasing.
   - No WebGL 2 / no module support / a failed load: the original two image
     plates stand in (html.devices3d-failed).
   - ?tune loads a controls panel (devices-3d-tune.js) that edits CONFIG
     live and copies it as JSON. ?phone=hero|stats|stories swaps the phone
     screen. ?capture exposes a fixed-step hook for frame-exact recordings.
--------------------------------------------------------------------------- */
(function () {
  "use strict";

  /* Every [data-devices3d] on the page is its own scene (own device list,
     own data-project values, own ?tune store). */
  Array.prototype.forEach.call(document.querySelectorAll("[data-devices3d]"), function (host) {

  var SELF = (document.currentScript && document.currentScript.src) || "";
  var THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.186.1/three.module.min.js";
  var root = document.documentElement;
  var DEG = Math.PI / 180;
  var params = new URLSearchParams(location.search);
  var TUNE = params.has("tune");
  var CAPTURE = params.has("capture");

  /* ==================================================================
     Defaults — the numbers the ?tune panel edits. Units: cm and degrees.
     The plate is the z = 0 plane; +z comes out towards the camera.
     Rotations apply pitch (x), then turn (y), then spin in the plate (z).
     speed: how fast a device runs through its start -> end (about the
     middle of the scroll); depth: extra height above the plate.
     ================================================================== */
  var DEFAULTS = {
    wide: {
      cam: { fov: 22, dist: 108, x: 5, y: 0 },
      laptop: {
        start: { p: [-7, 7, 26], r: [12, -36, 9] },
        end:   { p: [-2, -5, 26], r: [3, 10, -4] },
        scale: 1, speed: 1, depth: 0, lid: 110
      },
      phone: {
        start: { p: [15, -14.5, 46], r: [15, 30.5, -22] },
        end:   { p: [14, 3, 52.5], r: [2, -28, -5.5] },
        scale: 1, speed: 1.3, depth: 0
      },
      phone2: {
        start: { p: [-14, -10, 40], r: [14, -28, 20] },
        end:   { p: [-12, 4, 44], r: [3, 24, 5] },
        scale: 1, speed: 1, depth: 0
      }
    },
    narrow: {
      cam: { fov: 24, dist: 150, x: 0, y: 1 },
      laptop: {
        start: { p: [-3, 14, 26], r: [12, -28, 8] },
        end:   { p: [0, 4, 26], r: [3, 12, -3] },
        scale: 1, speed: 1, depth: 0, lid: 110
      },
      phone: {
        start: { p: [9, -24, 44], r: [14, 30, -18] },
        end:   { p: [5, 2, 46], r: [4, -18, -6] },
        scale: 1.15, speed: 1.3, depth: 0
      },
      phone2: {
        start: { p: [-8, -20, 38], r: [14, -26, 18] },
        end:   { p: [-6, 6, 42], r: [4, 20, 6] },
        scale: 1.05, speed: 1, depth: 0
      }
    },
    /* opacity at 15 cm up; blur in cm at 15 cm up (it scales with height);
       x/y: how far the shadow falls per 10 cm of height; spread: cm added
       round the outline. */
    shadow: { opacity: 0.3, blur: 6, x: 3.2, y: -4.4, spread: -0.5 },
    /* damping: the spring's response (1/s; lower = lazier).
       ease: 0 = linear through the poses, 1 = slow in and out. */
    motion: { damping: 5, ease: 0.35 },
    /* hairline where screen meets body: 0 = bezel colour, 1 = shadow colour */
    hairline: 0.2,
    /* null = use the token from site.css */
    colors: {
      day:   { plate: null, body: null, bezel: null },
      night: { plate: null, body: null, bezel: null }
    }
  };
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  /* Which devices this page has (data-devices, default "laptop phone") and
     which project's baked values to start from (data-project). Each
     project's numbers come from its own ?tune pass. */
  var HAS = {};
  (host.getAttribute("data-devices") || "laptop phone").split(/\s+/).forEach(function (n) { if (n) HAS[n] = true; });
  var PROJECT = host.getAttribute("data-project") || "";
  /* Jamie's 390 px pass on Action Against Hunger (2026-10-06); ProLift has
     the same laptop + phone layout, so it shares these narrow values. */
  var LAPTOP_PHONE_NARROW = {
    cam: { fov: 19.5 },
    laptop: { end: { p: [1, 9, 26.5], r: [9.5, 12.5, -3] } },
    phone: { start: { p: [4.5, -18.5, 44] }, end: { p: [5.5, -6.5, 46] } }
  };
  var PROJECTS = {
    /* Action Against Hunger: Boulder Crest's wide poses; narrow and the
       night plate tuned by Jamie 2026-10-06. */
    "aah": {
      narrow: LAPTOP_PHONE_NARROW,
      colors: { night: { plate: "#2f3132" } }
    },
    /* AAH, second piece (replaces the flat Sudan plate): one laptop, the
       mirror of the first piece. Starting poses, not tuned yet. */
    "aah-2": {
      wide: {
        cam: { fov: 22, dist: 108, x: 0, y: 0 },
        laptop: { start: { p: [6, 6, 26], r: [12, 34, -8] }, end: { p: [1, -4, 28], r: [3, -12, 4] }, scale: 1.1, speed: 1 }
      },
      narrow: {
        cam: { fov: 19.5, dist: 150, x: 0, y: 1 },
        laptop: { start: { p: [3, 14, 26], r: [12, 26, -8] }, end: { p: [0, 8, 26.5], r: [8, -12, 3] }, scale: 1, speed: 1 }
      },
      colors: { night: { plate: "#2f3132" } }
    },
    /* ProLift Toyota: Boulder Crest's phone, tuned laptop and night plate
       (2026-10-06); narrow copied from AAH. */
    "prolift": {
      wide: {
        laptop: { start: { r: [12, -36, 5] }, end: { p: [-0.5, -4.5, 33], r: [4.5, 20.5, 7] } }
      },
      narrow: LAPTOP_PHONE_NARROW,
      colors: { night: { plate: "#2a2a2d" } }
    },
    /* Boulder Crest: the base set above for wide; narrow shared with AAH. */
    "bc": {
      narrow: LAPTOP_PHONE_NARROW
    },
    /* The others start from
       compositions of their own and get Jamie's tuned numbers baked in
       here (same shape as DEFAULTS; only the numbers that differ). */
    /* ALPA, first piece (Saved Flights + FTDT limits): wide tuned by Jamie
       2026-10-06 (second pass); narrow is the starting composition. */
    "alpa": {
      wide: {
        cam: { fov: 22, dist: 108, x: 0, y: 0 },
        phone:  { start: { p: [8, -13, 44.5], r: [16, -17.5, -8.5] }, end: { p: [7, 0, 42], r: [16, -11.5, -5] }, scale: 1.48, speed: 1.3 },
        phone2: { start: { p: [-6.5, -17.5, 39.5], r: [5.5, -20, 10] }, end: { p: [-8.5, -1, 53.5], r: [10.5, 20, 11] }, scale: 1.54, speed: 1 }
      },
      narrow: {
        cam: { fov: 24, dist: 150, x: 0, y: 1 },
        phone:  { start: { p: [9, -24, 44], r: [14, 28, -16] }, end: { p: [7, 2, 48], r: [4, -16, -6] }, scale: 1.45, speed: 1.3 },
        phone2: { start: { p: [-11, -20, 34], r: [14, -26, 16] }, end: { p: [-7.5, 3, 38], r: [4, 18, 6] }, scale: 1.45, speed: 1 }
      }
    },
    /* ALPA, second piece (replaces the flat FTDT plate): Flight Finder
       (phone) + Duty Periods (phone2). Wide and narrow tuned by Jamie
       2026-10-06. */
    "alpa-2": {
      wide: {
        cam: { fov: 22, dist: 108, x: 0, y: 0 },
        phone:  { start: { p: [-7, -10, 47], r: [3, -30.5, 20.5] }, end: { p: [-10, -1.5, 44], r: [4, 38.5, 10] }, scale: 1.48, speed: 1.2 },
        phone2: { start: { p: [9, -17, 32], r: [10, 24, -12] }, end: { p: [7.5, 0.5, 36.5], r: [14, -26.5, -10.5] }, scale: 1.93, speed: 1.4 }
      },
      narrow: {
        cam: { fov: 24, dist: 150, x: 0, y: 1 },
        phone:  { start: { p: [-8, 25.5, 56], r: [14, -24, 14] }, end: { p: [-3.5, 0.5, 90], r: [3, 37.5, 5] }, scale: 1.45, speed: 1.2 },
        phone2: { start: { p: [9, -18, 34], r: [10.5, 18, -12] }, end: { p: [5, 5.5, 76.5], r: [8, -16, -9] }, scale: 1.4, speed: 1 }
      }
    }
  };
  function merge(dst, src) {
    if (!src || typeof src !== "object") return dst;
    Object.keys(dst).forEach(function (k) {
      if (!(k in src)) return;
      if (dst[k] && typeof dst[k] === "object" && !Array.isArray(dst[k])) merge(dst[k], src[k]);
      else if (Array.isArray(dst[k]) && Array.isArray(src[k])) src[k].forEach(function (v, i) { if (typeof v === "number") dst[k][i] = v; });
      else if (src[k] === null || typeof src[k] === typeof dst[k] || dst[k] === null) dst[k] = src[k];
    });
    return dst;
  }
  merge(DEFAULTS, PROJECTS[PROJECT]);
  var STORE = "jj26-devices3d-tune:" + (PROJECT || "default");
  var CONFIG = clone(DEFAULTS);
  if (TUNE) { try { merge(CONFIG, JSON.parse(localStorage.getItem(STORE) || "null")); } catch (e) {} }

  function fail(err) {
    if (err && window.console) console.warn("[devices-3d]", err);
    root.classList.add("devices3d-failed");
  }
  function hasWebGL2() {
    try { return !!document.createElement("canvas").getContext("webgl2"); }
    catch (e) { return false; }
  }
  if (!hasWebGL2()) { fail(); return; }

  /* Wait until the plate is within about a screen of the viewport. */
  if ("IntersectionObserver" in window && !TUNE) {
    var nearby = new IntersectionObserver(function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      nearby.disconnect();
      boot();
    }, { rootMargin: "100% 0px 100% 0px" });
    nearby.observe(host);
  } else {
    boot();
  }

  function boot() {
    import(THREE_URL).then(build).catch(fail);
  }

  /* =================================================================== */
  function build(T) {
    var reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    var darkMq = window.matchMedia("(prefers-color-scheme: dark)");

    /* --- renderer ----------------------------------------------------- */
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    var renderer;
    try {
      renderer = new T.WebGLRenderer({
        canvas: canvas, antialias: true, alpha: true,
        premultipliedAlpha: true, preserveDrawingBuffer: CAPTURE
      });
    } catch (e) { fail(e); return; }
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.NoToneMapping;

    var probe = document.createElement("span");
    probe.className = "devices3d__probe";
    probe.setAttribute("aria-hidden", "true");
    host.appendChild(probe);

    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(22, 16 / 10, 1, 1000);

    /* --- materials (colours filled in by the theme) ------------------- */
    var bodyMat = new T.MeshStandardMaterial({ roughness: 0.62, metalness: 0 });
    var bezelMat = new T.MeshStandardMaterial({ roughness: 0.7, metalness: 0 });
    var hairMat = new T.MeshStandardMaterial({ roughness: 0.7, metalness: 0 });

    /* --- lights: soft sky + plate bounce, a key from upper left front
       (the shadows fall down and right, away from it), a low fill from
       the right so the right-hand edges still read. ------------------- */
    var hemi = new T.HemisphereLight(0xffffff, 0xffffff, 1.0);
    var key = new T.DirectionalLight(0xffffff, 1.0);
    key.position.set(-0.55, 0.75, 0.9);
    var fill = new T.DirectionalLight(0xffffff, 0.3);
    fill.position.set(1.0, -0.1, 0.5);
    scene.add(hemi, key, fill);

    /* ================================================================
       Geometry
       ================================================================ */

    /* A rounded slab: plan w x h (corner radius R), thickness t along z,
       every edge rolled over with radius r. Built analytically so the
       normals are smooth on the roll and flat on the faces. Front is +z. */
    function slab(w, h, t, R, r, cs, es) {
      cs = cs || 12; es = es || 6;
      r = Math.min(r, t / 2, R);
      var hw = w / 2 - r, hh = h / 2 - r, Rc = Math.max(R - r, 1e-4);
      var cx = [hw - Rc, -(hw - Rc), -(hw - Rc), hw - Rc];
      var cy = [hh - Rc, hh - Rc, -(hh - Rc), -(hh - Rc)];
      var ox = [], oy = [], nx = [], ny = [], c, i, j, a;
      for (c = 0; c < 4; c++) {
        for (i = 0; i <= cs; i++) {
          a = (c + i / cs) * Math.PI / 2;
          nx.push(Math.cos(a)); ny.push(Math.sin(a));
          ox.push(cx[c] + Rc * Math.cos(a)); oy.push(cy[c] + Rc * Math.sin(a));
        }
      }
      var n = ox.length, zt = t / 2 - r, prof = [], p;
      for (j = 0; j <= es; j++) { p = Math.PI / 2 * (1 - j / es); prof.push([r * Math.cos(p), zt + r * Math.sin(p), Math.cos(p), Math.sin(p)]); }
      for (j = 0; j <= es; j++) { p = -Math.PI / 2 * (j / es); prof.push([r * Math.cos(p), -zt + r * Math.sin(p), Math.cos(p), Math.sin(p)]); }

      var pos = [], nor = [], idx = [];
      for (j = 0; j < prof.length; j++) {
        for (i = 0; i < n; i++) {
          pos.push(ox[i] + nx[i] * prof[j][0], oy[i] + ny[i] * prof[j][0], prof[j][1]);
          nor.push(nx[i] * prof[j][2], ny[i] * prof[j][2], prof[j][3]);
        }
      }
      for (j = 0; j < prof.length - 1; j++) {
        for (i = 0; i < n; i++) {
          var i1 = (i + 1) % n;
          var A = j * n + i, B = j * n + i1, C = (j + 1) * n + i1, D = (j + 1) * n + i;
          idx.push(A, D, C, A, C, B);
        }
      }
      [1, -1].forEach(function (s) {
        var base = pos.length / 3;
        pos.push(0, 0, s * t / 2); nor.push(0, 0, s);
        for (i = 0; i < n; i++) { pos.push(ox[i], oy[i], s * t / 2); nor.push(0, 0, s); }
        for (i = 0; i < n; i++) {
          var a1 = base + 1 + i, b1 = base + 1 + (i + 1) % n;
          if (s > 0) idx.push(base, a1, b1); else idx.push(base, b1, a1);
        }
      });
      var g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
      g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
      g.setIndex(idx);
      return g;
    }

    /* A flat rounded rectangle facing +z, per-corner radii, UVs 0..1. */
    function panel(w, h, rtl, rtr, rbr, rbl) {
      var s = new T.Shape(), x = -w / 2, y = -h / 2;
      s.moveTo(x + rbl, y);
      s.lineTo(x + w - rbr, y);
      if (rbr) s.absarc(x + w - rbr, y + rbr, rbr, -Math.PI / 2, 0, false);
      s.lineTo(x + w, y + h - rtr);
      if (rtr) s.absarc(x + w - rtr, y + h - rtr, rtr, 0, Math.PI / 2, false);
      s.lineTo(x + rtl, y + h);
      if (rtl) s.absarc(x + rtl, y + h - rtl, rtl, Math.PI / 2, Math.PI, false);
      s.lineTo(x, y + rbl);
      if (rbl) s.absarc(x + rbl, y + rbl, rbl, Math.PI, Math.PI * 1.5, false);
      var g = new T.ShapeGeometry(s, 24);
      var P = g.attributes.position, U = g.attributes.uv;
      for (var k = 0; k < P.count; k++) U.setXY(k, (P.getX(k) - x) / w, (P.getY(k) - y) / h);
      U.needsUpdate = true;
      return g;
    }

    var HAIR = 0.03;   // the hairline round each screen, cm

    /* --- the laptop (cm). A 15" MacBook Air, more or less: a thin base
       slab, the lid hinged open, a 16:10 screen in a bezel of slightly
       darker clay with a slightly deeper chin. No keyboard, no trackpad. */
    var LT = { w: 34.0, d: 23.8, t: 1.05, R: 1.2, r: 0.4, lidT: 0.48, lidr: 0.2, rim: 0.2,
               side: 0.5, top: 0.75, chin: 1.05 };
    LT.sw = LT.w - 2 * (LT.rim + LT.side);
    LT.sh = LT.sw * 900 / 1440;                       // the capture is 1440 x 900
    LT.lidH = LT.sh + 2 * LT.rim + LT.top + LT.chin;

    var laptop = new T.Group();
    var laptopInner = new T.Group();   // centred on the whole open laptop
    laptop.add(laptopInner);
    var base = new T.Mesh(slab(LT.w, LT.d, LT.t, LT.R, LT.r, 14, 7), bodyMat);
    base.rotation.x = -Math.PI / 2;
    laptopInner.add(base);
    var hinge = new T.Group();
    hinge.position.set(0, LT.t / 2 - 0.08, -LT.d / 2 + 0.55);
    laptopInner.add(hinge);
    var lid = new T.Group();
    lid.position.set(0, LT.lidH / 2, LT.lidT / 2 - 0.1);
    hinge.add(lid);
    lid.add(new T.Mesh(slab(LT.w, LT.lidH, LT.lidT, LT.R, LT.lidr, 14, 5), bodyMat));
    var lb = new T.Mesh(panel(LT.w - 2 * LT.rim, LT.lidH - 2 * LT.rim,
      LT.R - LT.rim, LT.R - LT.rim, LT.R - LT.rim, LT.R - LT.rim), bezelMat);
    lb.position.z = LT.lidT / 2 + 0.003;
    lid.add(lb);
    var lScreenY = -LT.lidH / 2 + LT.rim + LT.chin + LT.sh / 2;
    var lh = new T.Mesh(panel(LT.sw + 2 * HAIR, LT.sh + 2 * HAIR, 0.22 + HAIR, 0.22 + HAIR, HAIR, HAIR), hairMat);
    lh.position.set(0, lScreenY, LT.lidT / 2 + 0.006);
    lid.add(lh);
    var lScreenMat = new T.MeshBasicMaterial({ toneMapped: false });
    var lScreen = new T.Mesh(panel(LT.sw, LT.sh, 0.22, 0.22, 0, 0), lScreenMat);
    lScreen.position.set(0, lScreenY, LT.lidT / 2 + 0.009);
    lid.add(lScreen);
    var lLens = new T.Mesh(new T.CircleGeometry(0.1, 20), hairMat);
    lLens.position.set(0, LT.lidH / 2 - LT.rim - LT.top / 2, LT.lidT / 2 + 0.007);
    lid.add(lLens);
    scene.add(laptop);

    function setLid(deg) {
      hinge.rotation.x = -(deg - 90) * DEG;
      /* Re-centre so poses turn about the middle of the open laptop. */
      var keep = [laptop.position.clone(), laptop.quaternion.clone(), laptop.scale.clone()];
      laptop.position.set(0, 0, 0); laptop.quaternion.identity(); laptop.scale.setScalar(1);
      laptopInner.position.set(0, 0, 0);
      laptop.updateMatrixWorld(true);
      var c = new T.Box3().setFromObject(laptopInner).getCenter(new T.Vector3());
      laptopInner.position.set(-c.x, -c.y, -c.z);
      laptop.position.copy(keep[0]); laptop.quaternion.copy(keep[1]); laptop.scale.copy(keep[2]);
      laptop.updateMatrixWorld(true);
    }

    /* --- the phone (cm). iPhone 15 Pro proportions, taken from the case
       plate: 560 x 1214 screen, a thin clay rim with a hairline where the
       screen meets the body, side buttons. */
    var PH = { t: 0.82, R: 1.06, r: 0.17, rim: 0.07 };
    PH.sw = 6.46;
    PH.sh = PH.sw * 1214 / 560;
    PH.inset = PH.r + PH.rim + HAIR;
    PH.w = PH.sw + 2 * PH.inset;
    PH.h = PH.sh + 2 * PH.inset;

    function makePhone() {
      var g = new T.Group(), body = new T.Group();
      g.add(body);
      body.add(new T.Mesh(slab(PH.w, PH.h, PH.t, PH.R, PH.r, 14, 6), bodyMat));
      var sr = PH.R - PH.inset;
      var ph = new T.Mesh(panel(PH.sw + 2 * HAIR, PH.sh + 2 * HAIR, sr + HAIR, sr + HAIR, sr + HAIR, sr + HAIR), hairMat);
      ph.position.z = PH.t / 2 + 0.003;
      body.add(ph);
      var mat = new T.MeshBasicMaterial({ toneMapped: false });
      var scr = new T.Mesh(panel(PH.sw, PH.sh, sr, sr, sr, sr), mat);
      scr.position.z = PH.t / 2 + 0.006;
      body.add(scr);
      /* Buttons: [side, from top (fraction of height), length cm]. */
      [[-1, 0.205, 0.62], [-1, 0.300, 1.05], [-1, 0.400, 1.05], [1, 0.335, 1.55]].forEach(function (b) {
        var m = new T.Mesh(slab(0.16, b[2], 0.3, 0.075, 0.06, 6, 3), bodyMat);
        m.position.set(b[0] * (PH.w / 2 + 0.01), PH.h / 2 - b[1] * PH.h - b[2] / 2, 0);
        body.add(m);
      });
      scene.add(g);
      return { obj: g, part: body, mat: mat };
    }
    var phoneA = HAS.phone ? makePhone() : null;
    var phoneB = HAS.phone2 ? makePhone() : null;
    if (!HAS.laptop) scene.remove(laptop);

    /* ================================================================
       Shadows: each device's corners are projected onto the plate along
       the shadow direction; the outline (an oriented box round them) is
       drawn as a soft rounded-rectangle field. Dithered against banding.
       ================================================================ */
    var shadowVS = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
    var shadowFS = [
      "precision highp float;",
      "uniform vec2 uSize; uniform vec2 uHalf; uniform float uRadius; uniform float uBlur; uniform float uOpacity; uniform vec3 uColor;",
      "varying vec2 vUv;",
      "float sdRoundBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }",
      "void main(){",
      "  vec2 p = (vUv - 0.5) * uSize;",
      "  float d = sdRoundBox(p, uHalf, uRadius);",
      "  float s = max(d / uBlur + 0.6, 0.0);",       // the falloff starts inside the outline
      "  float a = uOpacity * exp(-1.8 * s * s);",
      "  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);",
      "  a += (n - 0.5) / 255.0;",
      "  gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0));",
      "}"
    ].join("\n");
    var shadowColor = new T.Vector3(0.09, 0.09, 0.1);
    var planeGeo = new T.PlaneGeometry(1, 1);

    function makeShadow(order) {
      var mat = new T.ShaderMaterial({
        vertexShader: shadowVS, fragmentShader: shadowFS,
        uniforms: {
          uSize: { value: new T.Vector2(1, 1) }, uHalf: { value: new T.Vector2(1, 1) },
          uRadius: { value: 1 }, uBlur: { value: 1 }, uOpacity: { value: 0.3 },
          uColor: { value: shadowColor }
        },
        transparent: true, depthWrite: false
      });
      var m = new T.Mesh(planeGeo, mat);
      m.renderOrder = order;
      scene.add(m);
      return m;
    }
    function boxPoints(w, h, t) {
      var out = [];
      [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { [-1, 1].forEach(function (c) {
        out.push(new T.Vector3(a * w / 2, b * h / 2, c * t / 2));
      }); }); });
      return out;
    }
    /* One shadow per rigid part (laptop base, laptop lid, phone), each an
       oriented box round that part's corners as they fall on the plate. */
    var shadows = [];
    if (HAS.laptop) shadows.push(
      { obj: laptop, part: base, pts: boxPoints(LT.w, LT.d, LT.t), m: makeShadow(0) },
      { obj: laptop, part: lid, pts: boxPoints(LT.w, LT.lidH, LT.lidT), m: makeShadow(1) });
    [phoneA, phoneB].forEach(function (ph, i) {
      if (ph) shadows.push({ obj: ph.obj, part: ph.part, pts: boxPoints(PH.w, PH.h, PH.t), m: makeShadow(2 + i) });
    });
    var tmpV = new T.Vector3(), axisV = new T.Vector3();
    var shadowK = 1;

    function updateShadow(sh) {
      var S = CONFIG.shadow, M = sh.part.matrixWorld;
      axisV.setFromMatrixColumn(M, 0);
      var ang = Math.atan2(axisV.y, axisV.x), ca = Math.cos(ang), sa = Math.sin(ang);
      var minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity, hs = 0;
      sh.pts.forEach(function (p) {
        tmpV.copy(p).applyMatrix4(M);
        var z = Math.max(tmpV.z, 0);
        var x = tmpV.x + S.x * z / 10, y = tmpV.y + S.y * z / 10;
        var u = x * ca + y * sa, v = -x * sa + y * ca;
        minU = Math.min(minU, u); maxU = Math.max(maxU, u);
        minV = Math.min(minV, v); maxV = Math.max(maxV, v);
        hs += z;
      });
      var h = Math.max(hs / sh.pts.length, 0.5), cu = (minU + maxU) / 2, cv = (minV + maxV) / 2;
      var ex = Math.max((maxU - minU) / 2 + S.spread, 0.2), ey = Math.max((maxV - minV) / 2 + S.spread, 0.2);
      var blur = Math.max(S.blur * (0.35 + 0.65 * h / 15), 0.2);
      var op = S.opacity * Math.sqrt(Math.min(Math.max(15 / h, 0.5), 2)) * shadowK;
      var m = sh.m, U = m.material.uniforms;
      var sx = 2 * (ex + 2.2 * blur), sy = 2 * (ey + 2.2 * blur);
      m.position.set(cu * ca - cv * sa, cu * sa + cv * ca, 0.01 + 0.01 * m.renderOrder);
      m.rotation.z = ang;
      m.scale.set(sx, sy, 1);
      U.uSize.value.set(sx, sy);
      U.uHalf.value.set(ex, ey);
      U.uRadius.value = Math.min(ex, ey) * 0.6;
      U.uBlur.value = blur;
      U.uOpacity.value = Math.min(op, 0.9);
    }
    var devices = {};
    if (HAS.laptop) devices.laptop = { obj: laptop };
    if (phoneA) devices.phone = { obj: phoneA.obj };
    if (phoneB) devices.phone2 = { obj: phoneB.obj };

    /* ================================================================
       Poses
       ================================================================ */
    var mode = "wide";
    function lerp(a, b, t) { return a + (b - a) * t; }
    function applyDevice(name, q) {
      var c = CONFIG[mode][name], o = devices[name].obj;
      var a = c.start, b = c.end, d = c.depth || 0;
      o.position.set(lerp(a.p[0], b.p[0], q), lerp(a.p[1], b.p[1], q), lerp(a.p[2], b.p[2], q) + d);
      o.rotation.set(lerp(a.r[0], b.r[0], q) * DEG, lerp(a.r[1], b.r[1], q) * DEG, lerp(a.r[2], b.r[2], q) * DEG, "ZYX");
      o.scale.setScalar(c.scale || 1);
    }
    /* Per-device progress: its speed stretches the scroll about the middle,
       then a blend of linear and smoothstep sets how it eases. */
    function devQ(name, p) {
      var sp = CONFIG[mode][name].speed || 1;
      var q = Math.min(Math.max(0.5 + (p - 0.5) * sp, 0), 1);
      var e = Math.min(Math.max(CONFIG.motion.ease, 0), 1);
      return lerp(q, q * q * (3 - 2 * q), e);
    }
    var lidDeg = null;
    function pose(p) {
      if (HAS.laptop) {
        var L = CONFIG[mode].laptop.lid || 110;
        if (L !== lidDeg) { lidDeg = L; setLid(L); }
      }
      Object.keys(devices).forEach(function (n) { applyDevice(n, devQ(n, p)); });
      var c = CONFIG[mode].cam;
      if (camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
      camera.position.set(c.x, c.y, c.dist);
      camera.lookAt(c.x, c.y, 0);
      camera.near = Math.max(c.dist - 110, 1);
      camera.far = c.dist + 10;
      camera.updateProjectionMatrix();
      Object.keys(devices).forEach(function (n) { devices[n].obj.updateMatrixWorld(true); });
      shadows.forEach(updateShadow);
    }

    /* ================================================================
       Theme: tokens through the probe (or the panel's overrides),
       cross-faded on a flip.
       ================================================================ */
    function rgb(str) {
      var m = str.match(/[\d.]+/g) || [0, 0, 0];
      var f = /^color\(/.test(str) ? 1 : 255;   // rgb(r, g, b) or color(srgb r g b)
      return [m[0] / f, m[1] / f, m[2] / f];
    }
    function hex(c) {
      return "#" + c.map(function (v) { var h = Math.round(Math.min(Math.max(v, 0), 1) * 255).toString(16); return h.length < 2 ? "0" + h : h; }).join("");
    }
    function fromHex(h) { return [parseInt(h.substr(1, 2), 16) / 255, parseInt(h.substr(3, 2), 16) / 255, parseInt(h.substr(5, 2), 16) / 255]; }
    function edition() {
      var t = root.getAttribute("data-theme");
      return t === "dark" || t === "light" ? (t === "dark" ? "night" : "day") : (darkMq.matches ? "night" : "day");
    }
    function tokens() {
      var cs = getComputedStyle(probe), rs = getComputedStyle(root);
      return {
        body: rgb(cs.color), bezel: rgb(cs.backgroundColor), shadow: rgb(cs.borderTopColor),
        plate: rgb(cs.borderBottomColor), k: parseFloat(rs.getPropertyValue("--device-shadow-k")) || 1
      };
    }
    function readTheme() {
      var t = tokens(), ed = edition(), o = CONFIG.colors[ed] || {};
      ["plate", "body", "bezel"].forEach(function (k) { if (o[k]) t[k] = fromHex(o[k]); });
      host.style.backgroundColor = o.plate || "";
      t.d = ed === "night" ? 1 : 0;
      return t;
    }
    function cssTime(name, fallback) {
      var v = getComputedStyle(root).getPropertyValue(name).trim();
      if (!v) return fallback;
      return /ms$/.test(v) ? parseFloat(v) : parseFloat(v) * 1000;
    }
    /* The site's --ease, as a real cubic-bezier. */
    function bezier(str) {
      var m = (str.match(/cubic-bezier\(([^)]+)\)/) || [])[1];
      var q = m ? m.split(",").map(parseFloat) : [0.22, 1, 0.36, 1];
      var x1 = q[0], y1 = q[1], x2 = q[2], y2 = q[3];
      function bx(t) { return 3 * x1 * t * (1 - t) * (1 - t) + 3 * x2 * t * t * (1 - t) + t * t * t; }
      function by(t) { return 3 * y1 * t * (1 - t) * (1 - t) + 3 * y2 * t * t * (1 - t) + t * t * t; }
      return function (x) {
        if (x <= 0) return 0; if (x >= 1) return 1;
        var lo = 0, hi = 1, t = x;
        for (var i = 0; i < 24; i++) { t = (lo + hi) / 2; if (bx(t) < x) lo = t; else hi = t; }
        return by(t);
      };
    }
    var ease = bezier(getComputedStyle(root).getPropertyValue("--ease"));
    var themeFrom = null, themeTo = readTheme(), themeT = 1, themeDur = cssTime("--t-base", 620);
    function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    function applyTheme(th) {
      bodyMat.color.setRGB(th.body[0], th.body[1], th.body[2], T.SRGBColorSpace);
      bezelMat.color.setRGB(th.bezel[0], th.bezel[1], th.bezel[2], T.SRGBColorSpace);
      var hl = mix(th.bezel, th.shadow, CONFIG.hairline);
      hairMat.color.setRGB(hl[0], hl[1], hl[2], T.SRGBColorSpace);
      hemi.groundColor.setRGB(th.plate[0], th.plate[1], th.plate[2], T.SRGBColorSpace);
      shadowColor.set(th.shadow[0], th.shadow[1], th.shadow[2]);
      shadowK = th.k;
      /* Physically based units, hence the PI: a face turned to the key
         lands on the token colour, the far edges about 30% under it. Night
         gets a touch more key so the graphite edges still read. */
      var d = th.d, PI = Math.PI;
      hemi.intensity = (0.42 + 0.1 * d) * PI;
      key.intensity = (0.62 + 0.3 * d) * PI;
      fill.intensity = (0.25 + 0.15 * d) * PI;
      bodyMat.roughness = 0.62 - 0.12 * d;
    }
    function themeAt(t) {
      var a = themeFrom, b = themeTo;
      if (!a || t >= 1) return b;
      var e = ease(t);
      return { body: mix(a.body, b.body, e), bezel: mix(a.bezel, b.bezel, e), shadow: mix(a.shadow, b.shadow, e),
               plate: mix(a.plate, b.plate, e), k: a.k + (b.k - a.k) * e, d: a.d + (b.d - a.d) * e };
    }
    var current = themeAt(1);
    applyTheme(current);
    function onTheme(instant) {
      var next = readTheme();
      if (JSON.stringify(next) === JSON.stringify(themeTo) && instant !== true) return;
      themeFrom = current;
      themeTo = next;
      if (instant === true || reduceMq.matches || !visible) {
        themeT = 1; current = themeTo; applyTheme(current);
        if (ready) draw(0);
      } else {
        themeT = 0;
      }
      kick();
    }
    new MutationObserver(onTheme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    darkMq.addEventListener("change", onTheme);

    /* ================================================================
       Scroll -> progress -> spring.
       ================================================================ */
    var scrub = null;   // the panel can hold progress at a value
    function rawProgress() {
      if (scrub !== null) return scrub;
      var r = host.getBoundingClientRect(), vh = window.innerHeight || 1;
      var y = window.scrollY || window.pageYOffset || 0;
      /* 0 as the plate enters, 0.5 with it centred, 1 as it leaves (or
         where the page runs out, if that comes first). */
      var top = r.top + y, maxY = Math.max(root.scrollHeight - vh, 0);
      var y0 = top - vh, yc = Math.min(top + r.height / 2 - vh / 2, maxY), y1 = Math.min(top + r.height, maxY);
      if (y <= yc) return yc - y0 < 1 ? 0.5 : Math.max(0.5 * (y - y0) / (yc - y0), 0);
      return y1 - yc < 1 ? 1 : Math.min(0.5 + 0.5 * (y - yc) / (y1 - yc), 1);
    }
    var spring = { x: 0.5, v: 0 };
    function stepSpring(target, dt) {
      var w = Math.max(CONFIG.motion.damping, 0.5);
      var steps = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / steps;
      for (var i = 0; i < steps; i++) {
        var a = w * w * (target - spring.x) - 2 * w * spring.v;
        spring.v += a * h;
        spring.x += spring.v * h;
      }
    }

    /* ================================================================
       Textures
       ================================================================ */
    var phoneSrc = host.getAttribute("data-phone");
    var pick = params.get("phone");
    if (phoneSrc && pick && /^(hero|stats|stories)$/.test(pick)) phoneSrc = phoneSrc.replace(/screen-phone-\w+/, "screen-phone-" + pick);
    var loader = new T.TextureLoader();
    var maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);
    function tex(url) {
      return loader.loadAsync(url).then(function (t) {
        t.colorSpace = T.SRGBColorSpace;
        t.anisotropy = maxAniso;
        t.minFilter = T.LinearMipmapLinearFilter;
        t.magFilter = T.LinearFilter;
        t.generateMipmaps = true;
        return t;
      });
    }

    /* ================================================================
       Size, loop, visibility
       ================================================================ */
    var visible = false, raf = 0, last = 0, ready = false;

    function resize() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      var m = w / h < 1.2 ? "narrow" : "wide";
      if (m !== mode) { mode = m; lidDeg = null; host.dispatchEvent(new CustomEvent("devices3d:mode")); }
    }

    function draw(dt) {
      var still = reduceMq.matches && scrub === null;
      var target = rawProgress(), moving = false;
      if (still) { spring.x = 0.5; spring.v = 0; }
      else if (scrub !== null) { spring.x = scrub; spring.v = 0; }
      else {
        stepSpring(target, dt);
        moving = Math.abs(target - spring.x) > 1e-4 || Math.abs(spring.v) > 1e-4;
        if (!moving) { spring.x = target; spring.v = 0; }
      }
      if (themeT < 1) {
        themeT = Math.min(1, themeT + dt * 1000 / themeDur);
        current = themeAt(themeT);
        applyTheme(current);
      }
      pose(spring.x);
      renderer.render(scene, camera);
      return moving || themeT < 1;
    }

    function tick(now) {
      raf = 0;
      var dt = Math.min(Math.max((now - last) / 1000, 0), 1 / 15);
      last = now;
      if (draw(dt) && visible) raf = requestAnimationFrame(tick);
    }
    function kick() {
      if (!ready || CAPTURE || raf || !visible) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }

    var screens = [];   // [material, url] for each device present
    if (HAS.laptop) screens.push([lScreenMat, host.getAttribute("data-laptop")]);
    if (phoneA) screens.push([phoneA.mat, phoneSrc]);
    if (phoneB) screens.push([phoneB.mat, host.getAttribute("data-phone2")]);
    Promise.all(screens.map(function (sc) { return tex(sc[1]); })).then(function (t) {
      screens.forEach(function (sc, i) { sc[0].map = t[i]; sc[0].needsUpdate = true; });
      host.appendChild(canvas);
      resize();
      renderer.compile(scene, camera);
      ready = true;
      spring.x = rawProgress();
      draw(0);
      requestAnimationFrame(function () { host.classList.add("is-live"); });

      new ResizeObserver(function () { resize(); if (CAPTURE || !visible) draw(0); else kick(); }).observe(host);
      new IntersectionObserver(function (entries) {
        visible = entries.some(function (e) { return e.isIntersecting; });
        if (visible) kick(); else if (raf) { cancelAnimationFrame(raf); raf = 0; }
      }).observe(host);
      window.addEventListener("scroll", kick, { passive: true });
      reduceMq.addEventListener("change", function () { draw(0); kick(); });
      canvas.addEventListener("webglcontextlost", function (e) {
        e.preventDefault();
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
      });
      canvas.addEventListener("webglcontextrestored", function () { draw(0); });

      if (TUNE || CAPTURE) {
        host.__devices3d = {
          config: CONFIG, defaults: DEFAULTS, store: STORE, devices: Object.keys(devices),
          mode: function () { return mode; },
          edition: edition,
          tokens: function () { var t = tokens(); return { plate: hex(t.plate), body: hex(t.body), bezel: hex(t.bezel) }; },
          update: function () { onTheme(true); draw(0); },
          scrub: function (v) { scrub = (v === null || v === undefined) ? null : Math.min(Math.max(v, 0), 1); spring.x = rawProgress(); spring.v = 0; draw(0); kick(); },
          progress: function () { return spring.x; },
          step: function (dt) { draw(dt); return spring.x; },
          settle: function () { spring.x = rawProgress(); spring.v = 0; themeT = 1; current = themeTo = readTheme(); applyTheme(current); draw(0); },
          info: function () { return renderer.info.render; }
        };
      }
      if (TUNE && SELF) {
        /* One panel serves every scene on the page: scenes queue up, the
           first to be ready loads the panel, the rest tell it they exist. */
        var queue = window.__devices3dHosts = window.__devices3dHosts || [];
        queue.push(host);
        if (window.__devices3dTune) window.__devices3dTune.add();
        else if (!window.__devices3dTuneLoading) {
          window.__devices3dTuneLoading = true;
          var s = document.createElement("script");
          s.src = SELF.replace(/devices-3d\.js(\?.*)?$/, "devices-3d-tune.js");
          document.body.appendChild(s);
        }
      }
    }).catch(fail);
  }
  });
})();
