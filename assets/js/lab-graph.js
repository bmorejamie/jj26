/* ---------------------------------------------------------------------------
   Lab, Graph view.

   The Lab list is the content. This file reads that list out of the DOM
   (entries, their tags, their links) and shows the same thing as a graph
   floating in 3D: entries and tags as nodes, entry-to-tag edges, and a faint
   thread through the entries in number order. Nothing is duplicated here.

   Canvas 2D with a hand-rolled perspective projection, no libraries.
   Colours come from the CSS custom properties at draw time and are re-read
   when the theme changes. The loop only runs while the graph is visible.
   --------------------------------------------------------------------------- */
(function () {
  "use strict";

  var root = document.documentElement;
  var feed = document.querySelector(".feed");
  var pane = document.getElementById("lab-graph");
  var timeline = document.getElementById("lab-timeline");
  var switchEl = document.querySelector(".lab-switch");
  if (!feed || !pane || !timeline || !switchEl) return;

  var canvas = pane.querySelector("canvas");
  var stage = pane.querySelector(".lab-graph__stage");
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = reducedMq.matches;
  var STORE = "jj26-lab-view";

  /* --- easing: the site's --ease, cubic-bezier(0.22, 1, 0.36, 1) --------- */
  function bezier(x1, y1, x2, y2) {
    function c(a, b, t) { var u = 1 - t; return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t; }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var lo = 0, hi = 1, t = x, i;
      for (i = 0; i < 24; i++) {
        t = (lo + hi) / 2;
        if (c(x1, x2, t) < x) lo = t; else hi = t;
      }
      return c(y1, y2, t);
    };
  }
  var ease = bezier(0.22, 1, 0.36, 1);

  /* --- read the graph out of the feed ------------------------------------ */
  var nodes = [], edges = [], threads = [], tagByHref = {};

  function text(el, sel) {
    var n = el.querySelector(sel);
    return n ? n.textContent.replace(/\s+/g, " ").trim() : "";
  }

  var items = feed.querySelectorAll(":scope > li");
  var entries = [];
  Array.prototype.forEach.call(items, function (li) {
    var a = li.querySelector("a");
    if (!a) return;
    var kindEl = li.querySelector(".feed__kind:not(.feed__date)");
    var n = {
      type: "entry",
      no: text(li, ".feed__no"),
      title: text(li, ".feed__title"),
      kind: kindEl ? kindEl.textContent.trim() : "",
      note: text(li, ".feed__note"),
      date: text(li, ".feed__date"),
      href: a.href,
      nb: []
    };
    n.label = n.no + "  " + n.title;
    nodes.push(n);
    entries.push(n);
    Array.prototype.forEach.call(li.querySelectorAll(".tags a"), function (t) {
      var key = t.href;
      var tn = tagByHref[key];
      if (!tn) {
        tn = tagByHref[key] = { type: "tag", label: t.textContent.trim(), title: t.textContent.trim(), href: key, nb: [] };
        nodes.push(tn);
      }
      edges.push([n, tn]);
      n.nb.push(tn); tn.nb.push(n);
    });
  });
  if (!entries.length) return;

  entries.sort(function (a, b) { return a.no < b.no ? -1 : a.no > b.no ? 1 : 0; });
  for (var ti = 1; ti < entries.length; ti++) threads.push([entries[ti - 1], entries[ti]]);

  /* --- 3D force layout, run to rest up front ------------------------------ */
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; }

  nodes.forEach(function (n) {
    n.x = rnd() * 120; n.y = rnd() * 120; n.z = rnd() * 120;
    n.vx = n.vy = n.vz = 0;
    n.f = 1;        /* focus factor, 1 = full strength */
    n.ft = 1;
  });

  function layout() {
    var i, j, k, a, b, dx, dy, dz, d2, d, f, alpha;
    var springs = [];
    edges.forEach(function (e) { springs.push([e[0], e[1], 110, 0.05]); });
    threads.forEach(function (e) { springs.push([e[0], e[1], 150, 0.02]); });
    for (k = 0; k < 420; k++) {
      alpha = Math.pow(1 - k / 420, 1.5) * 1 + 0.02;
      for (i = 0; i < nodes.length; i++) {
        for (j = i + 1; j < nodes.length; j++) {
          a = nodes[i]; b = nodes[j];
          dx = a.x - b.x; dy = a.y - b.y; dz = a.z - b.z;
          d2 = dx * dx + dy * dy + dz * dz + 0.5;
          d = Math.sqrt(d2);
          f = 9000 / d2 * alpha;
          dx /= d; dy /= d; dz /= d;
          a.vx += dx * f; a.vy += dy * f; a.vz += dz * f;
          b.vx -= dx * f; b.vy -= dy * f; b.vz -= dz * f;
        }
      }
      springs.forEach(function (s) {
        var p = s[0], q = s[1];
        var ex = q.x - p.x, ey = q.y - p.y, ez = q.z - p.z;
        var L = Math.sqrt(ex * ex + ey * ey + ez * ez) + 0.01;
        var g = (L - s[2]) * s[3] * alpha / L;
        p.vx += ex * g; p.vy += ey * g; p.vz += ez * g;
        q.vx -= ex * g; q.vy -= ey * g; q.vz -= ez * g;
      });
      nodes.forEach(function (n) {
        n.vx -= n.x * 0.012 * alpha; n.vy -= n.y * 0.012 * alpha; n.vz -= n.z * 0.012 * alpha;
        n.vx *= 0.82; n.vy *= 0.82; n.vz *= 0.82;
        n.x += n.vx; n.y += n.vy; n.z += n.vz;
      });
    }
    /* recentre */
    var cx = 0, cy = 0, cz = 0;
    nodes.forEach(function (n) { cx += n.x; cy += n.y; cz += n.z; });
    cx /= nodes.length; cy /= nodes.length; cz /= nodes.length;
    nodes.forEach(function (n) { n.x -= cx; n.y -= cy; n.z -= cz; });
  }
  layout();

  var radius = 1;
  nodes.forEach(function (n) {
    radius = Math.max(radius, Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z));
  });

  /* --- colours and type, read from the tokens ------------------------------ */
  var C = {};
  function readTokens() {
    var cs = getComputedStyle(root);
    function v(name, fb) { var s = cs.getPropertyValue(name).trim(); return s || fb; }
    C.paper = v("--paper", "#fff");
    C.ink = v("--ink", "#111");
    C.soft = v("--ink-soft", "#555");
    C.faint = v("--ink-faint", "#888");
    C.rule = v("--rule", "#ccc");
    C.signal = v("--signal", "#2C6B70");
    C.text = v("--text", "sans-serif");
    C.mono = v("--mono", "monospace");
    dirty = true;
    kick();
  }

  /* --- sizing --------------------------------------------------------------- */
  var W = 0, H = 0, dpr = 1;
  function resize() {
    var r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    dirty = true;
    kick();
  }

  /* --- view state -------------------------------------------------------------- */
  var yaw = 0.5, pitch = 0.28, vyaw = 0, vpitch = 0;
  var idle = 1;                 /* 0..1, how much of the slow orbit is on */
  var lastInput = -1e9;
  var bloomStart = null, bloom = reduced ? 1 : 0;
  var hover = null, selected = null;
  var dragging = false, moved = 0, lastX = 0, lastY = 0, lastT = 0;
  var active = false, onscreen = true, running = false, dirty = true, last = 0;
  var fadeIn = 1;
  var proj = [];

  function project() {
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    var fov = radius * 3.2;
    var fit = Math.min(W * 0.4, H * 0.42) / radius;
    var b = reduced ? 1 : ease(bloom);
    proj.length = 0;
    nodes.forEach(function (n) {
      var x = n.x * b, y = n.y * b, z = n.z * b;
      var x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      var y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      var s = fov / (fov + z2);
      n.px = W / 2 + x1 * fit * s;
      n.py = H / 2 + y2 * fit * s;
      n.s = s;
      n.depth = Math.max(0, Math.min(1, (z2 / radius + 1) / 2));   /* 0 near, 1 far */
      proj.push(n);
    });
  }

  function draw() {
    if (!W) return;
    var cx = ctx;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, W, H);
    project();
    var b = reduced ? 1 : Math.min(1, ease(bloom) * 1.4);
    var any = hover || selected;

    function nodeA(n) { return (0.3 + 0.7 * (1 - n.depth)) * n.f * b; }

    /* edges, far to near not needed: hairlines */
    cx.lineWidth = 1;
    function line(p, q, col, a) {
      cx.globalAlpha = a;
      cx.strokeStyle = col;
      cx.beginPath(); cx.moveTo(p.px, p.py); cx.lineTo(q.px, q.py); cx.stroke();
    }
    threads.forEach(function (e) {
      cx.setLineDash([2, 4]);
      line(e[0], e[1], C.faint, 0.45 * Math.min(e[0].f, e[1].f) * b);
    });
    cx.setLineDash([]);
    edges.forEach(function (e) {
      var a = (0.35 + 0.35 * (1 - (e[0].depth + e[1].depth) / 2)) * Math.min(e[0].f, e[1].f) * b;
      line(e[0], e[1], C.faint, a);
    });

    /* nodes, far first */
    var order = nodes.slice().sort(function (p, q) { return q.depth - p.depth; });
    order.forEach(function (n) {
      var a = nodeA(n);
      cx.globalAlpha = a;
      if (n.type === "entry") {
        var sz = 15 * n.s;
        cx.fillStyle = C.ink;
        rr(cx, n.px - sz / 2, n.py - sz / 2, sz, sz, sz * 0.3);
        cx.fill();
        n.r = sz * 0.75;
        label(n, n.label, "500 " + Math.round(13 * Math.max(0.8, n.s)) + "px " + C.text, C.ink, sz / 2 + 8, a);
      } else {
        var r = 3.2 * n.s;
        cx.fillStyle = C.signal;
        cx.beginPath(); cx.arc(n.px, n.py, r, 0, 6.2832); cx.fill();
        n.r = r + 4;
        label(n, n.label.toUpperCase(), "400 " + Math.round(10 * Math.max(0.85, n.s)) + "px " + C.mono, C.soft, r + 7, a, true);
      }
    });
    cx.globalAlpha = 1;
    if (any) placeTip(any);
  }

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function label(n, str, font, col, off, a, spaced) {
    ctx.font = font;
    ctx.fillStyle = col;
    ctx.textBaseline = "middle";
    if (spaced && "letterSpacing" in ctx) ctx.letterSpacing = "1px";
    var w = ctx.measureText(str).width;
    var x = n.px + off, align = "left";
    if (x + w > W - 12) { x = n.px - off; align = "right"; }
    ctx.textAlign = align;
    ctx.globalAlpha = a;
    ctx.fillText(str, x, n.py + 0.5);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  }

  /* --- tooltip ---------------------------------------------------------------- */
  var tip = document.createElement("div");
  tip.className = "lab-tip";
  tip.setAttribute("aria-hidden", "true");
  stage.appendChild(tip);
  var tipFor = null;

  function setTip(n) {
    if (n === tipFor) return;
    tipFor = n;
    if (!n) { tip.classList.remove("is-on"); return; }
    tip.textContent = "";
    function el(tag, cls, str) {
      var e = document.createElement(tag); e.className = cls; e.textContent = str; return e;
    }
    if (n.type === "entry") {
      var k = el("p", "lab-tip__k", "");
      k.appendChild(el("span", "", n.no + (n.kind ? "  " + n.kind : "")));
      k.appendChild(el("span", "", n.date));
      tip.appendChild(k);
      tip.appendChild(el("p", "lab-tip__t", n.title));
      if (n.note) tip.appendChild(el("p", "lab-tip__n", n.note));
    } else {
      tip.appendChild(el("p", "lab-tip__k", "Tag"));
      tip.appendChild(el("p", "lab-tip__t", n.title));
      tip.appendChild(el("p", "lab-tip__n", n.nb.length + (n.nb.length === 1 ? " entry" : " entries")));
    }
    tip.classList.add("is-on");
  }

  function placeTip(n) {
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var x = n.px + 18, y = n.py + 18;
    if (x + w > W - 8) x = n.px - 18 - w;
    if (x < 8) x = 8;
    if (y + h > H - 8) y = n.py - 18 - h;
    if (y < 8) y = 8;
    tip.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
  }

  /* --- focus (hover fade) ------------------------------------------------------- */
  function setFocus(n) {
    hover = n;
    var focus = n || selected;
    nodes.forEach(function (m) {
      m.ft = !focus || m === focus || focus.nb.indexOf(m) !== -1 ? 1 : 0.15;
      if (reduced) m.f = m.ft;
    });
    setTip(focus);
    dirty = true;
    kick();
  }

  function hit(x, y) {
    var best = null, bd = 1e9;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.px === undefined) continue;
      var d = Math.sqrt((n.px - x) * (n.px - x) + (n.py - y) * (n.py - y));
      var lim = Math.max(n.r || 10, 14);
      if (d < lim && d < bd) { best = n; bd = d; }
    }
    return best;
  }

  /* --- pointer ------------------------------------------------------------------ */
  function pos(e) {
    var r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  canvas.addEventListener("pointerdown", function (e) {
    dragging = true; moved = 0;
    lastX = e.clientX; lastY = e.clientY; lastT = e.timeStamp;
    vyaw = vpitch = 0;
    lastInput = performance.now();
    canvas.classList.add("is-drag");
    try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
    kick();
  });

  canvas.addEventListener("pointermove", function (e) {
    var p = pos(e);
    if (dragging) {
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      var dt = Math.max(8, e.timeStamp - lastT);
      moved += Math.abs(dx) + Math.abs(dy);
      var ay = dx * 0.006, ap = dy * 0.006;
      yaw += ay;
      if (e.pointerType === "mouse") pitch = Math.max(-1.25, Math.min(1.25, pitch + ap));
      vyaw = ay / dt * 1000;
      vpitch = e.pointerType === "mouse" ? ap / dt * 1000 : 0;
      lastX = e.clientX; lastY = e.clientY; lastT = e.timeStamp;
      lastInput = performance.now();
      dirty = true; kick();
    } else if (e.pointerType === "mouse") {
      var h = hit(p[0], p[1]);
      canvas.classList.toggle("is-hit", !!h);
      if (h !== hover) setFocus(h);
    }
  });

  function end(e) {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove("is-drag");
    lastInput = performance.now();
    if (reduced || e.type === "pointercancel") { vyaw = vpitch = 0; }
    if (e.type === "pointerup" && moved < 6) {
      var p = pos(e), h = hit(p[0], p[1]);
      if (h) {
        if (e.pointerType === "mouse" || selected === h) { window.location.href = h.href; return; }
        selected = h; setFocus(h);
      } else if (selected) { selected = null; setFocus(null); }
    }
    kick();
  }
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("pointerleave", function (e) {
    if (e.pointerType === "mouse" && !dragging) { canvas.classList.remove("is-hit"); setFocus(null); }
  });

  /* --- loop --------------------------------------------------------------------- */
  function shouldRun() { return active && onscreen && !document.hidden && W > 0; }

  function kick() {
    if (running || !shouldRun()) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  }

  function tick(now) {
    if (!shouldRun()) { running = false; return; }
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    var busy = false, k;

    if (!reduced) {
      if (bloomStart === null) bloomStart = now;
      bloom = Math.min(1, (now - bloomStart) / 700);
      if (bloom < 1) busy = true;

      /* inertia: exponential decay, ~450ms time constant */
      if (!dragging) {
        yaw += vyaw * dt; pitch = Math.max(-1.25, Math.min(1.25, pitch + vpitch * dt));
        k = Math.exp(-dt / 0.45);
        vyaw *= k; vpitch *= k;
        if (Math.abs(vyaw) < 0.005) vyaw = 0;
        if (Math.abs(vpitch) < 0.005) vpitch = 0;
        if (vyaw || vpitch) busy = true;
      }
      /* idle orbit: eases off while you touch or hover, back in after a beat */
      var want = (dragging || hover || selected || now - lastInput < 1600) ? 0 : 1;
      idle += (want - idle) * (1 - Math.exp(-dt / (want ? 0.9 : 0.25)));
      if (Math.abs(want - idle) < 0.001) idle = want;
      yaw += (Math.PI * 2 / 90) * idle * dt;
      busy = true;   /* the orbit never settles */
    }

    k = 1 - Math.exp(-dt / 0.09);
    nodes.forEach(function (n) {
      if (n.f !== n.ft) {
        n.f += (n.ft - n.f) * k;
        if (Math.abs(n.ft - n.f) < 0.004) n.f = n.ft;
        busy = true;
      }
    });

    if (fadeIn < 1) { fadeIn = Math.min(1, fadeIn + dt / 0.3); busy = true; }

    if (busy || dirty) { draw(); dirty = false; }
    if (busy) requestAnimationFrame(tick); else running = false;
  }

  /* --- observers ------------------------------------------------------------------ */
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      onscreen = es[es.length - 1].isIntersecting;
      if (onscreen) kick();
    }).observe(stage);
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) kick(); });

  new MutationObserver(readTokens).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  var dark = window.matchMedia("(prefers-color-scheme: dark)");
  function onScheme() { readTokens(); }
  if (dark.addEventListener) dark.addEventListener("change", onScheme);
  var onReduce = function () {
    reduced = reducedMq.matches;
    if (reduced) { bloom = 1; vyaw = vpitch = 0; nodes.forEach(function (n) { n.f = n.ft; }); }
    dirty = true; kick();
  };
  if (reducedMq.addEventListener) reducedMq.addEventListener("change", onReduce);

  /* --- the switch -------------------------------------------------------------------- */
  var buttons = switchEl.querySelectorAll(".lab-switch__b");
  var view = "timeline", swapping = null;

  function show(next, instant) {
    if (next === view && !instant) return;
    view = next;
    try { localStorage.setItem(STORE, next); } catch (x) {}
    Array.prototype.forEach.call(buttons, function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-view") === next ? "true" : "false");
    });
    var from = next === "graph" ? timeline : pane, to = next === "graph" ? pane : timeline;
    if (history.replaceState) {
      history.replaceState(null, "", next === "graph" ? "#graph" : location.pathname + location.search);
    }
    clearTimeout(swapping);
    function swap() {
      from.hidden = true; from.classList.remove("is-out");
      to.hidden = false; to.classList.add("is-out");
      active = next === "graph";
      if (active) { resize(); fadeIn = 1; if (!reduced) bloomStart = null; bloom = reduced ? 1 : 0; dirty = true; kick(); }
      /* two frames so the opacity transition has a start value */
      requestAnimationFrame(function () { requestAnimationFrame(function () { to.classList.remove("is-out"); }); });
    }
    if (instant) { swap(); return; }
    from.classList.add("is-out");
    swapping = setTimeout(swap, reduced ? 0 : 300);
  }

  Array.prototype.forEach.call(buttons, function (b) {
    b.addEventListener("click", function () { show(b.getAttribute("data-view")); });
  });

  readTokens();
  var start = "timeline";
  try { if (localStorage.getItem(STORE) === "graph") start = "graph"; } catch (x) {}
  if (location.hash === "#graph") start = "graph";
  if (start === "graph") show("graph", true);
  window.addEventListener("hashchange", function () { show(location.hash === "#graph" ? "graph" : "timeline"); });
})();
