/* --- edition switch: Working Day and Night ------------------------------
   Same three viewer states as before: an explicit choice stamps data-theme
   on the root; no choice stamps nothing and lets prefers-color-scheme
   decide. The stored choice, when there is one, wins in both directions.

   Markup: any [data-edition] group holding buttons with data-set="light" /
   "dark" (words or icons), plus an optional .wdn__frame, the hairline that
   slides to the pressed button. Every switch on the page stays in step.
   A flick answers at once (pressed state, hairline); the edition itself
   changes as the moonwalker dissolves, or straight away when he's absent
   or motion is reduced. */
(function () {
  "use strict";
  var root = document.documentElement;
  var groups = Array.prototype.slice.call(document.querySelectorAll("[data-edition]"));
  if (!groups.length) return;
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  var rm = window.matchMedia("(prefers-reduced-motion: reduce)");
  var KEY = "jj26-edition";

  try {
    var saved = localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") root.setAttribute("data-theme", saved);
  } catch (e) {}

  var pending = null;   // chosen, waiting for the dance to hand it over

  function current() {
    var t = root.getAttribute("data-theme");
    return t ? t : (mq.matches ? "dark" : "light");
  }
  function shown() { return pending || current(); }

  function place(g) {
    var f = g.querySelector(".wdn__frame"), on = g.querySelector('[aria-pressed="true"]');
    if (!f || !on) return;
    f.style.width = on.offsetWidth + "px";
    f.style.height = on.offsetHeight + "px";
    f.style.transform = "translate(" + on.offsetLeft + "px," + on.offsetTop + "px)";
  }

  function sync() {
    var s = shown();
    groups.forEach(function (g) {
      Array.prototype.forEach.call(g.querySelectorAll("[data-set]"), function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-set") === s));
      });
      place(g);
    });
  }

  function apply() {
    if (!pending) return;
    root.setAttribute("data-theme", pending);
    try { localStorage.setItem(KEY, pending); } catch (e) {}
    pending = null;
    sync();
  }

  groups.forEach(function (g) {
    g.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-set]") : null;
      if (!b || !g.contains(b)) return;
      var next = b.getAttribute("data-set");
      if (next === shown()) return;
      pending = next;
      sync();
      var mw = window.JJMoonwalker;
      if (mw && !rm.matches) mw.dance(g, apply); else apply();
    });
  });

  mq.addEventListener("change", sync);
  window.addEventListener("resize", sync);
  sync();
  /* Measure again once the mono face is in, then let the hairline move. */
  function ready() { sync(); groups.forEach(function (g) { g.classList.add("is-ready"); }); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { requestAnimationFrame(ready); });
  else requestAnimationFrame(ready);
})();
