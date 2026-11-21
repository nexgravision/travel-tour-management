/* =========================================================
   GALLERY - lightbox for the #gallery .gal-item grid
   Vanilla JS, IIFE, no dependencies. Exposes
   window.NG.closeLightbox (main.js calls it on Escape).
   ========================================================= */
(function () {
  "use strict";

  var NG = (window.NG = window.NG || {});
  var doc = document;

  var items = [];
  var lightbox = null;
  var lbImg = null;
  var lbCap = null;
  var prevBtn = null;
  var nextBtn = null;
  var closeBtn = null;

  var index = 0;
  var isOpen = false;
  var opener = null;
  var hideTimer = null;
  var prevBodyOverflow = "";
  var reduceMotion = false;

  /* Safe default so main.js can always call it, even if init bails. */
  NG.closeLightbox = function () {};

  /* ---------- Helpers ---------- */
  function frame(fn) {
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(fn);
    } else {
      window.setTimeout(fn, 16);
    }
  }

  function focusEl(el) {
    if (!el || typeof el.focus !== "function") return;
    try {
      el.focus({ preventScroll: true });
    } catch (err) {
      try {
        el.focus();
      } catch (err2) {
        /* not focusable - ignore */
      }
    }
  }

  function setScrollLock(on) {
    try {
      if (on) {
        prevBodyOverflow = doc.body.style.overflow;
        doc.body.style.overflow = "hidden";
      } else {
        doc.body.style.overflow = prevBodyOverflow;
      }
    } catch (err) {
      /* ignore */
    }
  }

  function normalise(i) {
    var count = items.length;
    if (!count) return 0;
    return ((i % count) + count) % count;
  }

  function preload(i) {
    var src = items[normalise(i)].getAttribute("data-src");
    if (!src) return;
    try {
      var img = new Image();
      img.src = src;
    } catch (err) {
      /* preloading is best-effort */
    }
  }

  /* ---------- Render one slide ---------- */
  function render(i) {
    var count = items.length;
    if (!count || !lbImg || !lbCap) return;
    index = normalise(i);

    var item = items[index];
    var thumb = item.querySelector("img");
    var caption = item.getAttribute("data-caption") || "";

    try {
      lbCap.textContent = caption;
      lbImg.alt = (thumb && thumb.getAttribute("alt")) || caption;
      var src = item.getAttribute("data-src");
      if (src) lbImg.src = src;
      /* A failed image never blocks anything: navigation, close and
         focus handling never wait on a load event, and the alt text
         plus caption keep the overlay understandable. */
    } catch (err) {
      /* keep the lightbox usable no matter what */
    }

    preload(index + 1);
    preload(index - 1);
  }

  function step(delta) {
    if (!isOpen) return;
    render(index + delta);
  }

  /* ---------- Open / close ---------- */
  function open(i, trigger) {
    if (!lightbox || !items.length) return;

    var alreadyOpen = isOpen;
    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }

    opener = trigger || items[i] || null;
    render(i);
    isOpen = true;

    if (!alreadyOpen) {
      /* drop `hidden` first, then flip .is-open on the next frame so
         the CSS opacity transition actually plays */
      lightbox.hidden = false;
      setScrollLock(true);
      frame(function () {
        frame(function () {
          if (isOpen && lightbox) lightbox.classList.add("is-open");
        });
      });
      /* Frames can be throttled (background tab) - never leave the
         overlay open-but-invisible; this is a no-op once rAF has run. */
      window.setTimeout(function () {
        if (isOpen && lightbox) lightbox.classList.add("is-open");
      }, 150);
      focusEl(closeBtn);
    } else {
      lightbox.classList.add("is-open");
    }
  }

  function close() {
    if (!lightbox) return;
    if (!isOpen && lightbox.hidden) return;

    isOpen = false;
    lightbox.classList.remove("is-open");
    setScrollLock(false);

    if (hideTimer) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(function () {
      hideTimer = null;
      if (!isOpen && lightbox && !lightbox.hidden) lightbox.hidden = true;
    }, reduceMotion ? 20 : 400);

    var target = opener;
    opener = null;
    focusEl(target);
  }

  /* ---------- Wiring ---------- */
  function init() {
    items = Array.prototype.slice.call(doc.querySelectorAll(".gal-item"));
    lightbox = doc.getElementById("lightbox");
    lbImg = doc.getElementById("lightboxImg");
    lbCap = doc.getElementById("lightboxCap");

    if (!lightbox || !lbImg || !lbCap || !items.length) return;

    prevBtn = lightbox.querySelector("[data-lb-prev]");
    nextBtn = lightbox.querySelector("[data-lb-next]");
    closeBtn = lightbox.querySelector("[data-lb-close]");

    try {
      reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (err) {
      reduceMotion = false;
    }

    try {
      lightbox.setAttribute("role", "dialog");
      lightbox.setAttribute("aria-modal", "true");
      lightbox.setAttribute("aria-label", "Image viewer");
    } catch (err2) {
      /* ignore */
    }

    items.forEach(function (item, i) {
      item.addEventListener("click", function () {
        open(i, item);
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", close);
    }
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        step(-1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        step(1);
      });
    }

    lightbox.addEventListener("click", function (e) {
      /* backdrop only - clicks on the figure keep the image open */
      if (e.target === lightbox) close();
    });

    doc.addEventListener("keydown", function (e) {
      if (!isOpen) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (e.key === "Tab") {
        /* Keep focus inside the dialog while it is open (WCAG 2.4.3) */
        var focusable = lightbox.querySelectorAll("button");
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        var active = doc.activeElement;
        if (e.shiftKey) {
          if (active === first || !lightbox.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else if (active === last || !lightbox.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    NG.closeLightbox = close;
  }

  try {
    init();
  } catch (err) {
    if (window.console && typeof window.console.warn === "function") {
      window.console.warn("gallery.js: lightbox not initialised", err);
    }
  }
})();
