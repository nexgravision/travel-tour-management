/* =========================================================
   SEARCH - hero travel search form (#heroSearchForm)
   Filters the destination grid and reports the result.
   ========================================================= */
(function () {
  "use strict";

  var form = document.getElementById("heroSearchForm");
  var destSelect = document.getElementById("searchDestination");
  var dateInput = document.getElementById("searchDate");
  var travSelect = document.getElementById("searchTravellers");
  var msgEl = document.getElementById("searchMsg");
  var destGrid = document.getElementById("destGrid");
  var destEmpty = document.getElementById("destEmpty");
  var destReset = document.getElementById("destReset");

  var OK_CLASS = "is-success";
  var ERR_CLASS = "is-error";

  /* ---------- tiny helpers ---------- */
  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function toISODate(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function setText(msg, type) {
    if (!msgEl) return;
    msgEl.classList.remove(OK_CLASS, ERR_CLASS);
    msgEl.textContent = msg || "";
    if (type === "error") msgEl.classList.add(ERR_CLASS);
    else if (type === "success") msgEl.classList.add(OK_CLASS);
  }

  function toast(msg, type) {
    if (window.NG && typeof window.NG.toast === "function") window.NG.toast(msg, type);
  }

  function selectedLabel(select) {
    if (!select) return "";
    var idx = select.selectedIndex;
    if (idx < 0 || !select.options[idx]) return "";
    return String(select.options[idx].textContent || "").trim();
  }

  /* "Bali, Indonesia" -> "Bali" for compact messages */
  function shortLabel(label) {
    var parts = String(label || "").split(",");
    return parts[0].trim() || label || "that destination";
  }

  function getCards() {
    if (!destGrid) return [];
    return Array.prototype.slice.call(destGrid.querySelectorAll(".dest-card"));
  }

  function applyFilter(term) {
    var cards = getCards();
    var needle = String(term || "all").toLowerCase();
    var matches = 0;
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var name = String(card.getAttribute("data-name") || "").toLowerCase();
      var hit = needle === "all" || (name !== "" && name.indexOf(needle) !== -1);
      card.classList.toggle("is-hidden", !hit);
      if (hit) matches++;
    }
    return matches;
  }

  function scrollToDestinations() {
    var target = document.getElementById("destinations");
    if (!target || typeof target.scrollIntoView !== "function") return;
    var reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    } catch (err) {
      target.scrollIntoView();
    }
  }

  /* ---------- earliest selectable date = today ---------- */
  if (dateInput) dateInput.setAttribute("min", toISODate(new Date()));

  /* ---------- submit ---------- */
  function onSubmit(e) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    /* Validation (form carries novalidate, so do it ourselves) */
    var dateVal = dateInput ? String(dateInput.value || "") : "";
    if (dateInput && !dateVal) {
      setText("Please choose a travel date to continue.", "error");
      toast("Please choose a travel date.", "error");
      try {
        dateInput.focus();
      } catch (err) {}
      return;
    }
    var min = dateInput ? dateInput.getAttribute("min") : "";
    if (min && dateVal && dateVal < min) {
      setText("Travel date can't be in the past - pick " + min + " or later.", "error");
      toast("Travel date can't be in the past.", "error");
      try {
        dateInput.focus();
      } catch (err) {}
      return;
    }

    var term = destSelect ? String(destSelect.value || "all") : "all";
    var travLabel = selectedLabel(travSelect) || "1 traveller";
    var destLabel = selectedLabel(destSelect) || "All destinations";
    var matches = applyFilter(term);

    if (destEmpty) destEmpty.hidden = matches > 0;

    var text;
    if (matches === 0) {
      text = "No destinations match " + shortLabel(destLabel) + " · " + travLabel;
      setText(text, "error");
      toast(text, "error");
    } else if (term === "all") {
      text = "Showing all " + matches + " destinations · " + travLabel;
      setText(text, "success");
      toast(text);
    } else {
      text =
        matches +
        (matches === 1 ? " destination matches " : " destinations match ") +
        shortLabel(destLabel) +
        " · " +
        travLabel;
      setText(text, "success");
      toast(text);
    }

    scrollToDestinations();
  }

  if (form) form.addEventListener("submit", onSubmit);

  /* ---------- "view all destinations" reset ---------- */
  if (destReset) {
    destReset.addEventListener("click", function () {
      if (destSelect) destSelect.value = "all";
      applyFilter("all");
      if (destEmpty) destEmpty.hidden = true;
      setText("");
      scrollToDestinations();
      toast("Showing all destinations");
    });
  }
})();
