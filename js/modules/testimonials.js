/* =========================================================
   TESTIMONIALS - vanilla review slider
   Arrows, dots, autoplay, keyboard + touch swipe.
   No globals exposed, no dependencies (NG.$ used if present).
   ========================================================= */
(function () {
  "use strict";

  var AUTO_MS = 5500; // autoplay cadence
  var SWIPE_MIN = 40; // px of horizontal travel needed to change slide
  var AXIS_MIN = 10; // px before we decide which axis the gesture is

  /* ---------- optional helpers from js/main.js ---------- */
  var NG = window.NG || {};
  var $ =
    typeof NG.$ === "function"
      ? NG.$
      : function (sel, ctx) {
          return (ctx || document).querySelector(sel);
        };
  var $$ =
    typeof NG.$$ === "function"
      ? NG.$$
      : function (sel, ctx) {
          return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
        };

  /* ---------- reduced motion ---------- */
  var reduceMQ =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
  var reduced = !!(reduceMQ && reduceMQ.matches);

  /* =========================================================
     boot - everything is scoped inside, nothing leaks out
     ========================================================= */
  function boot() {
    var root = $(".tst");
    if (!root) return;

    var track = $(".tst__track", root) || document.getElementById("tstTrack");
    var viewport = $(".tst__viewport", root);
    var dotsWrap = $(".tst__dots", root) || document.getElementById("tstDots");
    var prevBtn = $("[data-tst-prev]", root);
    var nextBtn = $("[data-tst-next]", root);
    var slides = $$(".tst-slide", root);
    var count = slides.length;

    if (!track || !viewport || count === 0) return;

    var index = 0;
    var dots = [];
    var timer = null;
    var hoverPause = false;
    var focusPause = false;
    var dragging = false;
    var dragId = null;
    var dragX = 0;
    var dragY = 0;
    var dragAxis = "";

    /* ---------- dots + slide wiring (tablist pattern) ---------- */
    if (dotsWrap) {
      for (var i = 0; i < count; i++) {
        (function (n) {
          var slide = slides[n];
          var dot = document.createElement("button");
          dot.type = "button";
          dot.id = "tstDot-" + (n + 1);
          dot.setAttribute("role", "tab");
          dot.setAttribute("aria-label", "Review " + (n + 1));
          dot.setAttribute("aria-selected", "false");
          dot.tabIndex = -1;

          if (!slide.id) slide.id = "tstSlide-" + (n + 1);
          dot.setAttribute("aria-controls", slide.id);
          /* <article> may not take role="tabpanel" (ARIA in HTML) - keep the
             native article semantics and label the slide instead. */
          slide.setAttribute("aria-labelledby", dot.id);

          dot.addEventListener("click", function () {
            goTo(n);
          });

          dotsWrap.appendChild(dot);
          dots.push(dot);
        })(i);
      }
    }

    /* ---------- render: transform + dots + aria ---------- */
    function render() {
      if (index < 0) index = 0;
      if (index > count - 1) index = count - 1;

      track.style.transform = "translate3d(" + index * -100 + "%, 0, 0)";

      for (var i = 0; i < count; i++) {
        var active = i === index;
        slides[i].setAttribute("aria-hidden", active ? "false" : "true");

        var dot = dots[i];
        if (!dot) continue;
        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-selected", active ? "true" : "false");
        dot.tabIndex = active ? 0 : -1;
      }
    }

    function goTo(i) {
      index = ((i % count) + count) % count; // wrap-around
      render();
      restartAuto();
    }

    function prev() {
      goTo(index - 1);
    }

    function next() {
      goTo(index + 1);
    }

    /* ---------- autoplay ---------- */
    function autoAllowed() {
      return !reduced && !hoverPause && !focusPause && !dragging && !document.hidden && count > 1;
    }

    function syncAuto() {
      if (autoAllowed()) {
        if (timer === null) {
          timer = window.setInterval(function () {
            goTo(index + 1);
          }, AUTO_MS);
        }
      } else if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function restartAuto() {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
      syncAuto();
    }

    /* ---------- reduced motion changes at runtime ---------- */
    if (reduceMQ) {
      var onReduceChange = function () {
        reduced = !!reduceMQ.matches;
        syncAuto();
      };
      if (typeof reduceMQ.addEventListener === "function") {
        reduceMQ.addEventListener("change", onReduceChange);
      } else if (typeof reduceMQ.addListener === "function") {
        reduceMQ.addListener(onReduceChange);
      }
    }

    document.addEventListener("visibilitychange", syncAuto);

    /* ---------- pause on hover / keyboard focus ---------- */
    function focusIsVisible(el) {
      try {
        return !!(el && typeof el.matches === "function" && el.matches(":focus-visible"));
      } catch (err) {
        return true; // unknown pseudo-class: be conservative and pause
      }
    }

    root.addEventListener("pointerenter", function () {
      hoverPause = true;
      syncAuto();
    });

    root.addEventListener("pointerleave", function () {
      hoverPause = false;
      syncAuto();
    });

    root.addEventListener("focusin", function (e) {
      focusPause = focusIsVisible(e.target);
      syncAuto();
    });

    root.addEventListener("focusout", function (e) {
      if (e.relatedTarget && root.contains(e.relatedTarget)) return;
      focusPause = false;
      syncAuto();
    });

    /* ---------- arrows ---------- */
    if (prevBtn) prevBtn.addEventListener("click", prev);
    if (nextBtn) nextBtn.addEventListener("click", next);

    /* ---------- keyboard ---------- */
    root.addEventListener("keydown", function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      var key = e.key;
      var arrow = key === "ArrowLeft" || key === "ArrowRight";
      var edge = key === "Home" || key === "End";
      if (!arrow && !edge) return;
      if (!e.target || !root.contains(e.target)) return;

      var from = index;
      var fromDots = !!(dotsWrap && dotsWrap.contains(e.target));
      if (fromDots) {
        for (var i = 0; i < dots.length; i++) {
          if (dots[i] === e.target) {
            from = i;
            break;
          }
        }
      }

      var to = from;
      if (key === "ArrowLeft") to = from - 1;
      else if (key === "ArrowRight") to = from + 1;
      else if (key === "Home") to = 0;
      else to = count - 1;

      e.preventDefault();
      goTo(to);
      if (fromDots && dots[index]) dots[index].focus();
    });

    /* ---------- touch / mouse swipe ---------- */
    function releaseDrag() {
      dragId = null;
      dragAxis = "";
      dragging = false;
      syncAuto();
    }

    viewport.addEventListener("pointerdown", function (e) {
      if (dragId !== null) return; // one pointer at a time
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragId = e.pointerId;
      dragX = e.clientX;
      dragY = e.clientY;
      dragAxis = "";
      dragging = true;
      syncAuto();
    });

    window.addEventListener(
      "pointermove",
      function (e) {
        if (dragId === null || e.pointerId !== dragId) return;
        var dx = e.clientX - dragX;
        var dy = e.clientY - dragY;
        if (Math.abs(dx) < AXIS_MIN && Math.abs(dy) < AXIS_MIN) return;
        dragAxis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (dragAxis === "y") releaseDrag(); // vertical gesture: ignore it
      },
      { passive: true }
    );

    window.addEventListener("pointerup", function (e) {
      // touch has no persistent hover - make sure a tap never leaves us paused
      if (e.pointerType === "touch") {
        hoverPause = false;
        syncAuto();
      }
      if (dragId === null || e.pointerId !== dragId) return;
      var dx = e.clientX - dragX;
      var dy = e.clientY - dragY;
      var axis = dragAxis;
      releaseDrag();
      if (axis !== "x") return;
      if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) next();
        else prev();
      }
    });

    window.addEventListener("pointercancel", function (e) {
      if (dragId === null || e.pointerId !== dragId) return;
      releaseDrag();
    });

    window.addEventListener("blur", function () {
      if (dragId !== null) releaseDrag();
    });

    /* ---------- resize: percent transform self-adjusts, keep index valid ---------- */
    window.addEventListener("resize", function () {
      if (index > count - 1) {
        index = count - 1;
        render();
      }
    });

    /* ---------- start ---------- */
    render();
    syncAuto();
  }

  /* ---------- start once the DOM is ready, never throw ---------- */
  function start() {
    try {
      boot();
    } catch (err) {
      /* this module must never break the page */
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
