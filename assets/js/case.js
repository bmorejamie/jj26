/* Case study pages: position in the work list, prev/next, and figure
   captions that report the capture width. All read from real data — the
   tag registry's order and the screenshot file names — never typed by hand. */
(function () {
  "use strict";
  var work = (window.JJ_ITEMS || []).filter(function (i) { return i.kind === "Work"; });
  var here = location.pathname.split("/").pop();
  var idx = -1;
  work.forEach(function (w, k) { if (w.url.split("/").pop() === here) idx = k; });
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  var pos = document.querySelector("[data-case-pos]");
  if (pos && idx > -1) pos.textContent = "Work · " + pad(idx + 1) + " / " + pad(work.length);

  var pager = document.querySelector("[data-case-pager]");
  if (pager && idx > -1 && work.length > 1) {
    var prev = work[(idx - 1 + work.length) % work.length], next = work[(idx + 1) % work.length];
    function link(w, dir) {
      return '<a class="bl' + (dir === "prev" ? " bl--back" : "") + '" href="' + w.url.split("/").pop() + '">' +
        (dir === "prev" ? '<span class="bl__a" aria-hidden="true">←</span>' : "") +
        '<span class="bl__t">' + w.title + "</span>" +
        (dir === "next" ? '<span class="bl__a" aria-hidden="true">→</span>' : "") + "</a>";
    }
    pager.innerHTML = '<span class="case__pager-k">Previous</span>' + link(prev, "prev") +
                      '<span class="case__pager-k case__pager-k--r">Next</span>' + link(next, "next");
  }

  /* "desktop-1440-viewport.jpg" → 1440 px. */
  Array.prototype.forEach.call(document.querySelectorAll(".plate"), function (fig) {
    var img = fig.querySelector("img"), cap = fig.querySelector("figcaption");
    if (!img || !cap) return;
    var m = (img.getAttribute("src") || "").match(/-(\d{3,4})-(viewport|full)/);
    if (!m) return;
    var w = document.createElement("span");
    w.className = "plate__w";
    w.textContent = m[1] + " px" + (m[2] === "full" ? " · full length" : "");
    cap.appendChild(w);
  });
})();
