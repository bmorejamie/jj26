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
