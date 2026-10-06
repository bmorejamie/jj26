/* ---------------------------------------------------------------------------
   Live 3D devices — tuning panel (dev tool, not for visitors).

   Loaded only when the page URL has ?tune (devices-3d.js adds this script
   once the scene is up), so it costs nothing otherwise. Edits the scene's
   CONFIG live: camera, each device's start/end pose, scale, parallax speed
   and depth, shadow, motion, and the day and night colours. "Copy values"
   puts the whole lot on the clipboard as JSON, ready to bake in as the
   defaults (DEFAULTS in devices-3d.js; colours go to the --device tokens
   in site.css). Settings persist in this browser until Reset.

   The panel edits whichever composition is showing: "wide" (the 16:10
   plate) or "narrow" (the 4:5 plate below 46rem). Resize to switch.
--------------------------------------------------------------------------- */
(function () {
  "use strict";
  /* One panel, one scene at a time. A page with several scenes (ALPA has two)
     gets a piece switcher; each scene keeps its own values and its own
     saved settings (data-project). */
  var hosts = window.__devices3dHosts || [];
  var host, api, C;
  var root = document.documentElement;

  /* Token values for the edition not on screen (the one on screen is read
     live). Keep in step with the --device tokens in site.css. */
  var TOKENS = {
    day:   { plate: "#e8e9e6", body: "#fbfbfa", bezel: "#eaeae7" },
    night: { plate: "#1c1c1f", body: "#2e2e32", bezel: "#262629" }
  };

  /* --- styles: square, minimal, the site's own type and tokens -------- */
  var css = [
    ".d3t, .d3t * { box-sizing: border-box; border-radius: 0 !important; }",
    ".d3t { position: fixed; top: 0; right: 0; bottom: 0; width: 340px; z-index: 2147483000;",
    "  overflow-y: auto; overscroll-behavior: contain; background: var(--paper-sunk); color: var(--ink);",
    "  border-left: 1px solid var(--rule); font: 11px/1.45 var(--mono); padding: 0 0 2rem; }",
    ".d3t[hidden] { display: none; }",
    ".d3t__head { position: sticky; top: 0; z-index: 1; background: var(--paper-sunk); border-bottom: 1px solid var(--rule);",
    "  padding: 0.85rem 1rem 0.75rem; }",
    ".d3t__title { font: 600 12px/1.2 var(--text); letter-spacing: 0.09em; text-transform: uppercase; margin: 0 0 0.5rem;",
    "  display: flex; justify-content: space-between; align-items: baseline; }",
    ".d3t__meta { color: var(--ink-soft); margin: 0 0 0.6rem; }",
    ".d3t__row { display: grid; grid-template-columns: 7.6rem 1fr 3.6rem; gap: 0.5rem; align-items: center; padding: 0.18rem 1rem; }",
    ".d3t__row label { color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
    ".d3t input[type=range] { width: 100%; height: 14px; margin: 0; background: transparent; -webkit-appearance: none; appearance: none; cursor: pointer; }",
    ".d3t input[type=range]::-webkit-slider-runnable-track { height: 1px; background: var(--rule); }",
    ".d3t input[type=range]::-moz-range-track { height: 1px; background: var(--rule); }",
    ".d3t input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 9px; height: 13px; margin-top: -6px; background: var(--ink); border: 0; }",
    ".d3t input[type=range]::-moz-range-thumb { width: 9px; height: 13px; background: var(--ink); border: 0; border-radius: 0; }",
    ".d3t input[type=range]:focus-visible { outline: 1px solid var(--ink); outline-offset: 2px; }",
    ".d3t input[type=number] { width: 100%; font: inherit; color: inherit; background: transparent;",
    "  border: 1px solid var(--rule); padding: 0.1rem 0.25rem; -moz-appearance: textfield; }",
    ".d3t input[type=number]::-webkit-inner-spin-button { display: none; }",
    ".d3t input[type=checkbox] { -webkit-appearance: none; appearance: none; width: 11px; height: 11px; margin: 0; border: 1px solid var(--ink); background: transparent; cursor: pointer; vertical-align: -1px; }",
    ".d3t input[type=checkbox]:checked { background: var(--ink); box-shadow: inset 0 0 0 2px var(--paper-sunk); }",
    ".d3t input[type=color] { width: 100%; height: 1.4rem; padding: 0; border: 1px solid var(--rule); background: none; cursor: pointer; }",
    ".d3t input[type=color]::-webkit-color-swatch-wrapper { padding: 0; }",
    ".d3t input[type=color]::-webkit-color-swatch { border: 0; }",
    ".d3t__hex { color: var(--ink-faint); }",
    ".d3t details { border-bottom: 1px solid var(--rule); }",
    ".d3t summary { cursor: pointer; list-style: none; padding: 0.7rem 1rem; font: 600 11px/1 var(--text);",
    "  letter-spacing: 0.09em; text-transform: uppercase; }",
    ".d3t summary::-webkit-details-marker { display: none; }",
    ".d3t summary::after { content: '+'; float: right; font-family: var(--mono); color: var(--ink-faint); }",
    ".d3t details[open] summary::after { content: '\\2212'; }",
    ".d3t details > div { padding-bottom: 0.6rem; }",
    ".d3t__pick { margin: 0 0 0.6rem; }",
    ".d3t__sub { padding: 0.5rem 1rem 0.15rem; color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.09em; }",
    ".d3t__btns { display: flex; gap: 0.5rem; flex-wrap: wrap; }",
    ".d3t button, .d3t-toggle { font: 500 11px/1 var(--mono); letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer;",
    "  color: var(--ink); background: transparent; border: 1px solid var(--ink); padding: 0.45rem 0.6rem; }",
    ".d3t button:hover, .d3t-toggle:hover { background: var(--ink); color: var(--paper-sunk); }",
    ".d3t button.is-quiet { border-color: var(--rule); color: var(--ink-soft); }",
    ".d3t__scrub { display: grid; grid-template-columns: auto 1fr 3.6rem; gap: 0.5rem; align-items: center; margin-top: 0.6rem; }",
    ".d3t__scrub label { color: var(--ink-soft); display: flex; gap: 0.35rem; align-items: center; }",
    ".d3t textarea { width: calc(100% - 2rem); margin: 0.5rem 1rem 0; height: 10rem; font: 10px/1.35 var(--mono);",
    "  color: inherit; background: var(--paper); border: 1px solid var(--rule); padding: 0.4rem; }",
    ".d3t-toggle { position: fixed; right: 1rem; bottom: 1rem; z-index: 2147483000; background: var(--paper-sunk); }"
  ].join("\n");
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") e.textContent = attrs[k];
      else if (k === "on") Object.keys(attrs.on).forEach(function (ev) { e.addEventListener(ev, attrs.on[ev]); });
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  var panel = el("aside", { "class": "d3t", "aria-label": "Devices 3D tuning" });
  var toggle = el("button", { "class": "d3t-toggle", type: "button", text: "Tune" });
  document.body.appendChild(panel);
  document.body.appendChild(toggle);
  var HIDE = "jj26-devices3d-tune-hidden";
  function setHidden(h) {
    panel.hidden = h; toggle.hidden = !h;
    try { localStorage.setItem(HIDE, h ? "1" : ""); } catch (e) {}
  }
  toggle.addEventListener("click", function () { setHidden(false); });

  function save() { try { localStorage.setItem(api.store, JSON.stringify(C)); } catch (e) {} }
  function changed() { save(); api.update(); }

  /* --- controls ---------------------------------------------------------- */
  function decimals(step) { var s = String(step); return s.indexOf(".") < 0 ? 0 : s.length - s.indexOf(".") - 1; }
  function slider(label, get, set, min, max, step) {
    var r = el("input", { type: "range", min: min, max: max, step: step });
    var n = el("input", { type: "number", min: min, max: max, step: step });
    var d = decimals(step);
    function show(v) { r.value = v; n.value = (+v).toFixed(d); }
    show(get());
    r.addEventListener("input", function () { set(+r.value); n.value = (+r.value).toFixed(d); changed(); });
    n.addEventListener("change", function () { var v = +n.value; if (isNaN(v)) return; set(v); r.value = v; changed(); });
    var row = el("div", { "class": "d3t__row" }, [el("label", { text: label, title: label }), r, n]);
    row.refresh = function () { show(get()); };
    return row;
  }
  function colour(label, edition, key) {
    var c = el("input", { type: "color" });
    var hx = el("span", { "class": "d3t__hex" });
    function eff() {
      var o = C.colors[edition][key];
      if (o) return o;
      if (api.edition() === edition) return api.tokens()[key];
      return TOKENS[edition][key];
    }
    function show() { var v = eff(); c.value = v; hx.textContent = v.replace("#", ""); }
    show();
    c.addEventListener("input", function () { C.colors[edition][key] = c.value; hx.textContent = c.value.replace("#", ""); changed(); });
    var row = el("div", { "class": "d3t__row" }, [el("label", { text: label }), c, hx]);
    row.refresh = show;
    return row;
  }
  function section(title, rows, open) {
    var d = el("details", open ? { open: "" } : null, [el("summary", { text: title }), el("div", null, rows)]);
    return d;
  }
  function sub(t) { return el("div", { "class": "d3t__sub", text: t }); }

  var rows = [];
  function track(r) { rows.push(r); return r; }
  function m() { return C[api.mode()]; }

  function deviceRows(name, withLid) {
    var out = [];
    var AX = ["X", "Y", "Z"];
    [["start", "Start"], ["end", "End"]].forEach(function (se) {
      out.push(sub(se[1] + " position (cm)"));
      AX.forEach(function (a, i) {
        out.push(track(slider(a, function () { return m()[name][se[0]].p[i]; },
          function (v) { m()[name][se[0]].p[i] = v; }, i === 2 ? 0 : -60, i === 2 ? 90 : 60, 0.5)));
      });
      out.push(sub(se[1] + " rotation (deg)"));
      [["Tilt X (pitch)", 0], ["Turn Y (yaw)", 1], ["Spin Z (roll)", 2]].forEach(function (rr) {
        out.push(track(slider(rr[0], function () { return m()[name][se[0]].r[rr[1]]; },
          function (v) { m()[name][se[0]].r[rr[1]] = v; }, -90, 90, 0.5)));
      });
    });
    out.push(sub("Scale and parallax"));
    out.push(track(slider("Scale", function () { return m()[name].scale; }, function (v) { m()[name].scale = v; }, 0.3, 2.5, 0.01)));
    out.push(track(slider("Parallax speed", function () { return m()[name].speed; }, function (v) { m()[name].speed = v; }, 0, 3, 0.05)));
    out.push(track(slider("Depth (+z cm)", function () { return m()[name].depth; }, function (v) { m()[name].depth = v; }, -30, 40, 0.5)));
    if (withLid) out.push(track(slider("Lid angle", function () { return m()[name].lid; }, function (v) { m()[name].lid = v; }, 90, 135, 0.5)));
    return out;
  }

  /* --- mounting ------------------------------------------------------------ */
  var pollId = 0, refreshCurrent = function () {}, watched = [];
  function pieceName(h, i) { return (i + 1) + " \u00b7 " + (h.getAttribute("data-project") || "piece"); }
  function mount(h) {
    host = h; api = h.__devices3d; C = api.config; rows = [];
    clearInterval(pollId);
    panel.textContent = "";
  /* --- header ------------------------------------------------------------ */
    var modeText = el("p", { "class": "d3t__meta" });
    function showMode() {
      modeText.textContent = "Editing: " + (api.mode() === "wide" ? "WIDE — 16:10 plate (desktop)" : "NARROW — 4:5 plate (below 46rem)") +
        " · " + (api.edition() === "night" ? "Night" : "Day") + " edition";
    }
    var scrubOn = el("input", { type: "checkbox" });
    var scrubR = el("input", { type: "range", min: 0, max: 1, step: 0.001, value: 0.5 });
    var scrubN = el("input", { type: "number", min: 0, max: 1, step: 0.001, value: "0.500" });
    function applyScrub() { api.scrub(scrubOn.checked ? +scrubR.value : null); }
    scrubOn.addEventListener("change", function () { if (scrubOn.checked) { scrubR.value = api.progress(); scrubN.value = (+scrubR.value).toFixed(3); } applyScrub(); });
    scrubR.addEventListener("input", function () { scrubOn.checked = true; scrubN.value = (+scrubR.value).toFixed(3); applyScrub(); });
    scrubN.addEventListener("change", function () { scrubOn.checked = true; scrubR.value = +scrubN.value; applyScrub(); });
    /* While not scrubbing, the slider follows the real scroll. */
    pollId = setInterval(function () {
      if (panel.hidden || scrubOn.checked) return;
      var p = api.progress(); scrubR.value = p; scrubN.value = p.toFixed(3);
    }, 120);
  
    var out = el("textarea", { readonly: "", hidden: "" });
    var copyBtn = el("button", { type: "button", text: "Copy values" });
    copyBtn.addEventListener("click", function () {
      var json = JSON.stringify(C, null, 2);
      function done(ok) {
        copyBtn.textContent = ok ? "Copied" : "Select + copy below";
        setTimeout(function () { copyBtn.textContent = "Copy values"; }, 1600);
        if (!ok) { out.hidden = false; out.value = json; out.focus(); out.select(); }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(json).then(function () { done(true); }, function () { done(false); });
      else done(false);
    });
    var resetBtn = el("button", { type: "button", "class": "is-quiet", text: "Reset" });
    resetBtn.addEventListener("click", function () {
      var d = JSON.parse(JSON.stringify(api.defaults));
      Object.keys(d).forEach(function (k) { C[k] = d[k]; });
      try { localStorage.removeItem(api.store); } catch (e) {}
      api.update(); refreshAll();
    });
    var hideBtn = el("button", { type: "button", "class": "is-quiet", text: "Hide" });
    hideBtn.addEventListener("click", function () { setHidden(true); });
  
    var picker = null;
    if (hosts.length > 1) {
      picker = el("div", { "class": "d3t__btns d3t__pick" }, hosts.map(function (x, i) {
        var b = el("button", { type: "button", "class": x === h ? "" : "is-quiet", text: pieceName(x, i) });
        b.addEventListener("click", function () { mount(x); x.scrollIntoView({ block: "center" }); });
        return b;
      }));
    }
    var head = el("div", { "class": "d3t__head" }, [
      el("p", { "class": "d3t__title" }, [el("span", { text: "Devices 3D — tune" })]),
      picker,
      modeText,
      el("div", { "class": "d3t__btns" }, [copyBtn, resetBtn, hideBtn]),
      el("div", { "class": "d3t__scrub" }, [el("label", null, [scrubOn, el("span", { text: "Scrub" })]), scrubR, scrubN])
    ]);
  
    /* --- sections ----------------------------------------------------------- */
    var sections = [
      section("Camera", [
        track(slider("FOV (deg)", function () { return m().cam.fov; }, function (v) { m().cam.fov = v; }, 8, 60, 0.5)),
        track(slider("Distance / zoom", function () { return m().cam.dist; }, function (v) { m().cam.dist = v; }, 40, 320, 1)),
        track(slider("Frame X (cm)", function () { return m().cam.x; }, function (v) { m().cam.x = v; }, -40, 40, 0.5)),
        track(slider("Frame Y (cm)", function () { return m().cam.y; }, function (v) { m().cam.y = v; }, -40, 40, 0.5))
      ], true),
      api.devices.indexOf("laptop") >= 0 ? section("Laptop", deviceRows("laptop", true)) : null,
      api.devices.indexOf("phone") >= 0 ? section("Phone", deviceRows("phone", false)) : null,
      api.devices.indexOf("phone2") >= 0 ? section("Phone 2", deviceRows("phone2", false)) : null,
      section("Shadow", [
        track(slider("Opacity", function () { return C.shadow.opacity; }, function (v) { C.shadow.opacity = v; }, 0, 1, 0.01)),
        track(slider("Blur (cm @15)", function () { return C.shadow.blur; }, function (v) { C.shadow.blur = v; }, 0, 30, 0.1)),
        track(slider("Offset X /10cm", function () { return C.shadow.x; }, function (v) { C.shadow.x = v; }, -15, 15, 0.1)),
        track(slider("Offset Y /10cm", function () { return C.shadow.y; }, function (v) { C.shadow.y = v; }, -15, 15, 0.1)),
        track(slider("Spread (cm)", function () { return C.shadow.spread; }, function (v) { C.shadow.spread = v; }, -10, 20, 0.1))
      ], true),
      section("Motion", [
        track(slider("Damping (1/s)", function () { return C.motion.damping; }, function (v) { C.motion.damping = v; }, 0.5, 20, 0.1)),
        track(slider("Easing", function () { return C.motion.ease; }, function (v) { C.motion.ease = v; }, 0, 1, 0.01))
      ]),
      section("Colour", [
        sub("Day"),
        track(colour("Plate", "day", "plate")), track(colour("Body (clay)", "day", "body")), track(colour("Bezel", "day", "bezel")),
        sub("Night"),
        track(colour("Plate", "night", "plate")), track(colour("Body (clay)", "night", "body")), track(colour("Bezel", "night", "bezel")),
        sub("Both"),
        track(slider("Hairline", function () { return C.hairline; }, function (v) { C.hairline = v; }, 0, 1, 0.01))
      ])
    ];
    [head].concat(sections.filter(Boolean)).concat([out]).forEach(function (n) { panel.appendChild(n); });
    function refreshAll() { showMode(); rows.forEach(function (r) { if (r.refresh) r.refresh(); }); }
    refreshCurrent = refreshAll;
    refreshAll();
  
  }
  function watch(h) {
    if (watched.indexOf(h) >= 0) return;
    watched.push(h);
    h.addEventListener("devices3d:mode", function () { if (h === host) refreshCurrent(); });
  }
  new MutationObserver(function () { setTimeout(function () { refreshCurrent(); }, 0); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  /* devices-3d.js calls add() each time another scene is ready. */
  window.__devices3dTune = {
    add: function () {
      hosts.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });
      hosts.forEach(watch);
      mount(host || hosts[0]);
    }
  };
  var hidden = false;
  try { hidden = !!localStorage.getItem(HIDE); } catch (e) {}
  setHidden(hidden);
  window.__devices3dTune.add();
})();
