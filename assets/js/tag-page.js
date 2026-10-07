/* tags.html — lists every Work + Lab item carrying ?t=<tag>. With no tag,
   lists everything. Reads the registry in tags.js; nothing here is hand-kept. */
(function () {
  "use strict";
  var TAGS = window.JJ_TAGS, ITEMS = window.JJ_ITEMS;
  var t = new URLSearchParams(location.search).get("t");
  if (t && !TAGS[t]) t = null;

  var list = t ? ITEMS.filter(function (i) { return i.tags.indexOf(t) > -1; }) : ITEMS;
  var work = list.filter(function (i) { return i.kind === "Work"; }).length;
  var lab = list.length - work;
  function n(k, one, many) { return k + " " + (k === 1 ? one : many); }

  if (t) {
    document.getElementById("tagName").textContent = TAGS[t];
    document.title = TAGS[t] + " — Jamie Jones";
  }
  var parts = [];
  if (work) parts.push(n(work, "project", "projects"));
  if (lab) parts.push(n(lab, "Lab entry", "Lab entries"));
  document.getElementById("tagCount").textContent = parts.join(" · ") + ".";

  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); }

  document.getElementById("tagResults").innerHTML = list.map(function (i, k) {
    return '<li><a href="' + i.url + '">' +
      '<span class="feed__no">' + String(k + 1).padStart(3, "0") + '</span>' +
      '<span><span class="feed__kind"' + (i.kind === "Work" ? ' data-kind="work"' : '') + '>' + i.kind + '</span>' +
      '<h2 class="feed__title">' + esc(i.title) + '</h2>' +
      '<p class="feed__note">' + esc(i.meta) + '</p></span></a></li>';
  }).join("");

  document.getElementById("tagAll").innerHTML = Object.keys(TAGS).map(function (k) {
    var c = ITEMS.filter(function (i) { return i.tags.indexOf(k) > -1; }).length;
    return '<li><a href="tags.html?t=' + k + '"' + (k === t ? ' aria-current="page"' : '') + '>' +
      TAGS[k] + ' <span class="tags__n">' + c + '</span></a></li>';
  }).join("");
})();
