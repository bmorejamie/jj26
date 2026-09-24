/* jj26 — the only JS on the site. Two jobs: reveal on scroll, lift the
   masthead rule once you've left the top. No dependencies, no build. */
(function () {
  "use strict";

  document.documentElement.classList.remove("no-js");

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- entrances ------------------------------------------------------- */
  var risers = document.querySelectorAll(".rise");

  if (reduced || !("IntersectionObserver" in window)) {
    Array.prototype.forEach.call(risers, function (el) { el.classList.add("is-in"); });
  } else {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        seen.unobserve(entry.target);
      });
    }, {
      /* Fire a little before the element arrives so the settle finishes
         roughly as it reaches comfortable reading position. */
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.08
    });

    Array.prototype.forEach.call(risers, function (el) {
      /* Anything already on screen at load animates immediately in source
         order; everything else waits its turn. */
      seen.observe(el);
    });
  }

  /* --- masthead hairline ----------------------------------------------- */
  var masthead = document.querySelector(".masthead");
  if (masthead) {
    var lifted = false;
    var onScroll = function () {
      var should = window.scrollY > 12;
      if (should === lifted) return;
      lifted = should;
      masthead.setAttribute("data-lifted", String(should));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
})();

/* --- edition switch ---------------------------------------------------
   Three viewer states, not two: an explicit choice stamps data-theme on the
   root; "system" stamps nothing and lets prefers-color-scheme decide. The
   stored choice, when there is one, wins in both directions. */
(function () {
  "use strict";
  var root = document.documentElement;
  var btn = document.getElementById("edition");
  if (!btn) return;
  var label = document.getElementById("editionLabel");
  var mq = window.matchMedia("(prefers-color-scheme: dark)");

  try {
    var saved = localStorage.getItem("jj26-edition");
    if (saved === "dark" || saved === "light") root.setAttribute("data-theme", saved);
  } catch (e) {}

  function isDark() {
    var t = root.getAttribute("data-theme");
    return t ? t === "dark" : mq.matches;
  }
  function sync() { if (label) label.textContent = isDark() ? "Night" : "Day"; }

  btn.addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("jj26-edition", next); } catch (e) {}
    sync();
  });
  mq.addEventListener("change", sync);
  sync();
})();

/* Looping video cards hold still for people who've asked for less motion. */
(function () {
  "use strict";
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  Array.prototype.forEach.call(document.querySelectorAll("video[autoplay]"), function (v) {
    v.removeAttribute("autoplay");
    v.pause();
  });
})();

/* --- the mark ---------------------------------------------------------
   Machine pixels spelling human gestures. A square of dots gets pulled in
   on itself, then settles into a shape from the library in
   mark-shapes.js, holds, and goes home to the square. Hovering the name
   skips the wait. Reduced motion, or no library: the square stays put. */
