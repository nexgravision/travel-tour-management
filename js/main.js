/* =========================================================
   MAIN - shared helpers + global behaviour
   Exposes window.NG for the section modules.
   ========================================================= */
(function () {
  "use strict";

  var NG = (window.NG = window.NG || {});

  /* ---------- Tiny DOM helpers ---------- */
  NG.$ = function (sel, ctx) {
    return (ctx || document).querySelector(sel);
  };
  NG.$$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };

  /* ---------- Toast ---------- */
  var toastEl = NG.$("#toast");
  var toastMsg = NG.$("#toastMsg");
  var toastIcon = NG.$("#toastIcon");
  var toastTimer = null;

  NG.toast = function (message, type) {
    if (!toastEl || !toastMsg) return;
    toastMsg.textContent = message;
    toastEl.classList.toggle("is-error", type === "error");
    if (toastIcon) toastIcon.textContent = type === "error" ? "!" : "✓";
    toastEl.hidden = false;
    // force re-entry so the transition replays
    void toastEl.offsetWidth;
    toastEl.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-show");
      setTimeout(function () {
        toastEl.hidden = true;
      }, 400);
    }, 3800);
  };

  /* ---------- Back to top ---------- */
  var toTop = NG.$("#toTop");
  if (toTop) {
    window.addEventListener(
      "scroll",
      function () {
        toTop.classList.toggle("is-show", window.scrollY > 600);
      },
      { passive: true }
    );
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- Current year in footer ---------- */
  var year = NG.$("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Smooth anchors (works on file:// too) ---------- */
  document.addEventListener("click", function (e) {
    var target = e.target;
    if (!target || typeof target.closest !== "function") return;
    var link = target.closest('a[href^="#"]');
    if (!link) return;
    var id = link.getAttribute("href");
    if (!id || id === "#" || id.length < 2) return;

    var el = null;
    try {
      el = document.querySelector(id);
    } catch (err) {
      return; /* malformed fragment such as "#1foo" */
    }
    if (!el) return;

    e.preventDefault();
    var reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    } catch (err2) {
      /* ignore */
    }

    /* Move focus to the destination so keyboard users continue from the
       target instead of re-walking the header (skip-link semantics). */
    try {
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    } catch (err3) {
      /* ignore */
    }

    try {
      history.replaceState(null, "", id);
    } catch (err4) {
      /* some browsers disallow this on file:// */
    }
  });

  /* ---------- Escape closes any open overlay ---------- */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var lb = NG.$("#lightbox");
    if (lb && lb.classList.contains("is-open") && NG.closeLightbox) NG.closeLightbox();
    var modal = NG.$("#infoModal");
    if (modal && modal.classList.contains("is-open") && NG.closeModal) NG.closeModal();
    var menu = NG.$("#navMenu");
    var toggle = NG.$("#navToggle");
    if (menu && menu.classList.contains("is-open")) {
      menu.classList.remove("is-open");
      document.body.classList.remove("menu-open");
      if (toggle) {
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      }
    }
  });
})();
