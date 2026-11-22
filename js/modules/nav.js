/* =========================================================
   NAV - header scroll states, mobile drawer, active link
   ========================================================= */
(function () {
  "use strict";

  var header = document.getElementById("siteHeader");
  var navToggle = document.getElementById("navToggle");
  var navMenu = document.getElementById("navMenu");

  var SECTION_IDS = [
    "home",
    "destinations",
    "packages",
    "tours",
    "services",
    "gallery",
    "about",
    "contact"
  ];

  var SCROLL_THRESHOLD = 40; // .is-scrolled kicks in past this
  var TOP_LIMIT = 80; // never hide the header near the very top
  var DELTA = 6; // px of movement before hide/reveal flips

  var lastY = window.pageYOffset || window.scrollY || 0;
  var isHidden = false;

  /* ---------- helpers ---------- */
  function menuIsOpen() {
    return !!(navMenu && navMenu.classList.contains("is-open"));
  }

  function setScrolled(y) {
    if (!header) return;
    header.classList.toggle("is-scrolled", y > SCROLL_THRESHOLD);
  }

  function setHidden(next) {
    if (!header || next === isHidden) return;
    isHidden = next;
    header.classList.toggle("is-hidden", isHidden);
  }

  function setMenu(open) {
    if (navMenu) navMenu.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    if (navToggle) {
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
    /* The drawer must never sit behind a hidden header */
    if (open) setHidden(false);
  }

  /* ---------- scroll: scrolled state + hide/reveal ---------- */
  function onScroll() {
    var y = window.pageYOffset || window.scrollY || 0;
    setScrolled(y);

    if (!header) return;

    if (y <= TOP_LIMIT || menuIsOpen()) {
      if (isHidden) setHidden(false);
      lastY = y;
      return;
    }

    var delta = y - lastY;
    if (Math.abs(delta) >= DELTA) {
      setHidden(delta > 0);
      lastY = y;
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- mobile drawer ---------- */
  if (navToggle) {
    navToggle.addEventListener("click", function () {
      setMenu(!menuIsOpen());
    });
  }

  if (navMenu) {
    navMenu.addEventListener("click", function (e) {
      var target = e.target;
      if (!target) return;
      /* Any in-drawer anchor (nav links) closes it */
      var link =
        typeof target.closest === "function" ? target.closest('a[href^="#"]') : null;
      if (!link || !navMenu.contains(link)) return;
      setMenu(false);
    });
  }

  /* Tapping/clicking outside the drawer closes it */
  document.addEventListener("click", function (e) {
    if (!menuIsOpen()) return;
    var target = e.target;
    if (!target || typeof target.closest !== "function") return;
    if (navMenu && navMenu.contains(target)) return;
    if (navToggle && navToggle.contains(target)) return;
    setMenu(false);
  });

  window.addEventListener(
    "resize",
    function () {
      if (window.innerWidth > 1100 && menuIsOpen()) setMenu(false);
    },
    { passive: true }
  );

  /* ---------- active link highlighting ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll(".nav-link"));

  /* Document order matters: sections are resolved top-to-bottom */
  var wanted = {};
  for (var s = 0; s < SECTION_IDS.length; s++) wanted[SECTION_IDS[s]] = true;

  var sections = [];
  var found = Array.prototype.slice.call(document.querySelectorAll("section[id]"));
  for (var i = 0; i < found.length; i++) {
    if (wanted[found[i].id]) sections.push(found[i]);
  }

  function setActive(id) {
    for (var n = 0; n < links.length; n++) {
      var link = links[n];
      var active = link.getAttribute("href") === "#" + id;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  }

  /* Exactly one active: the last section (in document order) whose top
     has crossed the 40% viewport line. Always yields a value, including
     when the page is scrolled all the way to the bottom. */
  function resolveActive() {
    if (!sections.length) return;
    var line = (window.innerHeight || 0) * 0.4;
    var current = sections[0].id;
    for (var n = 0; n < sections.length; n++) {
      if (sections[n].getBoundingClientRect().top <= line) current = sections[n].id;
      else break; // tops only grow from here - document order
    }
    setActive(current);
  }

  if (sections.length && typeof window.IntersectionObserver === "function") {
    var observer = new window.IntersectionObserver(resolveActive, {
      rootMargin: "-40% 0px -55% 0px",
      threshold: 0
    });
    for (var o = 0; o < sections.length; o++) observer.observe(sections[o]);
  } else if (sections.length) {
    /* Scroll fallback, rAF-throttled */
    var ticking = false;
    var request =
      window.requestAnimationFrame ||
      function (fn) {
        return window.setTimeout(fn, 16);
      };
    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        request(function () {
          ticking = false;
          resolveActive();
        });
      },
      { passive: true }
    );
  }

  window.addEventListener("resize", resolveActive, { passive: true });
  resolveActive();
})();
