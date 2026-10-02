/* --- hero field -------------------------------------------------------
   A cropped, folded figure that stays hidden until the pointer (or a press
   on touch) switches pixels on around it. Pixels go denser toward the
   pointer, then fade. Pure canvas, no dependencies. If anything here fails,
   the hero is just the headline.
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
    cell: 0, opacity: 0.6, hint: 0.03, radius: 220, strength: 1, linger: 1.2,
    rate: reduce ? 0 : 14, fig: 0.6, ghost: reduce ? 0 : 1
  };

  function h2(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
  function sm(t) { return t * t * (3 - 2 * t); }
  function n2(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = sm(xf), v = sm(yf);
    var a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, o) { var v = 0, a = 0.5, f = 1; for (var i = 0; i < o; i++) { v += a * n2(x * f, y * f); f *= 2.03; a *= 0.5; } return v; }

  var W, H, dpr, cell, cols, rows, tone, E, small, sctx, img, bgGray = 14, userImg = null;
  var ptr = { x: 0, y: 0, on: false }, lastInput = -1e9, t0 = performance.now(), last = t0;
  var visible = true, raf = 0;

  function readBg() {
    var m = /\d+/.exec(getComputedStyle(document.body).backgroundColor || "");
    bgGray = m ? parseInt(m[0], 10) : 14;
  }

  function genTone() {
    var n = cols * rows, i, x, y;
    tone = new Float32Array(n);
    if (userImg) {
      var t = document.createElement("canvas"); t.width = cols; t.height = rows;
      var tc = t.getContext("2d");
      var s = Math.max(cols / userImg.width, rows / userImg.height), w = userImg.width * s, h = userImg.height * s;
      tc.drawImage(userImg, (cols - w) / 2, (rows - h) / 2, w, h);
      var d = tc.getImageData(0, 0, cols, rows).data;
      for (i = 0; i < n; i++) tone[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
    } else {
      var Hf = new Float32Array(n);
      for (y = 0; y < rows; y++) for (x = 0; x < cols; x++) {
        var u = x / rows, v = y / rows;
        var q1 = fbm(u * 1.1, v * 1.1, 3), q2 = fbm(u * 1.1 + 5.2, v * 1.1 + 1.3, 3);
        var hh = fbm(u * 1.6 + 2.2 * q1, v * 1.6 + 2.2 * q2, 5);
        Hf[y * cols + x] = Math.sin(hh * 16) * 0.5 + 0.5;
      }
      for (y = 0; y < rows; y++) for (x = 0; x < cols; x++) {
        var l = Hf[y * cols + Math.max(0, x - 1)], r = Hf[y * cols + Math.min(cols - 1, x + 1)];
        var up = Hf[Math.max(0, y - 1) * cols + x], dn = Hf[Math.min(rows - 1, y + 1) * cols + x];
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
    cv.style.height = H + "px";
    cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
    cols = Math.ceil(W / cell); rows = Math.ceil(H / cell);
    small = document.createElement("canvas"); small.width = cols; small.height = rows;
    sctx = small.getContext("2d"); img = sctx.createImageData(cols, rows);
    E = new Float32Array(cols * rows);
    readBg(); genTone();
    draw(performance.now() - t0, 0);
  }

  function draw(t, dt) {
    var n = cols * rows, d = img.data, i, x, y;
    var dk = Math.pow(0.5, dt / P.linger);
    for (i = 0; i < n; i++) E[i] *= dk;
    var px = ptr.x, py = ptr.y, on = ptr.on;
    if (!on && P.ghost && t - lastInput > 3000) {
      on = true; var s = t / 1000;
      px = W * (0.5 + 0.3 * Math.sin(s * 0.45)); py = H * (0.5 + 0.26 * Math.sin(s * 0.31 + 1.2));
    }
    if (on) {
      var R = P.radius / cell, cx = px / cell, cy = py / cell;
      var y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(rows - 1, Math.ceil(cy + R));
      var x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(cols - 1, Math.ceil(cx + R));
      for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
        var f = 1 - Math.hypot(x - cx, y - cy) / R;
        if (f > 0) { var k = y * cols + x; E[k] = Math.min(1, E[k] + P.strength * f * f * dt * 6); }
      }
    }
    var ts = t / 1000, tick = Math.floor(ts * P.rate);
    for (y = 0; y < rows; y++) for (x = 0; x < cols; x++) {
      var k2 = y * cols + x, o = k2 * 4;
      var amb = P.hint * sm(Math.min(1, Math.max(0, (fbm(x / rows * 3 + (reduce ? 0 : ts * 0.05), y / rows * 3 - (reduce ? 0 : ts * 0.04), 3) - 0.5) / 0.25)));
      var p = amb + E[k2];
      if (p > 0.003 && h2(x + tick * 13.7, y + tick * 7.3) < p) {
        var g = bgGray + (tone[k2] * 255 - bgGray) * P.fig;
        g = g < 0 ? 0 : g > 255 ? 255 : g;
        d[o] = d[o + 1] = d[o + 2] = g; d[o + 3] = 255;
      } else d[o + 3] = 0;
    }
    sctx.putImageData(img, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = P.opacity;
    ctx.drawImage(small, 0, 0, cols * cell * dpr, rows * cell * dpr);
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    draw(now - t0, dt);
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf && visible && !document.hidden && !reduce) { last = performance.now(); raf = requestAnimationFrame(loop); } }

  function setPtr(e, down) {
    var r = cv.getBoundingClientRect();
    ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
    lastInput = performance.now() - t0;
    ptr.on = e.pointerType === "mouse" ? true : down;
    if (reduce) draw(lastInput, 0.25);
  }
  function inHero(e) { var r = cv.getBoundingClientRect(); return e.clientY >= r.top && e.clientY <= r.bottom; }
  main.addEventListener("pointermove", function (e) { if (inHero(e)) setPtr(e, e.pointerType !== "mouse" && ptr.on); else ptr.on = false; });
  main.addEventListener("pointerdown", function (e) { if (inHero(e)) setPtr(e, true); });
  main.addEventListener("pointerleave", function () { ptr.on = false; });
  window.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") ptr.on = false; });
  window.addEventListener("pointercancel", function () { ptr.on = false; });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }, { threshold: 0 }).observe(hero);
  }
  document.addEventListener("visibilitychange", start);

  var rt = 0;
  function rebuild() { clearTimeout(rt); rt = setTimeout(function () { build(); start(); }, 150); }
  if ("ResizeObserver" in window) new ResizeObserver(rebuild).observe(hero);
  else window.addEventListener("resize", rebuild);

  new MutationObserver(function () { readBg(); if (reduce) draw(performance.now() - t0, 0); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { readBg(); });

  /* --- tuning panel (temporary) ----------------------------------------
     Open the site with #tune (or ?tune) to get sliders over the real hero.
     Values persist in this browser only; visitors never see any of this.
     Delete this block once the numbers are locked in above. */
  if (/[#?&]tune\b/.test(location.hash + location.search)) {
    var DEF = [["opacity", "Opacity", 0.1, 1, 0.05], ["cell", "Cell size (0 = auto)", 0, 20, 1], ["hint", "Idle hints", 0, 0.15, 0.005],
      ["radius", "Pointer radius", 60, 500, 5], ["strength", "Pointer density", 0.2, 1.5, 0.05], ["linger", "Linger (s)", 0.2, 4, 0.1],
      ["rate", "Shimmer rate", 0, 30, 1], ["fig", "Figure strength", 0.2, 1, 0.05], ["ghost", "Idle ghost", 0, 1, 1]];
    try { var sv = JSON.parse(localStorage.getItem("jj26-tune") || "null"); if (sv) DEF.forEach(function (a) { if (typeof sv[a[0]] === "number") P[a[0]] = sv[a[0]]; }); } catch (e) {}
    var pn = document.createElement("div");
    pn.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:60;width:min(17rem,calc(100vw - 24px));max-height:70vh;overflow:auto;padding:10px 12px;background:var(--paper-sunk);color:var(--ink);border:1px solid var(--rule);font:12px/1.4 var(--text)";
    var ro;
    function save() {
      try { localStorage.setItem("jj26-tune", JSON.stringify(P)); } catch (e) {}
      ro.textContent = DEF.map(function (a) { return a[0] + " " + P[a[0]]; }).join(" · ");
    }
    pn.innerHTML = '<strong style="display:block;margin-bottom:6px">Hero tuning</strong>';
    DEF.forEach(function (a) {
      var row = document.createElement("label");
      row.style.cssText = "display:grid;grid-template-columns:1fr auto;gap:2px 8px;margin:6px 0";
      row.innerHTML = "<span>" + a[1] + '</span><span class="v">' + P[a[0]] + '</span><input type="range" style="grid-column:1/-1;width:100%" min="' + a[2] + '" max="' + a[3] + '" step="' + a[4] + '" value="' + P[a[0]] + '">';
      var inp = row.querySelector("input"), v = row.querySelector(".v");
      inp.addEventListener("input", function () {
        P[a[0]] = parseFloat(inp.value); v.textContent = P[a[0]]; save();
        if (a[0] === "cell") build();
        if (reduce) draw(performance.now() - t0, 0);
      });
      pn.appendChild(row);
    });
    var up = document.createElement("div");
    up.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;margin-top:8px";
    up.innerHTML = '<button type="button" id="tuneUp" style="padding:4px 10px;border:1px solid var(--rule);background:none;color:inherit;font:inherit;cursor:pointer">Upload still</button><input id="tuneFile" type="file" accept="image/*" style="display:none"><button type="button" id="tuneClear" style="padding:4px 10px;border:1px solid var(--rule);background:none;color:inherit;font:inherit;cursor:pointer">Use generated folds</button>';
    pn.appendChild(up);
    function applyStill(im) { userImg = im; if (cols) genTone(); }
    function loadStill(src) { var im = new Image(); im.onload = function () { applyStill(im); }; im.src = src; }
    up.querySelector("#tuneUp").addEventListener("click", function () { up.querySelector("#tuneFile").click(); });
    up.querySelector("#tuneFile").addEventListener("change", function (e) {
      var f = e.target.files[0]; if (!f || !/^image\//.test(f.type)) return;
      var fr = new FileReader();
      fr.onload = function () {
        var im = new Image();
        im.onload = function () {
          applyStill(im);
          try {
            var m = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement("canvas");
            c.width = Math.round(im.width * m); c.height = Math.round(im.height * m);
            c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
            localStorage.setItem("jj26-tune-still", c.toDataURL("image/jpeg", 0.85));
          } catch (err) {}
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(f);
    });
    up.querySelector("#tuneClear").addEventListener("click", function () {
      userImg = null; if (cols) genTone();
      try { localStorage.removeItem("jj26-tune-still"); } catch (err) {}
    });
    try { var sst = localStorage.getItem("jj26-tune-still"); if (sst) loadStill(sst); } catch (e) {}
    ro = document.createElement("code");
    ro.style.cssText = "display:block;margin-top:8px;color:var(--ink-soft);user-select:all;word-break:break-word";
    pn.appendChild(ro); document.body.appendChild(pn); save();
  }

  function go() { build(); start(); }
  var still = cv.getAttribute("data-still");
  if (still) {
    var im = new Image();
    im.onload = function () { userImg = im; go(); };
    im.onerror = go;
    im.src = still;
  } else go();
})();
