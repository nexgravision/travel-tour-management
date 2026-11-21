/* =========================================================
   CONTACT - enquiry form validation, package CTAs, newsletter
   ========================================================= */
(function () {
  "use strict";

  var NG = (window.NG = window.NG || {});

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---------- Tiny guarded helpers ---------- */
  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function toast(message, type) {
    if (typeof NG.toast === "function") NG.toast(message, type);
  }

  function setStatus(el, message, state) {
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("is-success", state === "success");
    el.classList.toggle("is-error", state === "error");
  }

  /* Toggle .is-invalid on the wrapping .field / .check.
     Returns the validity it was given (true when control is missing). */
  function check(control, isValid) {
    if (!control) return true;
    var wrap = typeof control.closest === "function" ? control.closest(".field, .check") : null;
    if (wrap) wrap.classList.toggle("is-invalid", !isValid);
    return isValid;
  }

  /* Clear the invalid state the moment the user edits the control. */
  function watch(control, statusEl) {
    if (!control) return;
    var evt = control.type === "checkbox" ? "change" : "input";
    control.addEventListener(evt, function () {
      var wrap = typeof control.closest === "function" ? control.closest(".field, .check") : null;
      if (wrap) wrap.classList.remove("is-invalid");
      if (statusEl && statusEl.classList.contains("is-error")) setStatus(statusEl, "", null);
    });
  }

  /* =======================================================
     Enquiry form
     ======================================================= */
  var form = $("#contactForm");

  if (form) {
    var nameInput = $("#cfName", form);
    var emailInput = $("#cfEmail", form);
    var consent = $("#cfConsent", form);
    var status = $("#cfStatus", form);

    watch(nameInput, status);
    watch(emailInput, status);
    watch(consent, status);

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var nameValue = nameInput ? nameInput.value.trim() : "";
      var emailValue = emailInput ? emailInput.value.trim() : "";
      var problems = [];

      if (!check(nameInput, nameValue.length >= 2)) problems.push(nameInput);
      if (!check(emailInput, EMAIL_RE.test(emailValue))) problems.push(emailInput);
      if (!check(consent, !!consent && consent.checked)) problems.push(consent);

      if (problems.length) {
        setStatus(status, "Please complete the highlighted fields and try again.", "error");
        toast("Please check the highlighted fields", "error");
        var first = problems[0];
        if (first && typeof first.focus === "function") first.focus();
        return;
      }

      setStatus(
        status,
        "Thanks " + nameValue + " - a travel specialist will reply within 2 working hours.",
        "success"
      );
      toast("Enquiry received - a specialist will reply within 2 working hours.", "success");
      form.reset();
    });
  }

  /* =======================================================
     [data-package] CTAs - prefill interest + message
     Smooth scroll to #contact is handled globally in main.js,
     so never preventDefault here.
     ======================================================= */
  function interestFor(name) {
    var n = String(name).toLowerCase();
    if (n.indexOf("honeymoon") !== -1) return "Honeymoon Trip";
    if (n.indexOf("group") !== -1) return "Group Tour";
    if (n.indexOf("flight") !== -1) return "Flight Booking";
    if (n.indexOf("hotel") !== -1) return "Hotel Booking";
    if (n.indexOf("custom") !== -1) return "Customized Tour";
    if (n.indexOf("corporate") !== -1) return "Corporate Travel";
    return "Holiday Package";
  }

  document.addEventListener("click", function (e) {
    var target = e.target;
    if (!target || typeof target.closest !== "function") return;

    var trigger = target.closest("[data-package]");
    if (!trigger) return;

    var packageName = (trigger.getAttribute("data-package") || "").trim();
    if (!packageName) return;

    var interest = $("#cfInterest");
    if (interest && interest.options && interest.options.length) {
      var value = interestFor(packageName);
      for (var i = 0; i < interest.options.length; i++) {
        if (interest.options[i].value === value) {
          interest.value = value;
          break;
        }
      }
    }

    var message = $("#cfMessage");
    if (message && !message.value.trim()) {
      message.value = "I'm interested in: " + packageName + ". ";
    }
  });

  /* =======================================================
     Newsletter signup
     ======================================================= */
  var newsletter = $("#newsletterForm");

  if (newsletter) {
    var nlInput = $("#nlEmail");
    var nlStatus = $("#nlStatus");

    if (nlInput) {
      nlInput.addEventListener("input", function () {
        nlInput.classList.remove("is-invalid");
        if (nlStatus && nlStatus.classList.contains("is-error")) setStatus(nlStatus, "", null);
      });
    }

    newsletter.addEventListener("submit", function (e) {
      e.preventDefault();

      var value = nlInput ? nlInput.value.trim() : "";

      if (!EMAIL_RE.test(value)) {
        if (nlInput) {
          nlInput.classList.add("is-invalid");
          nlInput.focus();
        }
        setStatus(nlStatus, "Please enter a valid email address.", "error");
        toast("Please enter a valid email address", "error");
        return;
      }

      if (nlInput) nlInput.classList.remove("is-invalid");
      setStatus(nlStatus, "You're on the list - one deal email a month, no spam.", "success");
      toast("Subscribed! Monthly travel deals are on the way.", "success");
      newsletter.reset();
    });
  }
})();
