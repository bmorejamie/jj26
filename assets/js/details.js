/* jj26 — the micro-detail layer. Every small label here reports something
   true (a count, a place, a time, a date); none of it is decoration. If a
   value can't be had, its label stays as the static fallback or hides. */
(function () {
  "use strict";

  /* Section counts: shown vs total, from the page and the tag registry. */
  var items = window.JJ_ITEMS || [];
  function total(kind) { return items.filter(function (i) { return i.kind === kind; }).length; }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  var w = document.querySelector('[data-count="work"]');
  if (w) {
    var shownW = document.querySelectorAll("#work .piece").length, allW = total("Work") || shownW;
    w.textContent = shownW < allW ? shownW + " of " + plural(allW, "project", "projects") : plural(allW, "project", "projects");
  }
  var l = document.querySelector('[data-count="lab"]');
  if (l) {
    var shownL = document.querySelectorAll("#lab .feed > li").length, allL = total("Lab") || shownL;
    l.textContent = shownL < allL ? "Latest " + shownL + " of " + allL : plural(allL, "entry", "entries");
  }

  /* Local time in Denver — useful next to "Say hello". */
  var clock = document.querySelector("[data-clock]");
  if (clock && window.Intl) {
    var fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    var tick = function () { clock.textContent = "Denver · " + fmt.format(new Date()); };
    tick(); setInterval(tick, 30000);
  }

  /* Last updated = the last commit to the site. Quietly absent if GitHub
     doesn't answer. */
  var up = document.querySelector("[data-updated]");
  if (up && window.fetch) {
    fetch("https://api.github.com/repos/bmorejamie/jj26/commits?sha=dev&per_page=1")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d[0]) return;
        var when = new Date(d[0].commit.committer.date);
        up.textContent = "Updated " + when.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " · ";
      })
      .catch(function () {});
  }
})();
