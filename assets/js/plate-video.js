/* ---------------------------------------------------------------------------
   Device videos can't be transparent, so each one ships a day cut and a night
   cut with the plate ground baked in. Pick the cut that matches the edition
   (explicit data-theme stamp first, system preference otherwise) and follow
   the switch when it flips.
--------------------------------------------------------------------------- */
(function () {
  var vids = [].slice.call(document.querySelectorAll("video[data-night]"));
  if (!vids.length) return;
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function isNight() {
    var t = root.getAttribute("data-theme");
    if (t === "dark" || t === "light") return t === "dark";
    return !!(mq && mq.matches);
  }

  function apply() {
    var night = isNight();
    vids.forEach(function (v) {
      var want = new URL(night ? v.getAttribute("data-night") : v.getAttribute("data-day"), location.href).href;
      var poster = new URL(night ? v.getAttribute("data-night-poster") : v.getAttribute("data-day-poster"), location.href).href;
      if (v.poster !== poster) v.poster = poster;
      if (v.currentSrc === want) return;
      var idle = v.paused && v.preload === "none";   // a lazy card video nobody has started yet
      v.setAttribute("src", want);   // the src attribute outranks the <source> list
      if (idle) return;              // leave the download to the card observer in site.js
      v.load();
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
  }

  apply();
  new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  if (mq && mq.addEventListener) mq.addEventListener("change", apply);
})();
