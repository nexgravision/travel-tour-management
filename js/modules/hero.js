/* =========================================================
   HERO - interactive destination carousel for the hero section
   Crossfades the hero background between destinations, swaps
   the hero copy, highlights the active card and keeps the card
   rail scrolled to it. Vanilla JS, IIFE, no dependencies
   (NG.$ / NG.$$ come from js/main.js).
   Exposes window.NG.heroGoTo for other modules.
   ========================================================= */
(function () {
  "use strict";

  var NG = (window.NG = window.NG || {});
  var doc = document;

  /* ---------- timings / constants ---------- */
  var ENTER_MS = 1400; /* .is-entering heroEnter crossfade */
  var TEXT_MS = 220; /* .is-updating copy fade */
  var PRELOAD_MS = 150; /* stagger between background preloads */
  var EDGE_PAD = 12; /* px of the next card kept inside the viewport */
  var WIDE_RE = /([?&])w=900(?=&|$)/; /* card thumbnail -> hero width */
  var AUTOPLAY_MS = 6000; /* pause on each slide before auto-advancing */

  /* ---------- reduced motion: read once, never throws ---------- */
  var reduce = false;
  try {
    reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (err) {
    reduce = false;
  }
  if (reduce) {
    ENTER_MS = 80;
    TEXT_MS = 0;
  }

  /* ---------- module state ---------- */
  var slides = [];
  var cards = [];
  var current = 0;

  var heroMedia = null;
  var layers = []; /* [0] = the markup layer, [1] = created on demand */
  var activeIdx = 0;
  var pending = null; /* the background enter that is in flight */

  var railEl = null;
  var viewportEl = null;
  var trackEl = null;
  var indexEl = null;
  var copyEl = null;
  var countryEl = null;
  var eyebrowEl = null;
  var titleEl = null;
  var locTextEl = null;
  var descEl = null;
  var copyTimer = null;

  /* ---------- autoplay state ----------
     One timer, three pause reasons (hidden, focus, outOfView).
     syncAutoplay() is the only code that clears or arms autoTimer,
     and autoGen invalidates a tick already queued by the event loop,
     so a superseded callback can never orphan the freshly armed
     handle. Rotation keeps running under prefers-reduced-motion (CSS
     collapses the transition; JS only schedules timers - nothing new
     animates). */
  var autoTimer = null;
  var autoGen = 0; /* invalidates queued ticks when the timer is re-armed */
  var autoObserver = null;
  var autoPaused = { hidden: false, focus: false, outOfView: false };

  /* Safe default so other modules can always call it, even if init bails. */
  NG.heroGoTo = function () {};

  /* ---------- helpers ---------- */
  function warn(msg, err) {
    if (window.console && typeof window.console.warn === "function") {
      window.console.warn(msg, err);
    }
  }

  function collapse(text) {
    if (text === null || text === undefined) return "";
    return String(text).replace(/\s+/g, " ").trim();
  }

  /* Card thumbs ship at w=900; ask for the hero size instead.
     Only rewritten when the URL really carries a w=900 parameter. */
  function wideSrc(src) {
    if (!WIDE_RE.test(src)) return src;
    return src.replace(WIDE_RE, "$1w=2000");
  }

  function pad(v) {
    return (v < 10 ? "0" : "") + v;
  }

  /* ---------- data: reuse the #destGrid cards ---------- */
  function buildSlides() {
    var out = [];
    var destCards = NG.$$("#destGrid .dest-card");

    for (var i = 0; i < destCards.length; i++) {
      var card = destCards[i];
      var locEl = card.querySelector(".dest-card__loc");
      var locText = locEl ? collapse(locEl.textContent) : "";
      if (!locText) continue;

      var parts = locText.split(",");
      var place = parts[0].trim();
      if (!place) continue;
      var country = parts.length > 1 ? parts.slice(1).join(",").trim() : "";

      var titleNode = card.querySelector(".dest-card__title");
      var textNode = card.querySelector(".dest-card__text");
      var mediaImg = card.querySelector(".dest-card__media img");
      var src = mediaImg ? mediaImg.src || "" : "";
      if (!src) continue; /* a slide without art cannot crossfade */

      out.push({
        location: locText,
        place: place,
        country: country,
        tagline: titleNode ? collapse(titleNode.textContent) : "",
        description: textNode ? collapse(textNode.textContent) : "",
        thumb: src,
        bg: wideSrc(src)
      });
    }

    return out;
  }

  /* ---------- rail cards (built with createElement only) ---------- */
  function buildRail() {
    for (var i = 0; i < slides.length; i++) {
      var slide = slides[i];

      var btn = doc.createElement("button");
      btn.type = "button";
      btn.className = "hero__rcard";
      btn.setAttribute("aria-label", "Show destination: " + slide.location);
      btn.setAttribute("aria-pressed", "false");

      var img = doc.createElement("img");
      img.className = "hero__rcard-img";
      img.setAttribute("src", slide.thumb);
      img.setAttribute("alt", "");
      img.setAttribute("loading", i < 3 ? "eager" : "lazy");
      img.setAttribute("decoding", "async");
      btn.appendChild(img);

      var scrim = doc.createElement("span");
      scrim.className = "hero__rcard-scrim";
      scrim.setAttribute("aria-hidden", "true");
      btn.appendChild(scrim);

      var body = doc.createElement("span");
      body.className = "hero__rcard-body";

      if (slide.country !== "") {
        var country = doc.createElement("span");
        country.className = "hero__rcard-country";
        country.textContent = slide.country;
        body.appendChild(country);
      }

      var name = doc.createElement("span");
      name.className = "hero__rcard-name";
      name.textContent = slide.place;
      body.appendChild(name);

      btn.appendChild(body);

      (function (n) {
        btn.addEventListener("click", function () {
          goTo(n);
        });
      })(i);

      trackEl.appendChild(btn);
      cards.push(btn);
    }
  }

  /* ---------- background: two layers, newest wins ---------- */
  function ensureLayer(idx) {
    var layer = layers[idx];
    if (layer) return layer;
    if (!heroMedia) return null;
    try {
      layer = doc.createElement("img");
      layer.className = "hero__bg";
      layer.alt = "";
      heroMedia.appendChild(layer);
      layers[idx] = layer;
      return layer;
    } catch (err) {
      return null;
    }
  }

  function detachLoad(record) {
    if (!record) return;
    try {
      if (record.hLoad) {
        record.standby.removeEventListener("load", record.hLoad);
        record.hLoad = null;
      }
      if (record.hError) {
        record.standby.removeEventListener("error", record.hError);
        record.hError = null;
      }
    } catch (err) {
      /* listener cleanup is best-effort */
    }
  }

  /* Finishes an enter. Idempotent: running it twice must never
     flip activeIdx twice or re-touch the layers. */
  function applyFinal(record) {
    if (!record || record.done) return;
    record.done = true;
    if (pending === record) pending = null;

    if (record.timer !== null) {
      window.clearTimeout(record.timer);
      record.timer = null;
    }
    detachLoad(record);

    if (record.started) {
      /* Promote the standby (mid-fade) to the base layer and drop
         the old one: the previous target becomes the base for the
         next swap, so there is never a blank frame. */
      try {
        record.standby.classList.remove("is-entering");
        record.standby.classList.add("is-active");
        record.active.classList.remove("is-active");
        activeIdx = 1 - activeIdx;
      } catch (err) {
        /* keep whatever state we have - the hero stays covered */
      }
    }
  }

  /* The image never arrived: leave the background layers exactly
     as they are. The text and rail have already been updated. */
  function failEnter(record) {
    if (!record || record.done) return;
    applyFinal(record);
  }

  function startEnter(record) {
    if (!record || record.done || record.started) return;
    try {
      record.standby.classList.add("is-entering");
    } catch (err) {
      failEnter(record);
      return;
    }
    record.started = true;
    record.timer = window.setTimeout(function () {
      record.timer = null;
      applyFinal(record);
    }, ENTER_MS);
  }

  function swapBackground(slide) {
    var src = slide && slide.bg;
    if (!src || !heroMedia || !layers[0]) return;

    /* Rapid clicks: finish the in-flight enter immediately so the
       previous target becomes the base layer for the new one. */
    if (pending) applyFinal(pending);

    var active = layers[activeIdx];
    var standby = ensureLayer(1 - activeIdx);
    if (!standby || standby === active) return;

    standby.classList.remove("is-entering");
    standby.classList.remove("is-active");
    try {
      standby.src = src;
    } catch (err) {
      return; /* the active layer keeps showing - never a blank hero */
    }

    var record = {
      standby: standby,
      active: active,
      timer: null,
      done: false,
      retry: false,
      started: false,
      hLoad: null,
      hError: null
    };
    pending = record;

    if (standby.complete && standby.naturalWidth > 0) {
      startEnter(record);
      return;
    }

    record.hLoad = function () {
      detachLoad(record);
      startEnter(record);
    };
    record.hError = function () {
      /* First failure: the w=2000 variant never arrived. Retry once
         with the card thumbnail (the same photo at w=900) so text and
         photo never disagree permanently for that destination. */
      if (!record.retry && slide.thumb && slide.thumb !== src) {
        record.retry = true;
        try {
          standby.src = slide.thumb;
          return; /* load / error fire again on the retry */
        } catch (errRetry) {
          /* fall through to failEnter */
        }
      }
      failEnter(record);
    };
    standby.addEventListener("load", record.hLoad);
    standby.addEventListener("error", record.hError);
  }

  /* ---------- copy swap ---------- */
  function applyCopy(slide) {
    if (countryEl) countryEl.textContent = slide.country;
    if (eyebrowEl) {
      eyebrowEl.hidden = slide.country === "" || slide.country === slide.place;
    }
    if (titleEl) {
      while (titleEl.firstChild) titleEl.removeChild(titleEl.firstChild);
      titleEl.appendChild(doc.createTextNode(slide.place));
      if (slide.tagline && slide.tagline !== slide.place) {
        var em = doc.createElement("em");
        em.textContent = slide.tagline;
        titleEl.appendChild(em);
      }
    }
    if (locTextEl) locTextEl.textContent = slide.location;
    if (descEl) descEl.textContent = slide.description;
  }

  function updateCopy(i) {
    var slide = slides[i];
    if (!slide) return;

    /* Always drop the previous timer first: a rapid click can never
       strand #heroCopy in its faded-out state. */
    if (copyTimer !== null) {
      window.clearTimeout(copyTimer);
      copyTimer = null;
    }
    if (copyEl) copyEl.classList.add("is-updating");

    copyTimer = window.setTimeout(function () {
      copyTimer = null;
      try {
        applyCopy(slide);
      } catch (err) {
        warn("hero.js: hero copy not updated", err);
      }
      if (copyEl) {
        try {
          copyEl.classList.remove("is-updating");
        } catch (err2) {
          /* ignore */
        }
      }
    }, TEXT_MS);
  }

  /* ---------- rail / index / scroll ---------- */
  function updateRail(i) {
    for (var k = 0; k < cards.length; k++) {
      var on = k === i;
      cards[k].classList.toggle("is-active", on);
      cards[k].setAttribute("aria-pressed", on ? "true" : "false");
    }
  }

  function updateIndex(i) {
    if (!indexEl) return;
    indexEl.textContent = pad(i + 1) + " / " + pad(slides.length);
  }

  function scrollToCard(i) {
    var card = cards[i];
    if (!card || !viewportEl) return;
    try {
      var left =
        card.getBoundingClientRect().left -
        viewportEl.getBoundingClientRect().left +
        viewportEl.scrollLeft -
        EDGE_PAD;
      var max = viewportEl.scrollWidth - viewportEl.clientWidth;
      if (max < 0) max = 0;
      if (left < 0) left = 0;
      if (left > max) left = max;

      try {
        viewportEl.scrollTo({ left: left, behavior: reduce ? "auto" : "smooth" });
      } catch (err2) {
        viewportEl.scrollLeft = left;
      }
    } catch (err) {
      /* scrolling is a nicety - never block navigation */
    }
  }

  /* ---------- autoplay: one timer, three pause reasons ---------- */
  function autoBlocked() {
    return !!(
      autoPaused.hidden ||
      autoPaused.focus ||
      autoPaused.outOfView
    );
  }

  /* The only place that clears or arms autoTimer, and it bumps
     autoGen first: a tick already queued from the previous arm belongs
     to the old generation and becomes a no-op, so it can never null
     the handle just armed here (that would leave two timers alive).
     Clearing before arming means a manual interaction during a pending
     tick can never leave two timers alive either; fewer than two
     slides or any pause reason simply leaves the timer off (it is
     re-armed by the next syncAutoplay() call, which every unpause
     handler and every goTo() makes). */
  function syncAutoplay() {
    autoGen++; /* a queued tick from the previous arm must not run */
    if (autoTimer !== null) {
      window.clearTimeout(autoTimer);
      autoTimer = null;
    }
    if (slides.length < 2 || autoBlocked()) return; /* timer off; next sync re-arms */
    var gen = autoGen;
    autoTimer = window.setTimeout(function () {
      onAutoplayTick(gen);
    }, AUTOPLAY_MS);
  }

  function onAutoplayTick(gen) {
    /* Superseded: syncAutoplay() re-armed after this tick was queued,
       so another timeout owns autoTimer - leave its handle alone. */
    if (gen !== autoGen) return;

    autoTimer = null; /* this timeout has fired - its handle is dead */

    /* A pause reason may have become true while the callback was
       queued (tab hidden, keyboard focus, hero scrolled away):
       re-check and hand the decision back to syncAutoplay() instead
       of advancing. */
    if (autoBlocked()) {
      syncAutoplay();
      return;
    }

    /* Wrap-around (8 -> 1) lives only in goTo(); do not duplicate it.
       goTo() ends in syncAutoplay() too, so the finally below re-arms
       a second time in the same tick - harmless (sync always clears
       before arming) and it keeps the chain alive even if goTo()
       throws. */
    try {
      goTo(current + 1, true);
    } finally {
      syncAutoplay();
    }
  }

  /* ---------- navigation ---------- */
  /* fromAuto is true only for the autoplay tick; cards, #heroPrev,
     #heroNext, arrow keys and NG.heroGoTo stay manual (undefined),
     so they always reset the countdown and announce the change. */
  function goTo(i, fromAuto) {
    var n = slides.length;

    /* Announce only user-initiated changes: an auto-advance must not
       interrupt a screen reader every 6 seconds. Set BEFORE the
       invalid-input guard so a bad NG.heroGoTo(...) call while
       aria-live is "off" still restores "polite", and BEFORE
       updateCopy() schedules its text swap; a manual call restores
       "polite" even when it lands on the current slide. */
    if (copyEl) {
      try {
        copyEl.setAttribute("aria-live", fromAuto ? "off" : "polite");
      } catch (err) {
        /* aria-live is best-effort */
      }
    }

    if (!n || typeof i !== "number" || !isFinite(i)) {
      syncAutoplay(); /* bad input: still leave the timer consistent */
      return;
    }

    var next = ((Math.floor(i) % n) + n) % n; /* wrap-around: the carousel is continuous */

    if (next === current) {
      syncAutoplay(); /* re-picked the visible slide: full 6s again */
      return;
    }

    swapBackground(slides[next]);
    updateCopy(next);
    updateRail(next);
    updateIndex(next);
    scrollToCard(next);

    current = next;
    syncAutoplay(); /* the countdown restarts from this advance */
  }

  /* ---------- preload: crossfades must never stall ---------- */
  function preloadOne(slide, delay) {
    window.setTimeout(function () {
      try {
        var img = new Image();
        img.src = slide.bg;
      } catch (err) {
        /* preloading is best-effort */
      }
    }, delay);
  }

  function runPreload() {
    try {
      /* index 0 is already on screen as the static hero */
      for (var k = 1; k < slides.length; k++) {
        preloadOne(slides[k], PRELOAD_MS * k);
      }
    } catch (err) {
      /* preloading is best-effort */
    }
  }

  function schedulePreload() {
    if (slides.length < 2) return;

    function kick() {
      try {
        if (typeof window.requestIdleCallback === "function") {
          window.requestIdleCallback(runPreload, { timeout: 4000 });
        } else {
          window.setTimeout(runPreload, 250);
        }
      } catch (err) {
        window.setTimeout(runPreload, 250);
      }
    }

    try {
      /* Start warming at DOMContentLoaded (+ idle), not window.load:
         on a slow connection the first navigation would otherwise sit
         on the wrong photo for the whole page load. */
      if (doc.readyState === "loading") {
        doc.addEventListener("DOMContentLoaded", kick, { once: true });
      } else {
        kick();
      }
    } catch (err2) {
      /* preloading is best-effort */
    }
  }

  /* ---------- wiring ---------- */
  function init() {
    railEl = NG.$("#heroRail");
    trackEl = NG.$("#heroRailTrack");
    viewportEl = NG.$("#heroRailViewport");
    indexEl = NG.$("#heroRailIndex");
    copyEl = NG.$("#heroCopy");
    countryEl = NG.$("#heroCountry");
    titleEl = NG.$("#heroTitle");
    locTextEl = NG.$("#heroLocationText");
    descEl = NG.$("#heroDescription");
    eyebrowEl = NG.$(".hero__eyebrow");
    heroMedia = NG.$(".hero__media");
    var heroEl = NG.$(".hero");

    var prevBtn = NG.$("#heroPrev");
    var nextBtn = NG.$("#heroNext");

    /* No rail, no carousel - leave the static hero alone. */
    if (!railEl || !trackEl) return;

    slides = buildSlides();
    if (slides.length < 1) {
      railEl.hidden = true;
      return;
    }

    if (heroMedia) {
      layers[0] = NG.$(".hero__bg", heroMedia);
      if (layers[0]) layers[0].classList.add("is-active");
    }

    buildRail();

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        goTo(current - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        goTo(current + 1);
      });
    }
    railEl.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(current - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(current + 1);
      }
    });

    updateIndex(0);
    updateRail(0);
    /* Reconcile the static markup with the first surviving slide: if
       buildSlides() skipped a card, the hero must show what slide 0
       actually is. Idempotent when markup and slide 0 already match. */
    applyCopy(slides[0]);
    railEl.hidden = false;
    railEl.classList.add("is-ready");

    NG.heroGoTo = goTo;

    /* ---------- autoplay: pause / resume reasons (bound exactly once) ----------
       Each handler updates autoPaused and calls syncAutoplay(), except
       focusout to another element still INSIDE .hero, which changes
       nothing and returns without re-syncing (focus never left the
       hero, so the pause must stand). The timer itself never lives in
       a listener, so nothing can leak. The degenerate cases above (no
       rail, no slides) return before this point: no listeners, no
       timer, static hero. */
    try {
      autoPaused.hidden = !!doc.hidden; /* opened in a background tab? */
    } catch (errH) {
      autoPaused.hidden = false;
    }

    doc.addEventListener("visibilitychange", function () {
      /* Returning to a visible tab restarts the countdown via
         syncAutoplay() instead of firing immediately. */
      try {
        autoPaused.hidden = !!doc.hidden;
      } catch (errV) {
        autoPaused.hidden = false;
      }
      syncAutoplay();
    });

    if (heroEl) {
      /* Keyboard focus inside the hero pauses rotation, but only when
         focus was keyboard-initiated (:focus-visible). A mouse or touch
         click on a card must never latch a pause, so a focusin that is
         NOT :focus-visible actively clears the reason. If :focus-visible
         is unsupported or the check throws, fall back to never pausing
         this way - rotation is the priority. */
      heroEl.addEventListener("focusin", function (e) {
        var kb = false;
        try {
          var target = e ? e.target : null;
          kb = !!(
            target &&
            typeof target.matches === "function" &&
            target.matches(":focus-visible")
          );
        } catch (errF) {
          kb = false;
        }
        autoPaused.focus = kb;
        syncAutoplay();
      });

      /* Moving focus between two cards fires focusout with relatedTarget
         still inside .hero - that must NOT resume; only a focusout whose
         target left the hero (or went nowhere) unpauses. */
      heroEl.addEventListener("focusout", function (e) {
        var nextEl = e ? e.relatedTarget : null;
        if (nextEl && heroEl.contains && heroEl.contains(nextEl)) return;
        autoPaused.focus = false;
        syncAutoplay();
      });

      /* Hero scrolled away: rotation is pointless work, so no timer
         at all. Without IntersectionObserver the reason stays false
         and the carousel simply always runs. */
      if (typeof window.IntersectionObserver === "function") {
        try {
          autoObserver = new window.IntersectionObserver(
            function (entries) {
              for (var k = 0; k < entries.length; k++) {
                autoPaused.outOfView = !entries[k].isIntersecting;
              }
              syncAutoplay();
            },
            { threshold: 0 }
          );
          autoObserver.observe(heroEl);
        } catch (errIo) {
          autoPaused.outOfView = false;
        }
      }
    }

    /* First auto-advance lands 6s after load. syncAutoplay() refuses
       to arm below two slides, so a single-slide rail stays static. */
    syncAutoplay();

    schedulePreload();
  }

  /* ---------- start once the DOM is ready, never throw ---------- */
  function start() {
    try {
      init();
    } catch (err) {
      warn("hero.js: carousel not initialised", err);
    }
  }

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
