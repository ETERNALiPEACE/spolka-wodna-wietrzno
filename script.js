(() => {
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const panels = Array.from(document.querySelectorAll(".panel"));
  const year = document.getElementById("year");
  const reportForm = document.getElementById("report-form");
  const reportStatus = document.getElementById("report-status");
  const submitBtn = reportForm?.querySelector('button[type="submit"]');

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  function activate(tabId) {
    tabs.forEach((tab) => {
      const active = tab.dataset.tab === tabId;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    panels.forEach((panel) => {
      const active = panel.id === `panel-${tabId}`;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
  }

  function setStatus(message, type) {
    if (!reportStatus) return;
    reportStatus.hidden = false;
    reportStatus.textContent = message;
    reportStatus.classList.remove("is-ok", "is-error");
    if (type) reportStatus.classList.add(type);
  }

  function formatNoticed(value) {
    const raw = String(value || "").trim();
    if (!raw) return "—";

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;

    return new Intl.DateTimeFormat("pl-PL", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(date);
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activate(tab.dataset.tab));
  });

  document.querySelectorAll("[data-go-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-go-tab");
      if (!target) return;
      activate(target);
      document.getElementById(`tab-${target}`)?.focus();
    });
  });

  document.addEventListener("keydown", (event) => {
    const currentIndex = tabs.findIndex((tab) => tab.classList.contains("is-active"));
    if (currentIndex < 0) return;

    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const next = (currentIndex + delta + tabs.length) % tabs.length;
      tabs[next].focus();
      activate(tabs[next].dataset.tab);
    }
  });

  if (reportForm) {
    reportForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!reportForm.reportValidity()) return;

      const scriptUrl = String(window.MAIL_CONFIG?.scriptUrl || "").trim();
      if (!scriptUrl) {
        setStatus(
          "Brak adresu wysyłki. Uzupełnij scriptUrl w pliku config.js.",
          "is-error"
        );
        return;
      }

      const data = new FormData(reportForm);
      const noticedRaw = String(data.get("noticed") || "").trim();
      const payload = {
        name: String(data.get("name") || "").trim(),
        email: String(data.get("email") || "").trim(),
        phone: String(data.get("phone") || "").trim(),
        address: String(data.get("address") || "").trim(),
        type: String(data.get("type") || "").trim(),
        description: String(data.get("description") || "").trim(),
        noticed: formatNoticed(noticedRaw),
      };

      if (submitBtn) submitBtn.disabled = true;
      setStatus("Wysyłanie zgłoszenia…");

      try {
        const response = await fetch(scriptUrl, {
          method: "POST",
          // text/plain unika problemów CORS z Google Apps Script
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (!result.success) {
          setStatus(result.message || "Nie udało się wysłać zgłoszenia.", "is-error");
          return;
        }

        reportForm.reset();
        setStatus("Zgłoszenie zostało wysłane na leogamepl@gmail.com.", "is-ok");
      } catch {
        setStatus(
          "Nie udało się połączyć z wysyłką. Sprawdź URL w config.js i czy skrypt jest wdrożony publicznie.",
          "is-error"
        );
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("tab") === "report") {
    activate("report");
  }
})();
