/* =========================================================
   MODAL - legal info modal (privacy / terms / cookies)
   ========================================================= */
(function () {
  "use strict";

  var NG = (window.NG = window.NG || {});

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

  /* ---------- Internal copy ---------- */
  var CONTENT = {
    privacy: {
      title: "Privacy Policy",
      body: [
        "<p>NexGravision Tours &amp; Travel respects your privacy. This policy explains what we collect when you browse our site, request an itinerary or book a trip with us, and how we put it to work.</p>",
        "<p><strong>What we collect</strong></p>",
        "<ul>",
        "<li>Contact details you type into our forms - name, email, phone and travel preferences.</li>",
        "<li>Booking information - traveller names, passport and visa details required by airlines and hotels.</li>",
        "<li>Payment references handled by our PCI-compliant payment partners; we never store card numbers.</li>",
        "<li>Anonymous usage data such as pages viewed and device type, used only to improve the site.</li>",
        "</ul>",
        "<p><strong>How we use it</strong> - to cost and confirm your itinerary, meet supplier requirements, send booking updates and, only with your consent, share monthly fare deals. We never sell your data.</p>",
        "<p>We share the minimum necessary with airlines, hotels, visa agents and insurance partners to confirm your booking. Records are kept only as long as travel regulations require. You can request access, correction or deletion at any time by writing to privacy@nexgravision.travel.</p>"
      ].join("")
    },

    terms: {
      title: "Terms & Conditions",
      body: [
        "<p>These terms apply to bookings made with NexGravision Tours &amp; Travel, an IATA-accredited agency based in Mumbai. Confirming a booking means you accept them.</p>",
        "<p><strong>Bookings &amp; payment</strong> - a 25% deposit confirms your reservation and the balance is due 30 days before departure. Trips booked within 30 days of travel are payable in full at the time of confirmation.</p>",
        "<p><strong>Pricing</strong> - prices are quoted in Indian Rupees and include the taxes shown on your itinerary. Airfares and hotel rates may move with currency, fuel and government levies; any change is passed on at cost with written notice before you pay.</p>",
        "<p><strong>Cancellations</strong> - deposits are non-refundable once suppliers are committed, and cancellation charges rise as departure approaches (typically 10% to 100% of the trip cost). Airline tickets follow the fare rules of the carrier. We recommend comprehensive travel insurance for every journey.</p>",
        "<p><strong>Responsibility</strong> - you are responsible for valid passports, visas and entry requirements. We are not liable for disruptions beyond our control, including weather, strikes or government action. These terms are governed by the laws of India and disputes are handled in Mumbai.</p>"
      ].join("")
    },

    cookies: {
      title: "Cookie Policy",
      body: [
        "<p>Cookies are small text files stored on your device. We use a handful of them to keep the site working and to understand how travellers browse our packages.</p>",
        "<p><strong>Cookies we set</strong></p>",
        "<ul>",
        "<li><strong>Essential</strong> - session and security cookies that keep forms and bookings working.</li>",
        "<li><strong>Preferences</strong> - remember choices such as your destination filter between visits.</li>",
        "<li><strong>Analytics</strong> - aggregated, anonymous statistics about pages visited and devices used.</li>",
        "<li><strong>Marketing</strong> - measure campaign performance and limit how often you see our offers.</li>",
        "</ul>",
        "<p>We also use third-party cookies from Google Analytics and embedded maps, which run under their own policies.</p>",
        "<p>You can clear or block cookies at any time in your browser settings; blocking essential cookies may stop forms and bookings from working. Questions about this policy can be sent to hello@nexgravision.travel.</p>"
      ].join("")
    }
  };

  /* ---------- Elements ---------- */
  var modal = $("#infoModal");
  var titleEl = $("#modalTitle");
  var bodyEl = $("#modalBody");
  var dialog = modal ? $(".modal__dialog", modal) : null;
  var closeBtn = modal ? $(".modal__close", modal) : null;

  var isOpen = false;
  var isClosing = false;
  var closeTimer = null;
  var lastFocused = null;
  var scrollLocked = false;
  var prevOverflow = "";

  function reduceMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function lockScroll(lock) {
    if (lock && !scrollLocked) {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      scrollLocked = true;
    } else if (!lock && scrollLocked) {
      document.body.style.overflow = prevOverflow || "";
      scrollLocked = false;
    }
  }

  /* ---------- Open ---------- */
  function openModal(key) {
    if (!modal || !titleEl || !bodyEl || isOpen) return;
    var entry = CONTENT[key];
    if (!entry) return;

    /* Cancel a close that is still animating out */
    if (isClosing) {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = null;
      isClosing = false;
    }

    titleEl.textContent = entry.title;
    bodyEl.innerHTML = entry.body;

    lastFocused = document.activeElement;
    isOpen = true;

    /* `.modal` is display:grid in components.css, so the `hidden`
       attribute alone can be overridden - clear the inline fallback,
       reveal the element, then animate in on the next frame. */
    modal.style.display = "";
    modal.hidden = false;
    void modal.offsetWidth; // flush styles so the transition runs

    if (reduceMotion()) {
      modal.classList.add("is-open");
      if (closeBtn) closeBtn.focus();
    } else {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (!isOpen) return;
          modal.classList.add("is-open");
          if (closeBtn) closeBtn.focus();
        });
      });
    }

    lockScroll(true);
  }

  /* ---------- Close (also called by main.js on Escape) ---------- */
  function closeModal() {
    if (!modal || !isOpen || isClosing) return;

    isOpen = false;
    isClosing = true;
    modal.classList.remove("is-open");

    function finish() {
      closeTimer = null;
      isClosing = false;
      if (isOpen) return; // reopened mid-transition - leave it visible
      modal.hidden = true;
      modal.style.display = "none"; // belt & braces vs .modal { display: grid }
      lockScroll(false);
      if (lastFocused && typeof lastFocused.focus === "function" && document.contains(lastFocused)) {
        lastFocused.focus();
      }
      lastFocused = null;
    }

    if (closeTimer) clearTimeout(closeTimer);

    if (reduceMotion()) {
      finish();
    } else {
      closeTimer = setTimeout(finish, 380); // var(--dur) = 320ms + buffer
    }
  }

  /* ---------- Wiring ---------- */
  if (modal && modal.hidden) modal.style.display = "none";

  document.addEventListener("click", function (e) {
    var target = e.target;
    if (!target || typeof target.closest !== "function") return;

    var opener = target.closest("[data-modal]");
    if (opener) {
      var key = opener.getAttribute("data-modal");
      if (key) openModal(key);
      return;
    }

    if (target.closest("[data-modal-close]")) closeModal();
  });

  /* Keep Tab focus inside the dialog while it is open */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Tab" || !isOpen || !dialog) return;

    var focusables = $$("a[href], button, input, select, textarea, [tabindex]", dialog).filter(
      function (el) {
        return !el.disabled && el.getAttribute("tabindex") !== "-1";
      }
    );
    if (!focusables.length) return;

    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    var active = document.activeElement;

    if (!dialog.contains(active)) {
      e.preventDefault();
      first.focus();
      return;
    }
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* main.js calls NG.closeModal() on Escape */
  NG.closeModal = closeModal;
})();
