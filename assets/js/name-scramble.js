/* name-scramble.js — hover/tap text scramble for the jj26 nav wordmark.
   No dependencies, no build. ~4 KB.

   Wire-up (real site, index.html masthead):

     <a class="wordmark" href="./" data-scramble>
       <svg class="mark" ...>...</svg><span data-scramble-text>Jamie Jones</span>
     </a>
     <script src="assets/js/name-scramble.js" defer></script>

   - Hover (mouse), tap (touch/pen) or keyboard focus on [data-scramble]
     scrambles its [data-scramble-text] child (or the element itself if there
     is no such child), left to right, then settles on the real text.
   - Optional per-element tuning:
       data-scramble-tick="40"      ms between random swaps
       data-scramble-stagger="55"   ms between each letter settling
       data-scramble-lead="90"      ms everything scrambles before letter 1 settles
       data-scramble-charset="alnum" | "glyphs"   (glyphs adds / + # _ * .)
       data-scramble-mark-delay="160"  ms from the logo restart to the letters
       data-scramble-case="auto" | "upper" | "title"
         auto (default): if the name renders with text-transform: uppercase,
           scramble with capitals only; otherwise follow each letter's case.
         upper: force caps (adds text-transform: uppercase) + caps glyphs.
         title: always follow each letter's case.
   - Logo first, then letters: on trigger it calls the dot logo's restart
     hook (window.JJMark.restart(), exposed by site.js; or pass
     opts.markRestart / set NameScramble.defaults.markRestart), waits
     markDelay, then scrambles the letters left to right, so the whole thing
     reads as one sweep from the mark into the name. With no hook found the
     letters start immediately.
   - No layout shift: the text's real width is locked for the run, and each
     character cell is locked to its real glyph width, measured as rendered
     (so caps + letter-spacing are measured in caps). When it settles the
     original text node goes back, so kerning is exactly the site's.
   - Caps are done with CSS, so the DOM text stays "Jamie Jones" and screen
     readers say the name rather than spelling out capitals.
   - Screen readers get the real name (visually hidden copy); the scrambled
     cells are aria-hidden. prefers-reduced-motion: reduce = no scramble.
   - Re-hover mid-run restarts cleanly: logo restarts again, any pending
     letter start is cancelled, one run per element, never stacked.

   JS API (optional): NameScramble.attach(el, opts) -> { play(), scramble(), stop(), destroy() }
                      NameScramble.defaults (mutable) */
