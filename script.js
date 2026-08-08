(function () {
  "use strict";

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));
  var yearEl = document.getElementById("year");
  var reportForm = document.getElementById("report-form");
  var reportStatus = document.getElementById("report-status");
  var mailConfig = window.MAIL_CONFIG || {};

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  function activateTab(tabId) {
    var matched = false;

    tabs.forEach(function (tab) {
      var isActive = tab.getAttribute("data-tab") === tabId;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      if (isActive) matched = true;
    });

    if (!matched) return;

    panels.forEach(function (panel) {
      var isActive = panel.id === "panel-" + tabId;
      panel.classList.toggle("is-active", isActive);
      if (isActive) {
        panel.removeAttribute("hidden");
      } else {
        panel.setAttribute("hidden", "");
      }
    });

    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", "#" + tabId);
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      activateTab(tab.getAttribute("data-tab"));
    });
  });

  document.querySelectorAll("[data-go-tab]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      activateTab(btn.getAttribute("data-go-tab"));
    });
  });

  var hash = (window.location.hash || "").replace(/^#/, "");
  if (hash && document.getElementById("panel-" + hash)) {
    activateTab(hash);
  }

  function setStatus(message, kind) {
    if (!reportStatus) return;
    reportStatus.hidden = !message;
    reportStatus.textContent = message || "";
    reportStatus.classList.remove("is-ok", "is-error");
    if (kind) reportStatus.classList.add(kind);
  }

  function clearInvalid(form) {
    Array.prototype.forEach.call(form.querySelectorAll(".is-invalid"), function (el) {
      el.classList.remove("is-invalid");
    });
  }

  function validateForm(form) {
    clearInvalid(form);
    var valid = true;
    var required = form.querySelectorAll("[required]");

    Array.prototype.forEach.call(required, function (field) {
      if (!String(field.value || "").trim()) {
        field.classList.add("is-invalid");
        valid = false;
      }
    });

    var email = form.querySelector("#email");
    if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      email.classList.add("is-invalid");
      valid = false;
    }

    return valid;
  }

  function collectPayload(form) {
    return {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      address: form.address.value.trim(),
      type: form.type.value.trim(),
      description: form.description.value.trim(),
      noticed: form.noticed.value.trim() || "nie podano"
    };
  }

  function sendReport(payload) {
    var scriptUrl = mailConfig.scriptUrl;
    if (!scriptUrl) {
      return Promise.reject(new Error("Brak adresu skryptu wysyłki"));
    }

    // text/plain unika preflight CORS przy Google Apps Script
    return fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow"
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Wysyłka nie powiodła się");
      }
      return response.text();
    });
  }

  if (reportForm) {
    reportForm.addEventListener("submit", function (event) {
      event.preventDefault();
      setStatus("", null);

      if (!validateForm(reportForm)) {
        setStatus("Uzupełnij wymagane pola formularza.", "is-error");
        return;
      }

      var payload = collectPayload(reportForm);
      var submitBtn = reportForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      sendReport(payload)
        .then(function () {
          reportForm.reset();
          setStatus("Zgłoszenie zostało wysłane. Dziękujemy.", "is-ok");
        })
        .catch(function () {
          setStatus(
            "Nie udało się wysłać zgłoszenia. Spróbuj ponownie lub zadzwoń do biura.",
            "is-error"
          );
        })
        .then(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }
})();
