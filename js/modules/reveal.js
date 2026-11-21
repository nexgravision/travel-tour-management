/* =========================================================
   REVEAL - page-wide scroll reveal + animated counters
   Vanilla, dependency-free, and never throws.
   ========================================================= */
(function () {
  "use strict";

  var REVEAL_SELECTOR = ".reveal";
  var COUNTER_SELECTOR = ".counter[data-count]";
  var COUNT_DURATION = 1500;
  var SAFETY_DELAY = 2500;

  /* ---------- state ---------- */
  var prefersReduced = readReducedMotion();
  var finalOnly = false; // when true, counters jump straight to their target
  var shown = []; // reveals already made visible
  var counted = []; // counters already started / finished

  var raf = window.requestAnimationFrame
    ? function (cb) {
        window.requestAnimationFrame(cb);
      }
    : function (cb) {
        window.setTimeout(function () {
          cb(+new Date());
        }, 16);
      };

  /* ---------- helpers ---------- */
  function toArray(nodes) {
    return Array.prototype.slice.call(nodes || []);
  }

  function readReducedMotion() {
    try {
      return (
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } catch (err) {
      return false;
    }
  }

  function viewportHeight() {
    return window.innerHeight || document.documentElement.clientHeight || 0;
  }

  function targetNumber(el) {
    var raw = el.getAttribute("data-count");
    var value = raw === null ? NaN : parseInt(raw, 10);
    return isNaN(value) ? null : value;
  }

  function parentReveal(el) {
    var node = el && el.parentNode;
    while (node && node !== document) {
      if (node.nodeType === 1 && node.classList && node.classList.contains("reveal")) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  /* ---------- counters ---------- */
  function setFinal(el) {
    var target = targetNumber(el);
    if (target === null) return;
    if (counted.indexOf(el) === -1) counted.push(el);
    el.textContent = String(target);
  }

  function animateCounter(el) {
    if (!el || counted.indexOf(el) !== -1) return;
    var target = targetNumber(el);
    if (target === null) return;
    counted.push(el);

    if (finalOnly || prefersReduced) {
      el.textContent = String(target);
      return;
    }

    var start = null;
    function step(now) {
      if (start === null) start = now;
      var progress = (now - start) / COUNT_DURATION;
      if (progress < 0) progress = 0;
      if (progress > 1) progress = 1;
      var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = String(Math.round(target * eased));
      if (progress < 1) {
        raf(step);
      } else {
        el.textContent = String(target); // always land exactly on target
      }
    }
    raf(step);
  }

  function animateCountersInside(el) {
    if (!el || !el.querySelectorAll) return;
    var list = el.querySelectorAll(COUNTER_SELECTOR);
    for (var i = 0; i < list.length; i++) animateCounter(list[i]);
  }

  /* ---------- reveal ---------- */
  function show(el, observer) {
    if (!el || shown.indexOf(el) !== -1) return;
    shown.push(el);
    if (observer) {
      try {
        observer.unobserve(el);
      } catch (err) {
        /* ignore */
      }
    }
    el.classList.add("is-visible");
    animateCountersInside(el);
  }

  function showAllReveals(observer) {
    var list = document.querySelectorAll(REVEAL_SELECTOR);
    for (var i = 0; i < list.length; i++) show(list[i], observer);
  }

  function finaliseAllCounters() {
    var list = document.querySelectorAll(COUNTER_SELECTOR);
    for (var i = 0; i < list.length; i++) setFinal(list[i]);
  }

  /* ---------- safety net: content can never stay invisible ---------- */
  function forceInView(observer) {
    var height = viewportHeight();
    var list = document.querySelectorAll(REVEAL_SELECTOR);
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (shown.indexOf(el) !== -1) continue;
      var rect;
      try {
        rect = el.getBoundingClientRect();
      } catch (err) {
        show(el, observer);
        continue;
      }
      // still above the fold, or intersecting the viewport
      if (rect.top < height) show(el, observer);
    }

    var counters = document.querySelectorAll(COUNTER_SELECTOR);
    for (var j = 0; j < counters.length; j++) {
      var counter = counters[j];
      if (counted.indexOf(counter) !== -1) continue;
      var cRect;
      try {
        cRect = counter.getBoundingClientRect();
      } catch (err2) {
        setFinal(counter);
        continue;
      }
      if (cRect.top < height) animateCounter(counter);
    }
  }

  /* ---------- setup ---------- */
  function init() {
    try {
      run();
    } catch (err) {
      // Last resort - never leave the page hidden because of a script hiccup.
      finalOnly = true;
      try {
        showAllReveals(null);
        finaliseAllCounters();
      } catch (err2) {
        /* give up silently */
      }
    }
  }

  function run() {
    var reveals = toArray(document.querySelectorAll(REVEAL_SELECTOR));
    var counters = toArray(document.querySelectorAll(COUNTER_SELECTOR));

    // 1. stagger delays from data-delay
    for (var i = 0; i < reveals.length; i++) {
      (function (el) {
        var raw = el.getAttribute("data-delay");
        if (raw === null || raw === "") return;
        var ms = parseInt(raw, 10);
        if (!isNaN(ms) && ms > 0) el.style.setProperty("--reveal-delay", ms + "ms");
      })(reveals[i]);
    }

    if (!reveals.length && !counters.length) return;

    var hasIO = typeof window.IntersectionObserver === "function";

    // 2. reduced motion or no IntersectionObserver -> everything visible at once
    if (!hasIO || prefersReduced) {
      finalOnly = true;
      showAllReveals(null);
      finaliseAllCounters();
      return;
    }

    /* Markup carries the real figures so they read correctly when JS is
       unavailable; with JS running we restart them from zero before the
       count-up animation takes over. */
    for (var z = 0; z < counters.length; z++) counters[z].textContent = "0";

    var revealObserver;
    var counterObserver;

    try {
      revealObserver = new IntersectionObserver(function (entries) {
        for (var k = 0; k < entries.length; k++) {
          if (entries[k].isIntersecting) show(entries[k].target, revealObserver);
        }
      }, {
        threshold: 0.12,
        rootMargin: "0px 0px -8% 0px"
      });

      counterObserver = new IntersectionObserver(function (entries) {
        for (var m = 0; m < entries.length; m++) {
          if (!entries[m].isIntersecting) continue;
          try {
            counterObserver.unobserve(entries[m].target);
          } catch (err) {
            /* ignore */
          }
          animateCounter(entries[m].target);
        }
      }, {
        threshold: 0.35,
        rootMargin: "0px 0px -5% 0px"
      });
    } catch (err) {
      finalOnly = true;
      showAllReveals(null);
      finaliseAllCounters();
      return;
    }

    // 3. observe every reveal (each one is revealed once, then unobserved)
    for (var r = 0; r < reveals.length; r++) revealObserver.observe(reveals[r]);

    // 4. counters that live outside any .reveal get their own observer
    for (var c = 0; c < counters.length; c++) {
      if (!parentReveal(counters[c])) counterObserver.observe(counters[c]);
    }

    // 5. anything already in the viewport at load reveals immediately
    forceInView(revealObserver);

    // 6. safety net - after 2.5s nothing above the fold may stay hidden
    window.setTimeout(function () {
      forceInView(revealObserver);
    }, SAFETY_DELAY);

    // 6b. An element taller than ~8 viewports can never reach the 12% ratio,
    //     so watch for those rare stragglers while scrolling (rAF-throttled).
    var ticking = false;
    function stragglers() {
      ticking = false;
      var height = viewportHeight();
      var list = document.querySelectorAll(REVEAL_SELECTOR);
      var pending = 0;
      for (var i = 0; i < list.length; i++) {
        var el = list[i];
        if (shown.indexOf(el) !== -1) continue;
        pending++;
        var rect = el.getBoundingClientRect();
        if (rect.height > height * 8 && rect.top < height && rect.bottom > 0) {
          show(el, revealObserver);
        }
      }
      if (!pending) window.removeEventListener("scroll", onScroll);
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      raf(stragglers);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- boot ---------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
