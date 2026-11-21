/* =========================================================
   TABS - package category filter + wishlist favourites
   Owned by assigned agent. Vanilla, fully defensive.
   ========================================================= */
(function () {
  "use strict";

  if (typeof document === "undefined" || !document.querySelectorAll) return;

  var doc = document;

  /* ---------- Helpers ---------- */
  function qsa(sel, ctx) {
    try {
      var root = ctx || doc;
      if (!root || typeof root.querySelectorAll !== "function") return [];
      return Array.prototype.slice.call(root.querySelectorAll(sel));
    } catch (err) {
      return [];
    }
  }

  function prefersReducedMotion() {
    try {
      return !!(
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } catch (err) {
      return false;
    }
  }

  var reduceMotion = prefersReducedMotion();

  /* Brief fade so the grid change feels smooth (skipped for
     reduced motion or browsers without the Web Animations API). */
  function fadeIn(cards) {
    if (reduceMotion || !cards || !cards.length) return;
    var first = cards[0];
    if (!first || typeof first.animate !== "function") return;
    cards.forEach(function (card) {
      try {
        card.animate(
          [
            { opacity: 0, transform: "translateY(12px)" },
            { opacity: 1, transform: "translateY(0)" }
          ],
          {
            duration: 340,
            easing: "cubic-bezier(0.22, 0.61, 0.36, 1)"
          }
        );
      } catch (err) {
        /* animation is a nicety - never break the filter */
      }
    });
  }

  /* Announce the result count only if a polite live region
     exists inside the packages section (skip otherwise). */
  function announce(message) {
    try {
      var section = doc.getElementById("packages");
      var live = section
        ? section.querySelector('[aria-live="polite"], [role="status"]')
        : null;
      if (!live) return;
      live.textContent = message;
    } catch (err) {
      /* nothing to announce to */
    }
  }

  /* ---------- Category tabs ---------- */
  var tabs = qsa(".pkg-tab");
  var cards = qsa("#pkgGrid .pkg-card");
  if (!cards.length) cards = qsa(".pkg-card");

  function applyFilter(filter) {
    var shown = [];
    cards.forEach(function (card) {
      var cat = card.getAttribute("data-cat") || "";
      var visible = !filter || filter === "all" || cat === filter;
      if (visible) {
        card.classList.remove("is-hidden");
        shown.push(card);
      } else {
        card.classList.add("is-hidden");
      }
    });
    fadeIn(shown);
    announce(
      shown.length + (shown.length === 1 ? " package" : " packages") + " shown"
    );
    return shown.length;
  }

  if (tabs.length && cards.length) {
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (other) {
          var isActive = other === tab;
          other.classList.toggle("is-active", isActive);
          other.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        applyFilter(tab.getAttribute("data-filter") || "all");
      });
    });
  }

  /* ---------- Favourite buttons ---------- */
  var favButtons = qsa("button[data-fav]");

  favButtons.forEach(function (btn) {
    if (!btn.hasAttribute("aria-pressed")) {
      btn.setAttribute("aria-pressed", "false");
    }

    btn.addEventListener("click", function () {
      var active = btn.classList.toggle("is-active");
      btn.setAttribute("aria-pressed", active ? "true" : "false");

      var NG = window.NG;
      if (NG && typeof NG.toast === "function") {
        NG.toast(
          active ? "Added to your wishlist" : "Removed from your wishlist"
        );
      }
    });
  });
})();
