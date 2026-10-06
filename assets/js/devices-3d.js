/* ---------------------------------------------------------------------------
   Live 3D devices — experiment (Boulder Crest).

   A laptop and a phone built in the page with three.js, wearing the real
   captures from the case plates as their screens. Matte clay bodies, black
   glass, no reflections, no texture: flat, but 3D. Scroll turns and lifts
   them; the phone sits nearer the camera and moves further, so the two part
   in depth as you go.

   How it behaves
   - Lazy: nothing (not even three.js) loads until the frame nears the
     viewport. Off-screen, or once the motion has settled, nothing renders.
   - Motion: scroll position -> progress (0 as the frame enters, 1 as it
     leaves) -> a critically damped spring (no overshoot, no 1:1 jitter) ->
     a curve that slows through the middle, so the devices ease into their
     composed pose as the frame reaches the centre and ease out of it again.
   - Reduced motion: the composed pose, still. Rendered on demand only.
   - Small screens: a tighter composition and fewer, smaller moves.
   - Day & Night: body, glass, shadow and ground bounce come from the
     --device tokens in site.css; a flip of the switch cross-fades them on
     the same duration and curve as the page ground (--t-base, --ease).
   - Pixel-exact screens: each screen is the capture's exact aspect, sRGB,
     unlit (no tone mapping), mipmapped with anisotropic filtering.
   - Shadows are analytic: a rounded-rectangle distance field with a soft
     falloff, drawn on the ground under each device. No shadow maps, so no
     aliasing; they spread and fade as a device rises.
   - No WebGL 2 / no module support / a failed load: the original two image
     plates stand in (html.devices3d-failed).
   - Review aid: ?phone=hero|stats|stories swaps the phone screen between the
     three captures on the Mobile plate (default: data-phone, the stats one).
     ?capture exposes a fixed-step hook for frame-exact recordings.
--------------------------------------------------------------------------- */
(function () {
  "use strict";

  var host = document.querySelector("[data-devices3d]");
  if (!host) return;

  var THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.186.1/three.module.min.js";
  var root = document.documentElement;
  var DEG = Math.PI / 180;

  function fail(err) {
    if (err && window.console) console.warn("[devices-3d]", err);
    root.classList.add("devices3d-failed");
  }

  function hasWebGL2() {
    try { return !!document.createElement("canvas").getContext("webgl2"); }
    catch (e) { return false; }
  }
  if (!hasWebGL2()) { fail(); return; }

  /* Wait until the frame is within about a screen of the viewport. */
  if ("IntersectionObserver" in window) {
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
    var params = new URLSearchParams(location.search);
    var capture = params.has("capture");   // deterministic frame stepping for recordings

    /* --- renderer ----------------------------------------------------- */
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    var renderer;
    try {
      renderer = new T.WebGLRenderer({
        canvas: canvas, antialias: true, alpha: true,
        premultipliedAlpha: true, preserveDrawingBuffer: capture
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
    var camera = new T.PerspectiveCamera(22, 16 / 10, 10, 1000);

    /* --- materials (colours filled in by the theme) ------------------- */
    var bodyMat = new T.MeshStandardMaterial({ roughness: 0.62, metalness: 0 });
    var glassMat = new T.MeshStandardMaterial({ roughness: 0.42, metalness: 0 });
    var lensMat = new T.MeshBasicMaterial({ color: 0x1a1b1f });

    /* --- lights: soft sky + ground bounce, a key from upper left front,
       a low fill from the right so the right-hand bevels still read. ---- */
    var hemi = new T.HemisphereLight(0xffffff, 0xffffff, 1.0);
    var key = new T.DirectionalLight(0xffffff, 1.0);
    key.position.set(-0.55, 1.0, 0.8);
    var fill = new T.DirectionalLight(0xffffff, 0.3);
    fill.position.set(1.0, 0.25, 0.35);
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

    /* --- the laptop (cm). A 15" MacBook Air, more or less: a thin base
       slab, the lid hinged open at 112 degrees, a 16:10 screen in thin
       black glass with a slightly deeper chin. No keyboard, no trackpad. */
    var LT = { w: 34.0, d: 23.8, t: 1.05, R: 1.2, r: 0.4, lidT: 0.48, lidr: 0.2, rim: 0.2,
               side: 0.5, top: 0.75, chin: 1.05, open: 112 };
    LT.sw = LT.w - 2 * (LT.rim + LT.side);
    LT.sh = LT.sw * 900 / 1440;                       // the capture is 1440 x 900
    LT.lidH = LT.sh + 2 * LT.rim + LT.top + LT.chin;

    var laptop = new T.Group();
    var base = new T.Mesh(slab(LT.w, LT.d, LT.t, LT.R, LT.r, 14, 7), bodyMat);
    base.rotation.x = -Math.PI / 2;
    laptop.add(base);

    var hinge = new T.Group();
    hinge.position.set(0, LT.t / 2 - 0.08, -LT.d / 2 + 0.55);
    hinge.rotation.x = -(LT.open - 90) * DEG;
    laptop.add(hinge);

    var lid = new T.Group();
    lid.position.set(0, LT.lidH / 2, LT.lidT / 2 - 0.1);
    hinge.add(lid);
    lid.add(new T.Mesh(slab(LT.w, LT.lidH, LT.lidT, LT.R, LT.lidr, 14, 5), bodyMat));
    var lg = new T.Mesh(panel(LT.w - 2 * LT.rim, LT.lidH - 2 * LT.rim,
      LT.R - LT.rim, LT.R - LT.rim, LT.R - LT.rim, LT.R - LT.rim), glassMat);
    lg.position.z = LT.lidT / 2 + 0.004;
    lid.add(lg);
    var lScreenMat = new T.MeshBasicMaterial({ toneMapped: false });
    var lScreen = new T.Mesh(panel(LT.sw, LT.sh, 0.22, 0.22, 0, 0), lScreenMat);
    lScreen.position.set(0, -LT.lidH / 2 + LT.rim + LT.chin + LT.sh / 2, LT.lidT / 2 + 0.008);
    lid.add(lScreen);
    var lLens = new T.Mesh(new T.CircleGeometry(0.11, 20), lensMat);
    lLens.position.set(0, LT.lidH / 2 - LT.rim - LT.top / 2, LT.lidT / 2 + 0.007);
    lid.add(lLens);
    scene.add(laptop);

    /* --- the phone (cm). iPhone 15 Pro proportions, taken from the case
       plate: 560 x 1214 screen, thin bezel, side buttons. */
    var PH = { w: 7.06, t: 0.82, R: 1.06, r: 0.17, bez: 0.15 };
    PH.sw = PH.w - 2 * (PH.r + PH.bez);
    PH.sh = PH.sw * 1214 / 560;
    PH.h = PH.sh + 2 * (PH.r + PH.bez);

    var phone = new T.Group();
    var phoneBody = new T.Group();   // the phone itself; `phone` carries the pose
    phone.add(phoneBody);
    phoneBody.add(new T.Mesh(slab(PH.w, PH.h, PH.t, PH.R, PH.r, 14, 6), bodyMat));
    var pg = new T.Mesh(panel(PH.w - 2 * PH.r, PH.h - 2 * PH.r,
      PH.R - PH.r, PH.R - PH.r, PH.R - PH.r, PH.R - PH.r), glassMat);
    pg.position.z = PH.t / 2 + 0.003;
    phoneBody.add(pg);
    var sr = PH.R - PH.r - PH.bez;
    var pScreenMat = new T.MeshBasicMaterial({ toneMapped: false });
    var pScreen = new T.Mesh(panel(PH.sw, PH.sh, sr, sr, sr, sr), pScreenMat);
    pScreen.position.z = PH.t / 2 + 0.006;
    phoneBody.add(pScreen);
    /* Buttons: [side, from top (fraction of height), length cm]. */
    [[-1, 0.205, 0.62], [-1, 0.300, 1.05], [-1, 0.400, 1.05], [1, 0.335, 1.55]].forEach(function (b) {
      var m = new T.Mesh(slab(0.16, b[2], 0.3, 0.075, 0.06, 6, 3), bodyMat);
      m.position.set(b[0] * (PH.w / 2 + 0.01), PH.h / 2 - b[1] * PH.h - b[2] / 2, 0);
      phoneBody.add(m);
    });
    scene.add(phone);

    /* ================================================================
       Shadows: one tight contact shadow and one wide ambient shadow per
       device, each a rounded-rect distance field with a soft falloff.
       The footprint follows the device (its corners projected straight
       down); height spreads and lightens it. Dithered against banding.
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
      "  float s = max(d / uBlur + 0.65, 0.0);",
      "  float a = uOpacity * exp(-2.1 * s * s);",
      "  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);",
      "  a += (n - 0.5) / 255.0;",
      "  gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0));",
      "}"
    ].join("\n");
    var shadowColor = new T.Vector3(0.09, 0.09, 0.1);
    var planeGeo = new T.PlaneGeometry(1, 1);
    planeGeo.rotateX(-Math.PI / 2);

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

    /* Points (device-local) whose drop to the ground outlines the footprint. */
    function boxPoints(w, h, t) {
      var out = [];
      [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { [-1, 1].forEach(function (c) {
        out.push(new T.Vector3(a * w / 2, b * h / 2, c * t / 2));
      }); }); });
      return out;
    }
    var devices = [
      { obj: laptop, parts: [[base, boxPoints(LT.w, LT.d, LT.t)], [lid, boxPoints(LT.w, LT.lidH, LT.lidT)]],
        contact: makeShadow(1), ambient: makeShadow(0),
        k: { cOp: 0.34, cBlur: 0.9, cGrow: 0.22, aOp: 0.17, aBlur: 4.5, aGrow: 0.55, inset: 0.6 } },
      { obj: phone, parts: [[phoneBody, boxPoints(PH.w, PH.h, PH.t)]],
        contact: makeShadow(1), ambient: makeShadow(0),
        k: { cOp: 0.28, cBlur: 0.9, cGrow: 0.2, aOp: 0.14, aBlur: 3.2, aGrow: 0.5, inset: 0.15 } }
    ];
    var tmpV = new T.Vector3(), tmpQ = new T.Quaternion(), tmpE = new T.Euler();
    var shadowK = 1;

    function updateShadow(dev) {
      dev.obj.updateMatrixWorld(true);
      dev.obj.getWorldQuaternion(tmpQ);
      tmpE.setFromQuaternion(tmpQ, "YXZ");
      var yaw = tmpE.y, cy = Math.cos(yaw), sy = Math.sin(yaw);
      var minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity, low = Infinity;
      dev.parts.forEach(function (part) {
        part[1].forEach(function (p) {
          tmpV.copy(p).applyMatrix4(part[0].matrixWorld);
          low = Math.min(low, tmpV.y);
          var u = tmpV.x * cy - tmpV.z * sy, v = tmpV.x * sy + tmpV.z * cy;
          minU = Math.min(minU, u); maxU = Math.max(maxU, u);
          minV = Math.min(minV, v); maxV = Math.max(maxV, v);
        });
      });
      var h = Math.max(low, 0), cu = (minU + maxU) / 2, cv = (minV + maxV) / 2;
      var hu = (maxU - minU) / 2, hv = (maxV - minV) / 2, k = dev.k;
      var wx = cu * cy + cv * sy, wz = -cu * sy + cv * cy;
      [[dev.contact, k.cOp / (1 + 0.16 * h), k.cBlur + k.cGrow * h, -k.inset],
       [dev.ambient, k.aOp / (1 + 0.035 * h), k.aBlur + k.aGrow * h, 0.4]].forEach(function (s) {
        var m = s[0], U = m.material.uniforms, blur = s[2];
        var ex = Math.max(hu + s[3], 0.3), ez = Math.max(hv + s[3], 0.3);
        var sx = 2 * (ex + 2.4 * blur), sz = 2 * (ez + 2.4 * blur);
        m.position.set(wx, 0.01 + m.renderOrder * 0.005, wz);
        m.rotation.y = yaw;
        m.scale.set(sx, 1, sz);
        U.uSize.value.set(sx, sz);
        U.uHalf.value.set(ex, ez);
        U.uRadius.value = Math.min(ex, ez, 1.2 + blur * 0.5);
        U.uBlur.value = blur;
        U.uOpacity.value = Math.min(s[1] * shadowK, 0.85);
      });
      return { x: wx, z: wz, hu: hu, hv: hv, yaw: yaw, blur: k.aBlur + k.aGrow * h };
    }

    /* ================================================================
       Composition + motion. Rest pose = progress 0.5 (frame centred).
       Each move is rest + amplitude * e, where e runs -1..1 through the
       scroll. Rotations in degrees, positions in cm.
       ================================================================ */
    var COMP = {
      wide: {
        laptop: { p: [-4.0, 2.4, 0], r: [0, 15, 0] },
        phone:  { p: [13.0, 8.6, 11], r: [-8, -17, -3.5], s: 1.12 },
        cam: { el: 9, az: 0, fov: 20 }
      },
      narrow: {   // the phone steps in front of the laptop's corner
        laptop: { p: [-2.5, 3.4, -3], r: [0, 14, 0] },
        phone:  { p: [9.5, 5.6, 15], r: [-9, -15, -3], s: 1.22 },
        cam: { el: 10, az: 0, fov: 22 }
      }
    };
    var MOVE = {
      wide: {
        laptop: { p: [0.8, 1.8, 0], r: [-1.6, 10, 0] },
        phone:  { p: [-1.0, 4.4, 2.2], r: [5.5, -16, 3] },
        cam: { el: 1.8, az: -3.2 }
      },
      narrow: {   // fewer degrees of freedom, smaller moves
        laptop: { p: [0, 1.0, 0], r: [0, 6, 0] },
        phone:  { p: [0, 2.8, 0], r: [3, -10, 0] },
        cam: { el: 0, az: 0 }
      }
    };
    var mode = "wide", camTarget = new T.Vector3(0, 8, 0), camDist = 150;

    function applyDevice(obj, c, m, e) {
      obj.position.set(c.p[0] + m.p[0] * e, c.p[1] + m.p[1] * e, c.p[2] + m.p[2] * e);
      obj.rotation.set((c.r[0] + m.r[0] * e) * DEG, (c.r[1] + m.r[1] * e) * DEG, (c.r[2] + m.r[2] * e) * DEG, "YXZ");
      if (c.s) obj.scale.setScalar(c.s);
    }
    function camDir(el, az) {
      return new T.Vector3(Math.sin(az * DEG) * Math.cos(el * DEG), Math.sin(el * DEG), Math.cos(az * DEG) * Math.cos(el * DEG));
    }
    function placeCamera(e) {
      var c = COMP[mode].cam, m = MOVE[mode].cam;
      camera.position.copy(camDir(c.el + m.el * e, c.az + m.az * e)).multiplyScalar(camDist).add(camTarget);
      camera.lookAt(camTarget);
    }
    function pose(e) {
      applyDevice(laptop, COMP[mode].laptop, MOVE[mode].laptop, e);
      applyDevice(phone, COMP[mode].phone, MOVE[mode].phone, e);
      placeCamera(e);
      var fp = devices.map(updateShadow);
      return fp;
    }

    /* Auto-frame: from the rest pose, find the camera distance and aim that
       fit the devices (and their shadows, with less margin) in the frame. */
    function frameScene() {
      var c = COMP[mode].cam;
      camera.fov = c.fov;
      var fp = pose(0);
      var devPts = [], shPts = [];
      devices.forEach(function (dev) {
        dev.parts.forEach(function (part) {
          part[1].forEach(function (p) { devPts.push(p.clone().applyMatrix4(part[0].matrixWorld)); });
        });
      });
      fp.forEach(function (f) {
        var cy = Math.cos(f.yaw), sy = Math.sin(f.yaw), g = 0.9 * f.blur;
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q) {
          var u = q[0] * (f.hu + g), v = q[1] * (f.hv + g);
          shPts.push(new T.Vector3(f.x + u * cy + v * sy, 0, f.z - u * sy + v * cy));
        });
      });
      var dir = camDir(c.el, c.az);
      camTarget.set(0, 0, 0);
      devPts.forEach(function (p) { camTarget.add(p); });
      camTarget.divideScalar(devPts.length);
      var right = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), dir).normalize();
      var up = new T.Vector3().crossVectors(dir, right).normalize();
      /* Devices fit the figure's own box; the canvas bleeds past it into
         the gutters, so the shadows may spread out there before fading. */
      var MX = (mode === "wide" ? 0.9 : 0.98) * boxFx, MY = (mode === "wide" ? 0.86 : 0.86) * boxFy, MS = 0.97;

      function measure(dist) {
        camera.position.copy(dir).multiplyScalar(dist).add(camTarget);
        camera.lookAt(camTarget);
        camera.updateMatrixWorld(); camera.updateProjectionMatrix();
        var b = [Infinity, -Infinity, Infinity, -Infinity], worst = 0;
        devPts.forEach(function (p) {
          tmpV.copy(p).project(camera);
          b[0] = Math.min(b[0], tmpV.x); b[1] = Math.max(b[1], tmpV.x);
          b[2] = Math.min(b[2], tmpV.y); b[3] = Math.max(b[3], tmpV.y);
        });
        var cx = (b[0] + b[1]) / 2, cyy = (b[2] + b[3]) / 2;
        worst = Math.max((b[1] - b[0]) / 2 / MX, (b[3] - b[2]) / 2 / MY);
        shPts.forEach(function (p) {
          tmpV.copy(p).project(camera);
          worst = Math.max(worst, Math.abs(tmpV.x - cx) / MS, Math.abs(tmpV.y - cyy) / MS);
        });
        return { worst: worst, cx: cx, cy: cyy };
      }
      for (var it = 0; it < 4; it++) {
        var lo = 20, hi = 2000, mres;
        for (var s = 0; s < 32; s++) {
          var mid = (lo + hi) / 2;
          mres = measure(mid);
          if (mres.worst > 1) lo = mid; else hi = mid;
        }
        camDist = hi;
        mres = measure(camDist);
        var halfH = Math.tan(camera.fov * DEG / 2) * camDist, halfW = halfH * camera.aspect;
        camTarget.addScaledVector(right, mres.cx * halfW).addScaledVector(up, mres.cy * halfH);
      }
      camera.near = Math.max(camDist * 0.4, 1);
      camera.far = camDist * 2.5;
      camera.updateProjectionMatrix();
    }

    /* ================================================================
       Theme: read the tokens through the probe, cross-fade on a flip.
       ================================================================ */
    function rgb(str) {
      var m = str.match(/[\d.]+/g) || [0, 0, 0];
      var f = /^color\(/.test(str) ? 1 : 255;   // rgb(r, g, b) or color(srgb r g b)
      return [m[0] / f, m[1] / f, m[2] / f];
    }
    function readTheme() {
      var cs = getComputedStyle(probe), rs = getComputedStyle(root);
      var ground = rgb(cs.borderBottomColor);
      return {
        body: rgb(cs.color), glass: rgb(cs.backgroundColor), shadow: rgb(cs.borderTopColor),
        ground: ground, k: parseFloat(rs.getPropertyValue("--device-shadow-k")) || 1,
        d: (0.2126 * ground[0] + 0.7152 * ground[1] + 0.0722 * ground[2]) < 0.5 ? 1 : 0
      };
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
      glassMat.color.setRGB(th.glass[0], th.glass[1], th.glass[2], T.SRGBColorSpace);
      hemi.groundColor.setRGB(th.ground[0], th.ground[1], th.ground[2], T.SRGBColorSpace);
      shadowColor.set(th.shadow[0], th.shadow[1], th.shadow[2]);
      shadowK = th.k;
      /* Night: a touch more key so the graphite bevels still read. */
      /* Physically based units, hence the PI: a lit top face lands on the
         token colour, the right-hand faces about 30% under it. */
      var d = th.d, PI = Math.PI;
      hemi.intensity = (0.4 + 0.1 * d) * PI;
      key.intensity = (0.75 + 0.35 * d) * PI;
      fill.intensity = (0.3 + 0.15 * d) * PI;
      bodyMat.roughness = 0.62 - 0.12 * d;
    }
    function themeAt(t) {
      var a = themeFrom, b = themeTo;
      if (!a || t >= 1) return b;
      var e = ease(t);
      return { body: mix(a.body, b.body, e), glass: mix(a.glass, b.glass, e), shadow: mix(a.shadow, b.shadow, e),
               ground: mix(a.ground, b.ground, e), k: a.k + (b.k - a.k) * e, d: a.d + (b.d - a.d) * e };
    }
    var current = themeAt(1);
    applyTheme(current);
    function onTheme() {
      var next = readTheme();
      if (JSON.stringify(next) === JSON.stringify(themeTo)) return;
      themeFrom = current;   // from wherever a cross-fade has got to
      themeTo = next;
      if (reduceMq.matches || !visible) {
        /* Nobody is watching (or motion is reduced): just be the new edition. */
        themeT = 1; current = themeTo; applyTheme(current);
        if (ready && visible) draw(0);
      } else {
        themeT = 0;
      }
      kick();
    }
    new MutationObserver(onTheme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    darkMq.addEventListener("change", onTheme);

    /* ================================================================
       Scroll -> progress -> spring -> shaped e.
       ================================================================ */
    function rawProgress() {
      var r = host.getBoundingClientRect(), vh = window.innerHeight || 1;
      var p = (vh - r.top) / (vh + r.height);
      return Math.min(Math.max(p, 0), 1);
    }
    /* Slower through the middle (slope 0.65 at centre), full range at the ends. */
    function shape(p) { var u = 2 * p - 1; return u * (0.65 + 0.35 * u * u); }

    var spring = { x: rawProgress(), v: 0 }, OMEGA = 7.5;
    function stepSpring(target, dt) {
      var steps = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / steps;
      for (var i = 0; i < steps; i++) {
        var a = OMEGA * OMEGA * (target - spring.x) - 2 * OMEGA * spring.v;
        spring.v += a * h;
        spring.x += spring.v * h;
      }
    }

    /* ================================================================
       Textures
       ================================================================ */
    var phoneSrc = host.getAttribute("data-phone");
    var pick = params.get("phone");
    if (pick && /^(hero|stats|stories)$/.test(pick)) phoneSrc = phoneSrc.replace(/screen-phone-\w+/, "screen-phone-" + pick);
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
    var visible = false, raf = 0, last = 0, ready = false, boxFx = 1, boxFy = 1;

    function resize() {
      var w = host.clientWidth, h = host.clientHeight;
      var cw = canvas.clientWidth || w, ch = canvas.clientHeight || h;
      if (!w || !h) return;
      boxFx = w / cw; boxFy = h / ch;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(cw, ch, false);
      camera.aspect = cw / ch;
      mode = (w / h < 1.4 || w < 640) ? "narrow" : "wide";
      frameScene();
    }

    function draw(dt) {
      var still = reduceMq.matches;
      var target = rawProgress(), moving = false;
      if (still) { spring.x = 0.5; spring.v = 0; }
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
      pose(still ? 0 : shape(spring.x));
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
      if (!ready || capture || raf || !visible) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }

    Promise.all([tex(host.getAttribute("data-laptop")), tex(phoneSrc)]).then(function (t) {
      lScreenMat.map = t[0]; lScreenMat.needsUpdate = true;
      pScreenMat.map = t[1]; pScreenMat.needsUpdate = true;
      host.appendChild(canvas);
      resize();
      renderer.compile(scene, camera);
      ready = true;
      spring.x = rawProgress();
      draw(0);
      requestAnimationFrame(function () { host.classList.add("is-live"); });

      new ResizeObserver(function () { resize(); if (capture || !visible) draw(0); else kick(); }).observe(host);
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

      if (capture) {
        /* For recordings only (?capture): step the scene by an exact dt. */
        host.__devices3d = { step: function (dt) { draw(dt); return spring.x; }, info: function () { return renderer.info.render; },
                             settle: function () { spring.x = rawProgress(); spring.v = 0; themeT = 1; current = themeAt(1); applyTheme(current); draw(0); } };
      }
    }).catch(fail);
  }
})();
