/* moonwalker.js — the easter egg on the edition switch.
   On a flick, a 16-bit figure (tilted fedora, high-waters, white socks, one
   glove) builds itself out of square pixels the way the mark does, at the
   far right of the masthead so he bookends the mark on the far left. He
   faces into the page, moonwalks back two steps to the edge, spins, ends
   up on his toes tipping the hat, then breaks into a pixel sparkle while
   the edition changes. One dance per flick, ~1.45s. A silhouette, no face.

   Colour: the glove is the one bright pixel. It's always walled in by body
   pixels (added here if a frame leaves an edge open), so on the light
   edition it reads as white on a dark figure, not as a hole to the paper.
   On the dark edition the body steps down to --ink-soft so the glove stays
   the brightest thing. Palette lives in CSS (.mw), read off the canvas.

   Hard square pixels on a 16x24 grid, drawn crisp on a canvas
   (whole device pixels per sprite pixel, image-rendering: pixelated).
   The build uses the mark's motion: pulled in on a cubic ease-in for the
   first 32%, then settled on the site's expo-out, cubic-bezier(.22,1,.36,1).

   API: JJMoonwalker.dance(anchor, onFlip). onFlip runs as the sparkle
   starts. Reduced motion: no figure, onFlip runs at once.
   JJMoonwalker.speed scales time (0.25 = four times slower) for review. */
