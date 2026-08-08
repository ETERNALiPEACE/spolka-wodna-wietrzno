(function () {
  "use strict";

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));
  var yearEl = document.getElementById("year");
  var reportForm = document.getElementById("report-form");
  var reportStatus = document.getElementById("report-status");
  var config = window.SITE_CONFIG || {};

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

  function buildMailto(payload) {
    var to = config.reportEmail || "leogamepl@gmail.com";
    var subject = encodeURIComponent("Zgłoszenie awarii: " + payload.type);
    var body = encodeURIComponent(
      [
        "Zgłoszenie awarii / usterki",
        "",
        "Imię i nazwisko: " + payload.name,
        "Telefon: " + payload.phone,
        "E-mail: " + payload.email,
        "Adres: " + payload.address,
        "Rodzaj: " + payload.type,
        "Data zauważenia: " + payload.noticed,
        "",
        "Opis:",
        payload.description
      ].join("\n")
    );
    return "mailto:" + to + "?subject=" + subject + "&body=" + body;
  }

  function loadEmailJs(publicKey) {
    return new Promise(function (resolve, reject) {
      if (window.emailjs && window.emailjs.send) {
        resolve(window.emailjs);
        return;
      }

      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
      script.async = true;
      script.onload = function () {
        if (!window.emailjs) {
          reject(new Error("EmailJS niedostępny"));
          return;
        }
        window.emailjs.init({ publicKey: publicKey });
        resolve(window.emailjs);
      };
      script.onerror = function () {
        reject(new Error("Nie udało się wczytać EmailJS"));
      };
      document.head.appendChild(script);
    });
  }

  function emailJsConfigured() {
    var ej = config.emailjs || {};
    return Boolean(ej.publicKey && ej.serviceId && ej.templateId);
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

      function finish(ok, message) {
        if (submitBtn) submitBtn.disabled = false;
        setStatus(message, ok ? "is-ok" : "is-error");
        if (ok) reportForm.reset();
      }

      if (!emailJsConfigured()) {
        window.location.href = buildMailto(payload);
        finish(
          true,
          "Otwarto klienta poczty. Jeśli nic się nie otworzyło, napisz na " +
            (config.reportEmail || "leogamepl@gmail.com") +
            "."
        );
        return;
      }

      var ej = config.emailjs;
      loadEmailJs(ej.publicKey)
        .then(function (emailjs) {
          return emailjs.send(ej.serviceId, ej.templateId, payload);
        })
        .then(function () {
          finish(true, "Zgłoszenie zostało wysłane. Dziękujemy.");
        })
        .catch(function () {
          window.location.href = buildMailto(payload);
          finish(
            false,
            "Automatyczna wysyłka nie powiodła się — otwarto klienta poczty jako zapas."
          );
        });
    });
  }
})();