(function () {
  "use strict";
  var lib = window.JJ_MARK;
  var svgs = document.querySelectorAll(".mark");
  if (!lib || !svgs.length) return;

  function toPts(s) {
    if (s.pts) return s.pts;
    var out = [];
    s.grid.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        if (row.charAt(x) === "#") out.push([x + (s.dx || 0), y + (s.dy || 0)]);
      }
    });
    return out;
  }
  var home = toPts(lib.home);
  var shapes = lib.shapes.map(toPts).filter(function (p) { return p.length; });
  var N = Math.max.apply(null, [home.length].concat(shapes.map(function (p) { return p.length; })));

  var DOT = 0.84, RX = 0.3;       // dot size in cells, corner radius
  var HOLD = 2400, MOVE = 1000;   // ms; slower than the prototype, it lives beside the name

  /* The site's easing, cubic-bezier(0.22, 1, 0.36, 1). */
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
  function d2(a, b) { return (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]); }

  /* Nearest dot takes nearest cell; spare dots stack on the closest cell. */
  function assign(from, to) {
    var pairs = [];
    from.forEach(function (f, i) { to.forEach(function (t, j) { pairs.push([d2(f, t), i, j]); }); });
    pairs.sort(function (p, q) { return p[0] - q[0]; });
    var dotTaken = {}, cellTaken = {}, out = new Array(from.length), n = 0;
    for (var k = 0; k < pairs.length && n < to.length; k++) {
      var p = pairs[k];
      if (dotTaken[p[1]] || cellTaken[p[2]]) continue;
      dotTaken[p[1]] = cellTaken[p[2]] = true; out[p[1]] = to[p[2]]; n++;
    }
    from.forEach(function (f, i) {
      if (out[i]) return;
      var best = to[0];
      to.forEach(function (t) { if (d2(f, t) < d2(f, best)) best = t; });
      out[i] = best;
    });
    return out;
  }

  var pos = assign(home.concat(home).slice(0, N), home).map(function (p) { return p.slice(); });

  var NS = "http://www.w3.org/2000/svg";
  var rects = Array.prototype.map.call(svgs, function (svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);   // drop the no-JS square
    var list = [];
    for (var i = 0; i < N; i++) {
      var r = document.createElementNS(NS, "rect");
      r.setAttribute("rx", RX);
      svg.appendChild(r); list.push(r);
    }
    return list;
  });

  function draw(scales) {
    rects.forEach(function (list) {
      list.forEach(function (r, i) {
        var s = DOT * (scales ? scales[i] : 1), off = (1 - s) / 2;
        r.setAttribute("x", (pos[i][0] + off).toFixed(3));
        r.setAttribute("y", (pos[i][1] + off).toFixed(3));
        r.setAttribute("width", s.toFixed(3));
        r.setAttribute("height", s.toFixed(3));
      });
    });
  }
  draw();

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !shapes.length) return;

  var atHome = true, last = -1;
  var phase = "hold", clock = 0, prev = null, from, to, mid, delays;

  function nextTarget() {
    if (!atHome) return home;
    var i = Math.floor(Math.random() * shapes.length);
    if (shapes.length > 1 && i === last) i = (i + 1) % shapes.length;
    last = i;
    return shapes[i];
  }

  function startMove() {
    from = pos.map(function (p) { return p.slice(); });
    to = assign(from, nextTarget());
    atHome = !atHome;
    var cx = 0, cy = 0;
    from.forEach(function (p) { cx += p[0]; cy += p[1]; });
    cx /= from.length; cy /= from.length;
    /* "Pulled into each other": every dot first heads 55% of the way in. */
    mid = from.map(function (p) { return [p[0] + (cx - p[0]) * 0.55, p[1] + (cy - p[1]) * 0.55]; });
    var dists = to.map(function (t, i) { return Math.sqrt(d2(t, from[i])); });
    var maxD = Math.max.apply(null, dists) || 1;
    delays = dists.map(function (d) { return (d / maxD) * 160; });   // farther dots leave a touch later
    phase = "move"; clock = 0;
  }

  function tick(now) {
    var dt = prev == null ? 0 : Math.min(now - prev, 100);   // no lurch after a background tab
    prev = now; clock += dt;
    if (phase === "hold" && clock >= HOLD) startMove();
    else if (phase === "move") {
      var scales = [];
      for (var i = 0; i < N; i++) {
        var t = Math.min(1, Math.max(0, (clock - delays[i]) / MOVE)), split = 0.32;
        if (t < split) {
          var u = easeIn(t / split);
          pos[i] = [from[i][0] + (mid[i][0] - from[i][0]) * u, from[i][1] + (mid[i][1] - from[i][1]) * u];
          scales.push(1 - 0.18 * u);
        } else {
          var v = easeOut((t - split) / (1 - split));
          pos[i] = [mid[i][0] + (to[i][0] - mid[i][0]) * v, mid[i][1] + (to[i][1] - mid[i][1]) * v];
          scales.push(0.82 + 0.18 * v);
        }
      }
      draw(scales);
      if (clock >= MOVE + 160) {
        pos = to.map(function (p) { return p.slice(); });
        draw(); phase = "hold"; clock = 0;
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  var word = document.querySelector(".wordmark");
  if (word) word.addEventListener("mouseenter", function () {
    if (phase === "hold") clock = HOLD;
  });
})();
