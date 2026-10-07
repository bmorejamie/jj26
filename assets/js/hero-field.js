/* --- hero field -------------------------------------------------------
   A cropped, folded figure that stays hidden until the pointer (or a press
   on touch) switches pixels on around it. Pixels go denser toward the
   pointer, then fade. Pure canvas, no dependencies. If anything here fails,
   the hero is just the headline.
   The canvas is fixed to the viewport, behind everything, so the pointer
   trail follows you down the whole page. The image is one hero-sized tile
   repeated down the page; the ambient shimmer and the idle ghost stay in
   the hero, faded out over its last 28% as before. It only runs while the
   tab is showing and there's something to draw.
   Optional: set data-still="assets/img/hero-still.jpg" on the canvas to use a
   real image; otherwise generated folds are used. */
(function () {
  "use strict";
  var cv = document.getElementById("heroField");
  var hero = document.querySelector(".hero");
  var main = document.getElementById("main");
  if (!cv || !hero || !main || !cv.getContext) return;
  var ctx = cv.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var P = {
    cell: 10, opacity: 0.2, opacityDark: 0.36, overLink: 0.3, hint: 0.01, radius: 85, strength: 0.4, linger: 0.4,
    rate: reduce ? 0 : 1, fig: 0.7, ghost: reduce ? 0 : 1
  };

  function h2(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
  function sm(t) { return t * t * (3 - 2 * t); }
  function n2(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = sm(xf), v = sm(yf);
    var a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, o) { var v = 0, a = 0.5, f = 1; for (var i = 0; i < o; i++) { v += a * n2(x * f, y * f); f *= 2.03; a *= 0.5; } return v; }

  var W, H, dpr, cell, cols, rows, tRows, tone, E, small, sctx, img, bgGray = 14, userImg = null;
  var ptr = { x: 0, y: 0, on: false }, lastInput = -1e9, t0 = performance.now(), last = t0;
  var visible = true, raf = 0, hot = false;
  /* Over a link or button the field steps back so the label stays readable;
     `dim` eases toward its target instead of snapping. */
  var dim = 1, dimTo = 1;

  function readBg() {
    var m = /\d+/.exec(getComputedStyle(document.body).backgroundColor || "");
    bgGray = m ? parseInt(m[0], 10) : 14;
  }

  function genTone() {
    var n = cols * tRows, i, x, y;
    tone = new Float32Array(n);
    if (userImg) {
      var t = document.createElement("canvas"); t.width = cols; t.height = tRows;
      var tc = t.getContext("2d");
      var s = Math.max(cols / userImg.width, tRows / userImg.height), w = userImg.width * s, h = userImg.height * s;
      tc.drawImage(userImg, (cols - w) / 2, (tRows - h) / 2, w, h);
      var d = tc.getImageData(0, 0, cols, tRows).data;
      for (i = 0; i < n; i++) tone[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
    } else {
      var Hf = new Float32Array(n);
      for (y = 0; y < tRows; y++) for (x = 0; x < cols; x++) {
        var u = x / tRows, v = y / tRows;
        var q1 = fbm(u * 1.1, v * 1.1, 3), q2 = fbm(u * 1.1 + 5.2, v * 1.1 + 1.3, 3);
        var hh = fbm(u * 1.6 + 2.2 * q1, v * 1.6 + 2.2 * q2, 5);
        Hf[y * cols + x] = Math.sin(hh * 16) * 0.5 + 0.5;
      }
      for (y = 0; y < tRows; y++) for (x = 0; x < cols; x++) {
        var l = Hf[y * cols + Math.max(0, x - 1)], r = Hf[y * cols + Math.min(cols - 1, x + 1)];
        var up = Hf[Math.max(0, y - 1) * cols + x], dn = Hf[Math.min(tRows - 1, y + 1) * cols + x];
        tone[y * cols + x] = Math.min(1, Math.max(0, 0.5 + (l - r) * 3 + (up - dn) * 1.6));
      }
    }
    var lo = 1, hi = 0;
    for (i = 0; i < n; i++) { if (tone[i] < lo) lo = tone[i]; if (tone[i] > hi) hi = tone[i]; }
    for (i = 0; i < n; i++) tone[i] = (tone[i] - lo) / Math.max(0.001, hi - lo);
  }

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = main.clientWidth;
    H = hero.offsetTop + hero.offsetHeight;
    cell = P.cell || (W < 600 ? 6 : 8);
    cols = Math.ceil(W / cell); tRows = Math.ceil(H / cell);
    rows = Math.ceil(window.innerHeight / cell) + 1;   // the viewport, plus one row to scroll into
    cv.style.height = rows * cell + "px";
    cv.width = Math.floor(W * dpr); cv.height = Math.floor(rows * cell * dpr);
    small = document.createElement("canvas"); small.width = cols; small.height = rows;
    sctx = small.getContext("2d"); img = sctx.createImageData(cols, rows);
    E = new Float32Array(cols * rows);
    readBg(); genTone();
    draw(performance.now() - t0, 0);
  }

  /* The hero's old mask (solid to 72%, gone by its bottom edge), by row. */
  function heroFade(r) {
    var yy = r * cell / H;
    return r < 0 || yy >= 1 ? 0 : yy <= 0.72 ? 1 : (1 - yy) / 0.28;
  }

  function draw(t, dt) {
    var n = cols * rows, d = img.data, i, x, y;
    var dk = Math.pow(0.5, dt / P.linger);
    for (i = 0; i < n; i++) E[i] *= dk;
    /* Where the page is: viewport row y shows page row (shift + y), drawn
       `frac` px high so the pixels stay locked to the page as it scrolls. */
    var top = main.getBoundingClientRect().top, sp = -top / cell;
    var shift = Math.floor(sp), frac = (sp - shift) * cell;
    var px = ptr.x, py = ptr.y, on = ptr.on, ghost = false;
    if (!on && P.ghost && visible && t - lastInput > 3000) {
      on = ghost = true; var s = t / 1000;
      px = W * (0.5 + 0.3 * Math.sin(s * 0.45)); py = top + H * (0.5 + 0.26 * Math.sin(s * 0.31 + 1.2));
    }
    if (on) {
      var R = P.radius / cell, cx = px / cell, cy = (py + frac) / cell;
      var y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(rows - 1, Math.ceil(cy + R));
      var x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(cols - 1, Math.ceil(cx + R));
      for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
        var f = 1 - Math.hypot(x - cx, y - cy) / R;
        if (f > 0) { var k = y * cols + x; E[k] = Math.min(1, E[k] + P.strength * f * f * dt * 6 * (ghost ? heroFade(shift + y) : 1)); }
      }
    }
    var ts = t / 1000, tick = Math.floor(ts * P.rate);
    hot = false;
    for (y = 0; y < rows; y++) {
      var r = shift + y, m = heroFade(r), tr = ((r % tRows) + tRows) % tRows;
      for (x = 0; x < cols; x++) {
        var k2 = y * cols + x, o = k2 * 4;
        var amb = m ? m * P.hint * sm(Math.min(1, Math.max(0, (fbm(x / tRows * 3 + (reduce ? 0 : ts * 0.05), r / tRows * 3 - (reduce ? 0 : ts * 0.04), 3) - 0.5) / 0.25))) : 0;
        var p = r < 0 ? 0 : amb + E[k2];
        if (E[k2] > 0.003) hot = true;
        if (p > 0.003 && h2(x + tick * 13.7, r + tick * 7.3) < p) {
          var g = bgGray + (tone[tr * cols + x] * 255 - bgGray) * P.fig;
          g = g < 0 ? 0 : g > 255 ? 255 : g;
          d[o] = d[o + 1] = d[o + 2] = g; d[o + 3] = 255;
        } else d[o + 3] = 0;
      }
    }
    sctx.putImageData(img, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.imageSmoothingEnabled = false;
    dim += (dimTo - dim) * Math.min(1, dt * 10);
    if (Math.abs(dimTo - dim) > 0.01) hot = true;
    ctx.globalAlpha = (bgGray < 128 ? P.opacityDark : P.opacity) * dim;
    ctx.drawImage(small, 0, Math.round(-frac * dpr), cols * cell * dpr, rows * cell * dpr);
    ctx.globalAlpha = 1;
  }

  /* Runs while the tab is showing and there's something to draw: the hero
     on screen, the pointer on the page, or a trail still fading. */
  function busy() { return visible || ptr.on || hot; }
  function loop(now) {
    raf = 0;
    if (document.hidden) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    draw(now - t0, dt);
    if (busy()) raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf && busy() && !document.hidden && !reduce) { last = performance.now(); raf = requestAnimationFrame(loop); } }

  function setPtr(e, down) {
    var r = cv.getBoundingClientRect();
    ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
    lastInput = performance.now() - t0;
    ptr.on = e.pointerType === "mouse" ? true : down;
    var tg = e.target && e.target.closest ? e.target.closest("a, button, [role=button], label, summary") : null;
    dimTo = tg ? P.overLink : 1;
    if (reduce) draw(lastInput, 0.25); else start();
  }
  document.addEventListener("pointermove", function (e) { setPtr(e, e.pointerType !== "mouse" && ptr.on); });
  document.addEventListener("pointerdown", function (e) { setPtr(e, true); });
  document.documentElement.addEventListener("pointerleave", function () { ptr.on = false; });
  window.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") ptr.on = false; });
  window.addEventListener("pointercancel", function () { ptr.on = false; });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }, { threshold: 0 }).observe(hero);
  }
  document.addEventListener("visibilitychange", start);
  /* Fixed canvas: a scroll moves the page under it, so keep drawing (or,
     under reduced motion, redraw the still frame once per scroll). */
  var sr = 0;
  window.addEventListener("scroll", function () {
    if (!reduce) { start(); return; }
    if (!sr) sr = requestAnimationFrame(function () { sr = 0; draw(performance.now() - t0, 0); });
  }, { passive: true });

  var rt = 0;
  function rebuild() { clearTimeout(rt); rt = setTimeout(function () { build(); start(); }, 150); }
  if ("ResizeObserver" in window) new ResizeObserver(rebuild).observe(hero);
  window.addEventListener("resize", rebuild);

  new MutationObserver(function () { readBg(); if (reduce) draw(performance.now() - t0, 0); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { readBg(); });

  function go() { build(); start(); }
  var still = cv.getAttribute("data-still");
  if (still) {
    var im = new Image();
    im.onload = function () { userImg = im; go(); };
    im.onerror = go;
    im.src = still;
  } else go();
})();