(function (root) {
  "use strict";

  var LOWER = "abcdefghijklmnopqrstuvwxyz";
  var UPPER = LOWER.toUpperCase();
  var DIGITS = "0123456789";
  var GLYPHS = "/+#_*.";

  var defaults = { tick: 40, stagger: 55, lead: 90, charset: "alnum", markDelay: 160, markRestart: null, textCase: "auto" };

  function findMarkRestart(o) {
    if (typeof o.markRestart === "function") return o.markRestart;
    if (typeof defaults.markRestart === "function") return defaults.markRestart;
    var m = root.JJMark;
    return m && typeof m.restart === "function" ? function () { m.restart(); } : null;
  }

  var CSS =
    ".ns-run{display:inline-block;white-space:pre;vertical-align:baseline}" +
    ".ns-cell{display:inline-block;text-align:center;white-space:pre;overflow:visible}" +
    ".ns-upper{text-transform:uppercase}" +
    ".ns-sr{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;" +
    "overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}";

  function injectCSS() {
    if (document.getElementById("ns-style")) return;
    var s = document.createElement("style");
    s.id = "ns-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function reducedMotion() {
    return !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function pool(ch, charset, upper) {
    var extra = charset === "glyphs" ? GLYPHS : "";
    if (upper || (ch >= "A" && ch <= "Z")) return UPPER + DIGITS + extra;   // match the rendered case
    return LOWER + DIGITS + extra;
  }

  /* Width-matched pools: each cell only cycles through glyphs of roughly its
     own width in the real font, so an "m" never crams into the "i" slot. */
  var measureCtx = null;
  function cellPool(ch, charset, cellW, font, upper, tracking) {
    var p = pool(ch, charset, upper);
    if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
    measureCtx.font = font;
    // canvas ignores letter-spacing; the cell's measured width includes it
    var scored = p.split("").map(function (c) { return [c, measureCtx.measureText(c).width + tracking]; });
    var fit = scored.filter(function (s) { return s[1] <= cellW * 1.3 && s[1] >= cellW * 0.55; });
    if (fit.length < 5) {
      fit = scored.sort(function (a, b) { return Math.abs(a[1] - cellW) - Math.abs(b[1] - cellW); }).slice(0, 6);
    }
    return fit.map(function (s) { return s[0]; }).join("");
  }

  function num(v, fallback) { var n = parseFloat(v); return isFinite(n) ? n : fallback; }

  function attach(host, opts) {
    injectCSS();
    var target = host.querySelector("[data-scramble-text]") || host;
    var text = target.textContent;
    var o = opts || {};
    var raf = 0, state = null, timer = 0;
    if ((o.textCase || (host.dataset || {}).scrambleCase) === "upper") target.classList.add("ns-upper");

    function cfg() {
      var d = host.dataset || {};
      return {
        tick:    num(o.tick,    num(d.scrambleTick,    defaults.tick)),
        stagger: num(o.stagger, num(d.scrambleStagger, defaults.stagger)),
        lead:    num(o.lead,    num(d.scrambleLead,    defaults.lead)),
        markDelay: num(o.markDelay, num(d.scrambleMarkDelay, defaults.markDelay)),
        textCase: o.textCase || d.scrambleCase || defaults.textCase,
        charset: o.charset || d.scrambleCharset || defaults.charset
      };
    }

    function restore() {
      if (timer) clearTimeout(timer);
      timer = 0;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (state) {
        target.textContent = text;            // original text node: real kerning
        target.style.width = state.prevWidth;
        target.style.display = state.prevDisplay;
        target.classList.remove("ns-running");
        state = null;
      }
    }

    function play() {
      if (reducedMotion()) return;            // no scramble; dots do whatever the site does
      restore();                              // clean restart, never stacked
      var c = cfg();
      var markRestart = findMarkRestart(o);
      if (markRestart) {
        try { markRestart(); } catch (err) {}
        if (c.markDelay > 0) {
          timer = setTimeout(function () { timer = 0; scramble(c); }, c.markDelay);
          return;
        }
      }
      scramble(c);
    }

    function scramble(c) {

      // Lock the whole run to the real rendered width (sub-pixel).
      var w = target.getBoundingClientRect().width;
      var prevWidth = target.style.width, prevDisplay = target.style.display;

      // Build: hidden real text for AT + aria-hidden per-char cells.
      var sr = document.createElement("span");
      sr.className = "ns-sr";
      sr.textContent = text;
      var run = document.createElement("span");
      run.className = "ns-run";
      run.setAttribute("aria-hidden", "true");
      var cells = [];
      for (var i = 0; i < text.length; i++) {
        var cell = document.createElement("span");
        cell.className = "ns-cell";
        cell.textContent = text.charAt(i);
        run.appendChild(cell);
        cells.push(cell);
      }
      target.textContent = "";
      target.appendChild(sr);
      target.appendChild(run);
      target.style.display = "inline-block";
      target.style.width = w + "px";
      target.classList.add("ns-running");

      // Lock each cell to its real glyph width before anything changes.
      var widths = cells.map(function (el) { return el.getBoundingClientRect().width; });
      cells.forEach(function (el, k) { el.style.width = widths[k] + "px"; });
      var cs = getComputedStyle(target);
      var font = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      var upper = c.textCase === "upper" || (c.textCase !== "title" && cs.textTransform === "uppercase");
      var tracking = parseFloat(cs.letterSpacing) || 0;   // "normal" -> 0
      var pools = cells.map(function (el, k) { return cellPool(text.charAt(k), c.charset, widths[k], font, upper, tracking); });

      var start = null, lastStep = -1;
      state = { prevWidth: prevWidth, prevDisplay: prevDisplay };
      var total = c.lead + (text.length - 1) * c.stagger;

      function frame(now) {
        if (start === null) start = now;
        var t = now - start;
        if (t >= total) { restore(); return; }
        var step = Math.floor(t / c.tick);
        if (step !== lastStep) {
          lastStep = step;
          for (var k = 0; k < cells.length; k++) {
            var ch = text.charAt(k);
            if (/\s/.test(ch)) continue;        // the space stays a space
            var settleAt = c.lead + k * c.stagger;
            if (t >= settleAt) {
              if (cells[k].textContent !== ch) cells[k].textContent = ch;
            } else {
              var p = pools[k];
              var r = p.charAt((Math.random() * p.length) | 0);
              cells[k].textContent = r;
            }
          }
        } else {
          // Settle letters on time even between swap ticks.
          for (var j = 0; j < cells.length; j++) {
            if (t >= c.lead + j * c.stagger && cells[j].textContent !== text.charAt(j)) {
              cells[j].textContent = text.charAt(j);
            }
          }
        }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    }

    function onPointerEnter(e) { if (e.pointerType === "mouse") play(); }
    function onPointerDown(e) { if (e.pointerType !== "mouse") play(); }
    function onFocus() {
      try { if (!host.matches(":focus-visible")) return; } catch (err) {}
      play();
    }

    host.addEventListener("pointerenter", onPointerEnter);
    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("focus", onFocus);

    return {
      play: play,
      scramble: function () { restore(); if (!reducedMotion()) scramble(cfg()); },
      stop: restore,
      get text() { return text; },
      destroy: function () {
        restore();
        host.removeEventListener("pointerenter", onPointerEnter);
        host.removeEventListener("pointerdown", onPointerDown);
        host.removeEventListener("focus", onFocus);
      }
    };
  }

  function autoInit() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-scramble]"), function (el) {
      if (!el.__nameScramble) el.__nameScramble = attach(el);
    });
  }

  root.NameScramble = { attach: attach, defaults: defaults, init: autoInit };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoInit);
  else autoInit();
})(window);
