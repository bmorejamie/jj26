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