(function () {
  "use strict";

  /* "#" body, "o" glove, "s" sock. Drawn facing right; he dances mirrored,
     facing left into the page. */
  var F = {
    walkA: [
      ".......###......",
      "......#####.....",
      "......######....",
      ".....######.....",
      "........#####...",
      "........###.....",
      "........##......",
      ".......####.....",
      "......#####.....",
      "......#####.....",
      ".....######.....",
      ".....#.####.....",
      ".....#.###o#....",
      "......######....",
      "......####......",
      ".....##.##......",
      ".....##..##.....",
      "....##...##.....",
      "....##..##......",
      "...##...##......",
      "...ss...ss......",
      "...ss...ss......",
      "..###....##.....",
      ".####....###...."
    ],
    walkB: [
      ".......###......",
      "......#####.....",
      "......######....",
      ".....######.....",
      "........#####...",
      "........###.....",
      "........##......",
      ".......####.....",
      "......#####.....",
      "......#####.....",
      "......#####.....",
      "......#####.....",
      "......####o#....",
      "......######....",
      "......####......",
      "......##.##.....",
      "......##..##....",
      "......##..##....",
      "......##.##.....",
      "......##.##.....",
      "......ss.ss.....",
      "......ss.ss.....",
      ".....###.##.....",
      "....####.###...."
    ],
    spinS: [
      "......###.......",
      ".....#####......",
      ".....######.....",
      "....######......",
      ".......#####....",
      ".......###......",
      ".......##.......",
      "......####......",
      "......#####.....",
      "......##o##.....",
      "......#####.....",
      "......###.......",
      "......###.......",
      "......###.......",
      "......###.......",
      "......###.......",
      "......###.......",
      "......###.......",
      "......###.......",
      "......###.......",
      ".......ss.......",
      ".......ss.......",
      "......###.......",
      ".....####......."
    ],
    front: [
      "......####......",
      ".....######.....",
      ".....######.....",
      "....########....",
      "......####......",
      "......####......",
      ".......##.......",
      ".....######.....",
      "....########....",
      "....#.####.#....",
      "....#.####.#....",
      "....#o####.#....",
      "....######......",
      "......####......",
      "......####......",
      "......##.#......",
      "......##.#......",
      "......##.#......",
      "......##.#......",
      "......##.#......",
      "......ss.s......",
      "......ss.s......",
      ".....###.##.....",
      ".....###.##....."
    ],
    toe: [
      "......###.......",
      ".....#####......",
      ".....######.....",
      "....######o#....",
      ".......#####....",
      ".......#####....",
      ".......####.....",
      "......#####.....",
      "......####......",
      ".....#.###......",
      ".....#.###......",
      "....#..###......",
      "......###.......",
      "......####......",
      "......####......",
      ".......###......",
      ".......###......",
      "........##......",
      "........##......",
      "........##......",
      "........ss......",
      "........ss......",
      "........##......",
      "........##......"
    ]
  };



  var GW = 16, GH = 24;            // sprite grid
  var SW = 34, SH = 26;            // stage in sprite pixels: room for the glide and the sparkle
  var GLIDE = 8;                   // sprite pixels travelled backwards (rightwards) over the two steps
  var EDGE = 4;                    // spare stage right of where he stops, for the sparkle
  var FY = SH - GH;                // feet on the stage floor
  var X0 = SW - EDGE - GW - GLIDE, X1 = X0 + GLIDE;   // where he builds, where he stops

  /* Timeline, ms. */
  var BUILD = 260, STEP = 110, STEPS = 4, SPIN = 60, HOLD = 140, SPARK = 310;
  var T_WALK = BUILD, T_SPIN = T_WALK + STEP * STEPS, T_TOE = T_SPIN + SPIN * 5,
      T_SPARK = T_TOE + HOLD, T_END = T_SPARK + SPARK;

  /* k: 0 body, 1 sock, 2 glove. `face` = "left" mirrors the drawing. Any
     open side of the glove gets a body pixel so it's always walled in. */
  function parse(rows, face) {
    var g = rows.map(function (r) { return (face === "left" ? r.split("").reverse().join("") : r).split(""); });
    for (var y = 0; y < GH; y++) for (var x = 0; x < GW; x++) {
      if (g[y][x] !== "o") continue;
      [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d) {
        var yy = y + d[1], xx = x + d[0];
        if (yy >= 0 && yy < GH && xx >= 0 && xx < GW && g[yy][xx] === ".") g[yy][xx] = "#";
      });
    }
    var out = [];
    g.forEach(function (row, y) { row.forEach(function (c, x) {
      if (c !== ".") out.push({ x: x, y: y, k: c === "o" ? 2 : c === "s" ? 1 : 0 });
    }); });
    return out;
  }
  var P = {
    walkA: parse(F.walkA, "left"), walkB: parse(F.walkB, "left"),
    sideL: parse(F.spinS, "left"), front: parse(F.front),
    sideR: parse(F.spinS), back: parse(F.front, "left"),
    toe: parse(F.toe, "left")
  };
  var SPIN_SEQ = [P.sideL, P.front, P.sideR, P.back, P.sideL];

  /* The site's easing, cubic-bezier(0.22, 1, 0.36, 1) — same solver as the mark. */
  function easeOut(x) {
    var x1 = 0.22, y1 = 1, x2 = 0.36, y2 = 1;
    function at(t, a, b) { return ((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t * t + 3 * a * t; }
    function slope(t, a, b) { return 3 * (1 - 3 * b + 3 * a) * t * t + 2 * (3 * b - 6 * a) * t + 3 * a; }
    if (x <= 0) return 0; if (x >= 1) return 1;
    var t = x;
    for (var i = 0; i < 8; i++) { var s = slope(t, x1, x2); if (!s) break; t -= (at(t, x1, x2) - x) / s; }
    return at(t, y1, y2);
  }
  function easeIn(t) { return t * t * t; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* Build: a tight square of pixels, nearest pixel takes nearest cell. */
  function buildPlan() {
    var to = P.walkA, n = to.length, side = Math.ceil(Math.sqrt(n));
    var cx = X0 + GW / 2, cy = FY + GH * 0.55;
    var from = [];
    for (var i = 0; i < n; i++) from.push([cx - side / 2 + (i % side), cy - side / 2 + Math.floor(i / side)]);
    var pairs = [];
    from.forEach(function (f, i) { to.forEach(function (t, j) {
      var dx = f[0] - (t.x + X0), dy = f[1] - (t.y + FY); pairs.push([dx * dx + dy * dy, i, j]);
    }); });
    pairs.sort(function (p, q) { return p[0] - q[0]; });
    var used = {}, took = {}, plan = [];
    for (var k = 0; k < pairs.length; k++) {
      var p = pairs[k]; if (used[p[1]] || took[p[2]]) continue;
      used[p[1]] = took[p[2]] = true;
      var t = to[p[2]], f = from[p[1]];
      plan.push({ fx: f[0], fy: f[1], tx: t.x + X0, ty: t.y + FY, k: t.k,
                  mx: f[0] + (cx - f[0]) * 0.55, my: f[1] + (cy - f[1]) * 0.55, d: Math.sqrt(p[0]) });
    }
    var maxD = Math.max.apply(null, plan.map(function (q) { return q.d; })) || 1;
    plan.forEach(function (q) { q.delay = (q.d / maxD) * 0.16 * BUILD; });   // the mark's 0–16% spread
    return plan;
  }
  var PLAN = null;

  function sparkPlan(ox) {
    var cx = ox + GW / 2, cy = FY + GH * 0.45;
    var bits = P.toe.map(function (p) {
      var x = p.x + ox, y = p.y + FY, ang = Math.atan2(y - cy, x - cx) + 0.35 * Math.random();
      var dist = 2 + Math.random() * 5;
      return { x: x, y: y, k: p.k, vx: Math.cos(ang) * dist, vy: Math.sin(ang) * dist - 2 * Math.random(),
               delay: Math.random() * 90, dur: 170 + Math.random() * 60 };
    });
    var glints = [];
    for (var i = 0; i < 5; i++) glints.push({
      x: Math.round(cx - 7 + Math.random() * 14), y: Math.round(FY + 1 + Math.random() * (GH - 6)),
      delay: 20 + i * 45 + Math.random() * 20, dur: 160
    });
    return { bits: bits, glints: glints };
  }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var api = { speed: 1, dance: dance, frames: P, paintFrames: paintFrames };
  window.JJMoonwalker = api;

  /* He dances in the masthead's .mw-slot next to the switch (far right),
     or on the switch itself if there's no slot. */
  function setup(anchor) {
    var host = (anchor.parentNode && anchor.parentNode.querySelector(".mw-slot")) || anchor;
    var cv = host.querySelector("canvas.mw");
    if (!cv) {
      cv = document.createElement("canvas");
      cv.className = "mw"; cv.setAttribute("aria-hidden", "true");
      host.appendChild(cv);
    }
    var dpr = window.devicePixelRatio || 1, px = Math.max(1, Math.floor(1.5 * dpr));
    cv.width = SW * px; cv.height = SH * px;
    cv.style.width = (SW * px / dpr) + "px"; cv.style.height = (SH * px / dpr) + "px";
    return { cv: cv, ctx: cv.getContext("2d"), px: px };
  }

  /* .mw sets the palette as real colour properties so the browser resolves
     the tokens: color = body, border-top-color = socks, border-bottom-color
     = glove (no border is drawn). */
  function colours(cv) {
    var cs = getComputedStyle(cv);
    return [cs.color, cs.borderTopColor, cs.borderBottomColor];
  }

  function sq(s, col, x, y, scale) {
    var px = s.px, w = Math.max(0, Math.round(px * scale));
    if (!w) return;
    var off = (px - w) / 2;
    s.ctx.fillStyle = col;
    s.ctx.fillRect(Math.round(x * px + off), Math.round(y * px + off), w, w);
  }

  var running = [];   // one dance per anchor at a time; a new flick restarts it

  function dance(anchor, onFlip) {
    if (reduce.matches || !anchor) { if (onFlip) onFlip(); return; }
    var prev = running.filter(function (r) { return r.anchor === anchor; })[0];
    if (prev) prev.stop = true;   // superseded: the new dance does the flip
    var s = setup(anchor);
    if (!PLAN) PLAN = buildPlan();
    var run = { anchor: anchor, onFlip: onFlip, flipped: false, stop: false, spark: null };
    running = running.filter(function (r) { return r.anchor !== anchor; }).concat(run);
    s.cv.classList.add("is-on");
    var t0 = performance.now();

    function frame(now) {
      if (run.stop) return;
      var t = (now - t0) * api.speed;
      var c = colours(s.cv);
      s.ctx.clearRect(0, 0, s.cv.width, s.cv.height);
      var i, p, ox;

      if (t < T_WALK) {
        /* Build from the square, mark-style. */
        for (i = 0; i < PLAN.length; i++) {
          var q = PLAN[i], u = clamp01((t - q.delay) / (BUILD - 0.16 * BUILD)), split = 0.32, x, y, sc;
          if (u < split) {
            var e = easeIn(u / split);
            x = q.fx + (q.mx - q.fx) * e; y = q.fy + (q.my - q.fy) * e; sc = 0.82 * e;
          } else {
            var v = easeOut((u - split) / (1 - split));
            x = q.mx + (q.tx - q.mx) * v; y = q.my + (q.ty - q.my) * v; sc = 0.82 + 0.18 * v;
          }
          sq(s, c[q.k], x, y, sc);
        }
      } else if (t < T_SPARK) {
        var pose;
        if (t < T_SPIN) {
          /* Moonwalk: an even backwards glide, snapped to whole sprite pixels. */
          var w = (t - T_WALK) / (T_SPIN - T_WALK);
          ox = X0 + Math.round(GLIDE * w);
          pose = Math.floor((t - T_WALK) / STEP) % 2 ? P.walkB : P.walkA;
        } else {
          ox = X1;
          pose = t < T_TOE ? SPIN_SEQ[Math.min(4, Math.floor((t - T_SPIN) / SPIN))] : P.toe;
        }
        for (i = 0; i < pose.length; i++) { p = pose[i]; sq(s, c[p.k], p.x + ox, p.y + FY, 1); }
      } else if (t < T_END) {
        if (!run.flipped) { run.flipped = true; if (run.onFlip) run.onFlip(); c = colours(s.cv); }
        if (!run.spark) run.spark = sparkPlan(X1);
        var st = t - T_SPARK;
        run.spark.bits.forEach(function (b) {
          var u = clamp01((st - b.delay) / b.dur), m = easeOut(u);
          sq(s, c[b.k], b.x + b.vx * m, b.y + b.vy * m, 1 - easeIn(u));
        });
        run.spark.glints.forEach(function (g) {
          var u = (st - g.delay) / g.dur;
          if (u <= 0 || u >= 1) return;
          sq(s, c[0], g.x, g.y, 1);
          if (u > 0.25 && u < 0.75) {
            sq(s, c[0], g.x - 1, g.y, 1); sq(s, c[0], g.x + 1, g.y, 1);
            sq(s, c[0], g.x, g.y - 1, 1); sq(s, c[0], g.x, g.y + 1, 1);
          }
        });
      } else {
        if (!run.flipped) { run.flipped = true; if (run.onFlip) run.onFlip(); }
        s.cv.classList.remove("is-on");
        running = running.filter(function (r) { return r !== run; });
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* For the lab test page: every frame side by side at `px` device pixels per sprite pixel. */
  function paintFrames(cv, px) {
    var list = [P.walkA, P.walkB, P.sideL, P.front, P.sideR, P.back, P.toe];
    var gap = 4;
    cv.width = (list.length * (GW + gap) - gap) * px; cv.height = GH * px;
    var dpr = window.devicePixelRatio || 1;
    cv.style.width = cv.width / dpr + "px"; cv.style.height = cv.height / dpr + "px";
    var c = colours(cv), ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    list.forEach(function (pose, k) {
      pose.forEach(function (p) {
        ctx.fillStyle = c[p.k];
        ctx.fillRect((k * (GW + gap) + p.x) * px, p.y * px, px, px);
      });
    });
  }
})();
