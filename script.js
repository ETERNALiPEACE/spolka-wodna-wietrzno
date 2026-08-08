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

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function toLocalValue(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function formatDisplay(date) {
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function initDateTimePicker() {
    const hidden = document.getElementById("noticed");
    const trigger = document.getElementById("noticed-display");
    const triggerText = trigger?.querySelector(".datetime-trigger-text");
    const popover = document.getElementById("noticed-popover");
    const monthLabel = document.getElementById("noticed-month");
    const daysEl = document.getElementById("noticed-days");
    const hoursEl = document.getElementById("noticed-hours");
    const minutesEl = document.getElementById("noticed-minutes");

    if (!hidden || !trigger || !triggerText || !popover || !monthLabel || !daysEl || !hoursEl || !minutesEl) {
      return null;
    }

    const now = new Date();
    let viewYear = now.getFullYear();
    let viewMonth = now.getMonth();
    let selected = null;

    const monthFormatter = new Intl.DateTimeFormat("pl-PL", {
      month: "long",
      year: "numeric",
    });

    function syncTrigger() {
      if (!selected) {
        hidden.value = "";
        triggerText.textContent = "Wybierz datę i godzinę";
        trigger.classList.add("is-empty");
        return;
      }
      hidden.value = toLocalValue(selected);
      triggerText.textContent = formatDisplay(selected);
      trigger.classList.remove("is-empty");
    }

    function setOpen(open) {
      popover.hidden = !open;
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) render();
    }

    function renderDays() {
      daysEl.innerHTML = "";
      const first = new Date(viewYear, viewMonth, 1);
      const startOffset = (first.getDay() + 6) % 7;
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const prevDays = new Date(viewYear, viewMonth, 0).getDate();

      for (let i = 0; i < 42; i += 1) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "datetime-day";

        let dayNum;
        let date;
        if (i < startOffset) {
          dayNum = prevDays - startOffset + i + 1;
          date = new Date(viewYear, viewMonth - 1, dayNum);
          btn.classList.add("is-muted");
        } else if (i >= startOffset + daysInMonth) {
          dayNum = i - startOffset - daysInMonth + 1;
          date = new Date(viewYear, viewMonth + 1, dayNum);
          btn.classList.add("is-muted");
        } else {
          dayNum = i - startOffset + 1;
          date = new Date(viewYear, viewMonth, dayNum);
        }

        btn.textContent = String(dayNum);
        if (
          selected &&
          date.getFullYear() === selected.getFullYear() &&
          date.getMonth() === selected.getMonth() &&
          date.getDate() === selected.getDate()
        ) {
          btn.classList.add("is-selected");
        }

        btn.addEventListener("click", () => {
          const hours = selected ? selected.getHours() : now.getHours();
          const minutes = selected ? selected.getMinutes() : now.getMinutes();
          selected = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
          viewYear = selected.getFullYear();
          viewMonth = selected.getMonth();
          syncTrigger();
          render();
        });

        daysEl.appendChild(btn);
      }
    }

    function renderTimeList(container, count, getValue, onPick) {
      container.innerHTML = "";
      for (let i = 0; i < count; i += 1) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "datetime-time-option";
        btn.textContent = pad(i);
        if (selected && getValue(selected) === i) {
          btn.classList.add("is-selected");
        }
        btn.addEventListener("click", () => {
          if (!selected) {
            selected = new Date(viewYear, viewMonth, now.getDate(), now.getHours(), now.getMinutes());
          }
          onPick(i);
          syncTrigger();
          render();
          btn.scrollIntoView({ block: "nearest" });
        });
        container.appendChild(btn);
      }

      const active = container.querySelector(".is-selected");
      if (active) active.scrollIntoView({ block: "nearest" });
    }

    function render() {
      monthLabel.textContent = monthFormatter.format(new Date(viewYear, viewMonth, 1));
      renderDays();
      renderTimeList(hoursEl, 24, (d) => d.getHours(), (h) => {
        selected.setHours(h);
      });
      renderTimeList(minutesEl, 60, (d) => d.getMinutes(), (m) => {
        selected.setMinutes(m);
      });
    }

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      setOpen(popover.hidden);
    });

    popover.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    popover.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const delta = Number(btn.getAttribute("data-nav") || 0);
        const next = new Date(viewYear, viewMonth + delta, 1);
        viewYear = next.getFullYear();
        viewMonth = next.getMonth();
        render();
      });
    });

    popover.querySelector('[data-action="clear"]')?.addEventListener("click", () => {
      selected = null;
      syncTrigger();
      render();
    });

    popover.querySelector('[data-action="today"]')?.addEventListener("click", () => {
      selected = new Date();
      viewYear = selected.getFullYear();
      viewMonth = selected.getMonth();
      syncTrigger();
      render();
    });

    document.addEventListener("pointerdown", (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (popover.hidden) return;
      if (popover.contains(target) || trigger.contains(target)) return;
      setOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !popover.hidden) {
        setOpen(false);
        trigger.focus();
      }
    });

    syncTrigger();

    return {
      reset() {
        selected = null;
        const fresh = new Date();
        viewYear = fresh.getFullYear();
        viewMonth = fresh.getMonth();
        setOpen(false);
        syncTrigger();
      },
    };
  }

  const dateTimePicker = initDateTimePicker();

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
      const tag = event.target instanceof HTMLElement ? event.target.tagName : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") {
        if (!(event.target instanceof HTMLElement) || !event.target.classList.contains("tab")) {
          return;
        }
      }
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
        dateTimePicker?.reset();
        setStatus(
          "Państwa zgłoszenie zostało skierowane do rozpatrzenia przez Spółkę Wodną. Odpowiedź zostanie udzielona w najkrótszym możliwym terminie.",
          "is-ok"
        );
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
  if (params.get("tab") === "news") {
    activate("news");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatNewsDate(value) {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" }).format(date);
  }

  function sortNewsPosts(posts) {
    return [...posts].sort((a, b) => {
      if (a.date === b.date) return String(b.id).localeCompare(String(a.id));
      return a.date < b.date ? 1 : -1;
    });
  }

  function newsItemHtml(post) {
    return `
      <li class="news-item">
        <time datetime="${escapeHtml(post.date)}">${escapeHtml(formatNewsDate(post.date))}</time>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.body)}</p>
      </li>`;
  }

  function renderNewsInto(listId, posts, limit) {
    const list = document.getElementById(listId);
    if (!list) return;

    const items = sortNewsPosts(Array.isArray(posts) ? posts : []);
    const visible = typeof limit === "number" ? items.slice(0, limit) : items;

    if (!visible.length) {
      list.innerHTML = '<li class="news-item news-empty">Brak aktualności do wyświetlenia.</li>';
      return;
    }

    list.innerHTML = visible.map(newsItemHtml).join("");
  }

  function renderNewsList(posts) {
    renderNewsInto("news-list", posts);
    renderNewsInto("home-news-list", posts, 4);
  }

  async function loadNewsPosts() {
    const list = document.getElementById("news-list");
    const homeList = document.getElementById("home-news-list");
    if (!list && !homeList) return;

    const newsConfig = window.NEWS_CONFIG || {};
    const scriptUrl = String(newsConfig.scriptUrl || "").trim();
    const localKey = "spolka-wodna-news-posts";

    function showNewsError() {
      const html =
        '<li class="news-item news-empty">Nie udało się wczytać aktualności.</li>';
      if (list) list.innerHTML = html;
      if (homeList) homeList.innerHTML = html;
    }

    try {
      if (scriptUrl) {
        const response = await fetch(scriptUrl, { method: "GET" });
        const result = await response.json();
        if (result?.success && Array.isArray(result.posts) && result.posts.length) {
          renderNewsList(result.posts);
          return;
        }
      }
    } catch {
      // fallback poniżej
    }

    try {
      const localRaw = localStorage.getItem(localKey);
      if (localRaw) {
        const localPosts = JSON.parse(localRaw);
        if (Array.isArray(localPosts) && localPosts.length) {
          renderNewsList(localPosts);
          return;
        }
      }
    } catch {
      // fallback poniżej
    }

    try {
      const response = await fetch(`data/news.json?v=${Date.now()}`);
      const data = await response.json();
      renderNewsList(data.posts || []);
    } catch {
      showNewsError();
    }
  }

  loadNewsPosts();
})();
