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

  const brandName = document.getElementById("brand-name");
  const brandLead = document.getElementById("brand-lead");

  const HEADER_COPY = {
    home: {
      title: "Spółka Wodna<br />Wodociągu Wiejskiego",
      lead: "Niezawodne zaopatrzenie w wodę dla mieszkańców naszej gminy.",
    },
    info: {
      title: "Informacje",
      lead: "O spółce, strukturze organizacyjnej oraz dokumentach.",
    },
    news: {
      title: "Aktualności",
      lead: "Komunikaty i informacje dla mieszkańców.",
    },
    forms: {
      title: "Formularze",
      lead: "Wnioski i dokumenty do pobrania.",
    },
    contact: {
      title: "Kontakt",
      lead: "Dane kontaktowe biura spółki.",
    },
    report: {
      title: "Zgłoszenie awarii",
      lead: "Zgłoś awarię lub usterkę sieci wodociągowej.",
    },
    connect: {
      title: "Jak podłączyć wodę?",
      lead: "Krok po kroku — od wniosku do przyłączenia.",
    },
  };

  function updateHeader(tabId) {
    const copy = HEADER_COPY[tabId] || HEADER_COPY.home;
    if (brandName) brandName.innerHTML = copy.title;
    if (brandLead) brandLead.textContent = copy.lead;
  }

  function activate(tabId, options = {}) {
    const animate = options.animate === true;
    const nextId = `panel-${tabId}`;

    tabs.forEach((tab) => {
      const active = tab.dataset.tab === tabId;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    panels.forEach((panel) => {
      const active = panel.id === nextId;
      const wasActive = panel.classList.contains("is-active");
      panel.classList.remove("is-entering");
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
      if (animate && active && !wasActive) {
        // Restart animacji wejścia tylko przy realnej zmianie zakładki.
        void panel.offsetWidth;
        panel.classList.add("is-entering");
      }
    });

    updateHeader(tabId);
  }

  panels.forEach((panel) => {
    panel.addEventListener("animationend", (event) => {
      if (event.target !== panel || event.animationName !== "panelIn") return;
      panel.classList.remove("is-entering");
    });
  });

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

  function getPolandNowParts() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Warsaw",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const get = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
    const hour = get("hour");
    return {
      year: get("year"),
      month: get("month") - 1,
      day: get("day"),
      hour: hour === 24 ? 0 : hour,
      minute: get("minute"),
      second: get("second"),
    };
  }

  function polandTodayYmd() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Warsaw",
    }).format(new Date());
  }

  function shiftYmd(ymd, days) {
    const [y, m, d] = ymd.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  }

  function toYmd(year, monthIndex, day) {
    return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
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

    const MAX_DAYS_BACK = 7;
    const poland = getPolandNowParts();
    let viewYear = poland.year;
    let viewMonth = poland.month;
    let selected = null;

    const monthFormatter = new Intl.DateTimeFormat("pl-PL", {
      month: "long",
      year: "numeric",
    });

    function allowedRange() {
      const maxYmd = polandTodayYmd();
      const minYmd = shiftYmd(maxYmd, -MAX_DAYS_BACK);
      return { minYmd, maxYmd };
    }

    function isDateAllowed(year, monthIndex, day) {
      const ymd = toYmd(year, monthIndex, day);
      const { minYmd, maxYmd } = allowedRange();
      return ymd >= minYmd && ymd <= maxYmd;
    }

    function clampSelectedToRange() {
      if (!selected) return;
      const ymd = toYmd(selected.getFullYear(), selected.getMonth(), selected.getDate());
      const { minYmd, maxYmd } = allowedRange();
      if (ymd < minYmd || ymd > maxYmd) {
        selected = null;
        return;
      }
      const nowPl = getPolandNowParts();
      const todayYmd = toYmd(nowPl.year, nowPl.month, nowPl.day);
      if (ymd === todayYmd) {
        const selectedMinutes = selected.getHours() * 60 + selected.getMinutes();
        const nowMinutes = nowPl.hour * 60 + nowPl.minute;
        if (selectedMinutes > nowMinutes) {
          selected.setHours(nowPl.hour, nowPl.minute, 0, 0);
        }
      }
    }

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

    function scrollFieldIntoView() {
      const field = trigger.closest(".datetime-field") || popover;
      const rect = field.getBoundingClientRect();
      const margin = 20;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      let delta = 0;
      if (rect.bottom > viewportHeight - margin) {
        delta = rect.bottom - (viewportHeight - margin);
      }
      if (rect.top - delta < margin) {
        delta = rect.top - margin;
      }
      if (delta !== 0) {
        window.scrollBy({ top: delta, left: 0, behavior: "smooth" });
      }
    }

    function setOpen(open) {
      popover.hidden = !open;
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        const nowPl = getPolandNowParts();
        viewYear = nowPl.year;
        viewMonth = nowPl.month;
        render();
        // Wait a frame so the expanded calendar height is measured, then keep
        // the whole field (trigger + calendar + hint) inside the viewport.
        requestAnimationFrame(() => {
          scrollFieldIntoView();
          requestAnimationFrame(scrollFieldIntoView);
        });
      }
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
        let year = viewYear;
        let monthIndex = viewMonth;
        if (i < startOffset) {
          dayNum = prevDays - startOffset + i + 1;
          monthIndex = viewMonth - 1;
          if (monthIndex < 0) {
            monthIndex = 11;
            year -= 1;
          }
          btn.classList.add("is-muted");
        } else if (i >= startOffset + daysInMonth) {
          dayNum = i - startOffset - daysInMonth + 1;
          monthIndex = viewMonth + 1;
          if (monthIndex > 11) {
            monthIndex = 0;
            year += 1;
          }
          btn.classList.add("is-muted");
        } else {
          dayNum = i - startOffset + 1;
        }

        const allowed = isDateAllowed(year, monthIndex, dayNum);
        btn.textContent = String(dayNum);
        if (!allowed) {
          btn.disabled = true;
          btn.classList.add("is-disabled");
        }

        if (
          selected &&
          selected.getFullYear() === year &&
          selected.getMonth() === monthIndex &&
          selected.getDate() === dayNum
        ) {
          btn.classList.add("is-selected");
        }

        btn.addEventListener("click", () => {
          if (!allowed) return;
          const nowPl = getPolandNowParts();
          const hours = selected ? selected.getHours() : nowPl.hour;
          const minutes = selected ? selected.getMinutes() : nowPl.minute;
          selected = new Date(year, monthIndex, dayNum, hours, minutes);
          clampSelectedToRange();
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
      const nowPl = getPolandNowParts();
      const todayYmd = toYmd(nowPl.year, nowPl.month, nowPl.day);
      const selectedYmd = selected
        ? toYmd(selected.getFullYear(), selected.getMonth(), selected.getDate())
        : null;

      for (let i = 0; i < count; i += 1) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "datetime-time-option";
        btn.textContent = pad(i);

        let disabled = false;
        if (selectedYmd === todayYmd) {
          if (container === hoursEl && i > nowPl.hour) disabled = true;
          if (
            container === minutesEl &&
            selected &&
            selected.getHours() === nowPl.hour &&
            i > nowPl.minute
          ) {
            disabled = true;
          }
        }
        if (disabled) {
          btn.disabled = true;
          btn.classList.add("is-disabled");
        }

        if (selected && getValue(selected) === i) {
          btn.classList.add("is-selected");
        }
        btn.addEventListener("click", () => {
          if (btn.disabled) return;
          if (!selected) {
            selected = new Date(nowPl.year, nowPl.month, nowPl.day, nowPl.hour, nowPl.minute);
          }
          if (!isDateAllowed(selected.getFullYear(), selected.getMonth(), selected.getDate())) {
            selected = new Date(nowPl.year, nowPl.month, nowPl.day, nowPl.hour, nowPl.minute);
          }
          onPick(i);
          clampSelectedToRange();
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

      const { minYmd, maxYmd } = allowedRange();
      const minMonth = minYmd.slice(0, 7);
      const maxMonth = maxYmd.slice(0, 7);
      const viewKey = `${viewYear}-${pad(viewMonth + 1)}`;
      popover.querySelectorAll("[data-nav]").forEach((btn) => {
        const delta = Number(btn.getAttribute("data-nav") || 0);
        if (delta < 0) btn.disabled = viewKey <= minMonth;
        if (delta > 0) btn.disabled = viewKey >= maxMonth;
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
        if (btn.disabled) return;
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
      const nowPl = getPolandNowParts();
      selected = new Date(nowPl.year, nowPl.month, nowPl.day, nowPl.hour, nowPl.minute);
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
        const nowPl = getPolandNowParts();
        viewYear = nowPl.year;
        viewMonth = nowPl.month;
        setOpen(false);
        syncTrigger();
      },
    };
  }

  const dateTimePicker = initDateTimePicker();

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activate(tab.dataset.tab, { animate: true }));
  });

  document.querySelectorAll("[data-go-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-go-tab");
      if (!target) return;
      activate(target, { animate: true });
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
      activate(tabs[next].dataset.tab, { animate: true });
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
        <div class="news-item-body">${formatNewsBodyHtml(post.body)}</div>
      </li>`;
  }

  function hasHtmlTags(value) {
    return /<[a-z][\s\S]*>/i.test(String(value || ""));
  }

  function normalizeColor(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
    if (/^#[0-9a-f]{3}$/.test(raw)) {
      return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
    }
    const rgb = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgb) {
      const toHex = (n) => Number(n).toString(16).padStart(2, "0");
      return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`;
    }
    return "";
  }

  function extractSafeColor(el) {
    if (!(el instanceof HTMLElement)) return "";
    const fromAttr = normalizeColor(el.getAttribute("color") || "");
    if (fromAttr) return fromAttr;
    return normalizeColor(el.style?.color || "");
  }

  function extractSafeSizeClass(el) {
    if (!(el instanceof HTMLElement)) return "";
    const sizes = [12, 14, 16, 18, 20, 24];
    for (const size of sizes) {
      if (el.classList.contains(`news-text-${size}`)) return `news-text-${size}`;
    }
    if (el.classList.contains("news-text-sm")) return "news-text-14";
    if (el.classList.contains("news-text-lg")) return "news-text-20";
    if (el.classList.contains("news-text-xl")) return "news-text-24";
    return "";
  }

  function sanitizeNewsHtml(html) {
    const root = document.createElement("div");
    root.innerHTML = String(html || "");

    const clean = (parent) => {
      [...parent.childNodes].forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) return;
        if (node.nodeType !== Node.ELEMENT_NODE) {
          node.remove();
          return;
        }

        const tag = node.tagName;
        if (tag === "BR") {
          [...node.attributes].forEach((attr) => node.removeAttribute(attr.name));
          return;
        }

        if (tag === "STRONG" || tag === "B") {
          const strong = document.createElement("strong");
          while (node.firstChild) strong.appendChild(node.firstChild);
          node.replaceWith(strong);
          clean(strong);
          return;
        }

        if (tag === "EM" || tag === "I") {
          const em = document.createElement("em");
          while (node.firstChild) em.appendChild(node.firstChild);
          node.replaceWith(em);
          clean(em);
          return;
        }

        if (tag === "U") {
          const underline = document.createElement("u");
          while (node.firstChild) underline.appendChild(node.firstChild);
          node.replaceWith(underline);
          clean(underline);
          return;
        }

        if (tag === "SPAN" || tag === "FONT") {
          const sizeClass = extractSafeSizeClass(node);
          const color = extractSafeColor(node);
          if (sizeClass || color) {
            const span = document.createElement("span");
            if (sizeClass) span.className = sizeClass;
            if (color) span.style.color = color;
            while (node.firstChild) span.appendChild(node.firstChild);
            node.replaceWith(span);
            clean(span);
            return;
          }
        }

        if (tag === "DIV" || tag === "P") {
          const fragment = document.createDocumentFragment();
          if (node.previousSibling) fragment.appendChild(document.createElement("br"));
          while (node.firstChild) fragment.appendChild(node.firstChild);
          if (node.nextSibling) fragment.appendChild(document.createElement("br"));
          node.replaceWith(fragment);
          clean(parent);
          return;
        }

        while (node.firstChild) node.parentNode.insertBefore(node.firstChild, node);
        node.remove();
      });
    };

    clean(root);
    return root.innerHTML.replace(/(<br>\s*)+$/g, "").trim();
  }

  function formatNewsBodyHtml(raw) {
    const value = String(raw || "");
    if (!value) return "";
    if (!hasHtmlTags(value)) {
      return escapeHtml(value).replaceAll("\n", "<br>");
    }
    return sanitizeNewsHtml(value);
  }

  const NEWS_PAGE_SIZE = 10;
  let allNewsPosts = [];
  let newsPage = 1;

  function getNewsPageCount(total) {
    return Math.max(1, Math.ceil(total / NEWS_PAGE_SIZE));
  }

  function renderNewsPagination(total, page) {
    const nav = document.getElementById("news-pagination");
    if (!nav) return;

    const pageCount = getNewsPageCount(total);
    if (total <= NEWS_PAGE_SIZE) {
      nav.hidden = true;
      nav.innerHTML = "";
      return;
    }

    newsPage = Math.min(Math.max(1, page), pageCount);
    nav.hidden = false;

    const buttons = [];
    buttons.push(
      `<button type="button" class="news-page-btn" data-news-page="${newsPage - 1}" ${
        newsPage <= 1 ? "disabled" : ""
      } aria-label="Poprzednia strona">Poprzednia</button>`
    );

    for (let i = 1; i <= pageCount; i += 1) {
      const active = i === newsPage;
      buttons.push(
        `<button type="button" class="news-page-btn${active ? " is-active" : ""}" data-news-page="${i}" ${
          active ? 'aria-current="page"' : ""
        }>${i}</button>`
      );
    }

    buttons.push(
      `<button type="button" class="news-page-btn" data-news-page="${newsPage + 1}" ${
        newsPage >= pageCount ? "disabled" : ""
      } aria-label="Następna strona">Następna</button>`
    );

    nav.innerHTML = `
      <p class="news-page-status">Strona ${newsPage} z ${pageCount}</p>
      <div class="news-page-controls">${buttons.join("")}</div>
    `;
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

  function renderNewsListPage() {
    const items = sortNewsPosts(allNewsPosts);
    const pageCount = getNewsPageCount(items.length);
    newsPage = Math.min(Math.max(1, newsPage), pageCount);
    const start = (newsPage - 1) * NEWS_PAGE_SIZE;
    const pageItems = items.slice(start, start + NEWS_PAGE_SIZE);

    renderNewsInto("news-list", pageItems);
    renderNewsPagination(items.length, newsPage);
    renderNewsInto("home-news-list", items, 4);
  }

  function renderNewsList(posts) {
    const next = sortNewsPosts(Array.isArray(posts) ? posts : []);
    const fingerprint = postsFingerprint(next);
    const prevFingerprint = postsFingerprint(allNewsPosts);
    allNewsPosts = next;
    if (fingerprint !== prevFingerprint) {
      newsPage = 1;
    }
    renderNewsListPage();
  }

  function goToNewsPage(page) {
    const pageCount = getNewsPageCount(allNewsPosts.length);
    const next = Math.min(Math.max(1, Number(page) || 1), pageCount);
    if (next === newsPage) return;
    newsPage = next;
    renderNewsListPage();
    document.getElementById("panel-news")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.getElementById("news-pagination")?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const btn = target.closest("[data-news-page]");
    if (!(btn instanceof HTMLElement) || btn.hasAttribute("disabled")) return;
    goToNewsPage(btn.getAttribute("data-news-page"));
  });

  function postsFingerprint(posts) {
    return sortNewsPosts(Array.isArray(posts) ? posts : [])
      .map((post) => `${post.id}|${post.date}|${post.title}|${post.body}`)
      .join("\n");
  }

  function readNewsCache(cacheKey) {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.posts) || !parsed.posts.length) return null;
      return parsed.posts;
    } catch {
      return null;
    }
  }

  function writeNewsCache(cacheKey, posts) {
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ savedAt: Date.now(), posts: sortNewsPosts(posts) })
      );
    } catch {
      // private mode / pełny storage — ignoruj
    }
  }

  async function fetchJsonWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        cache: "no-cache",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function loadNewsPosts() {
    const list = document.getElementById("news-list");
    const homeList = document.getElementById("home-news-list");
    if (!list && !homeList) return;

    const newsConfig = window.NEWS_CONFIG || {};
    const scriptUrl = String(newsConfig.scriptUrl || "").trim();
    const cacheKey = "spolka-wodna-news-cache-v1";
    const remoteTimeoutMs = Number(newsConfig.timeoutMs) || 2500;

    let shownFingerprint = "";

    function show(posts) {
      const next = Array.isArray(posts) ? posts : [];
      const fingerprint = postsFingerprint(next);
      if (fingerprint === shownFingerprint) return;
      shownFingerprint = fingerprint;
      renderNewsList(next);
      if (list) list.removeAttribute("aria-busy");
      if (homeList) homeList.removeAttribute("aria-busy");
    }

    function showNewsError() {
      const html =
        '<li class="news-item news-empty">Nie udało się wczytać aktualności.</li>';
      if (list) {
        list.innerHTML = html;
        list.removeAttribute("aria-busy");
      }
      if (homeList) {
        homeList.innerHTML = html;
        homeList.removeAttribute("aria-busy");
      }
    }

    const cached = readNewsCache(cacheKey);
    if (cached) show(cached);

    // Lokalny plik i chmura równolegle — UI nie czeka na wolne Apps Script.
    const localPromise = fetchJsonWithTimeout("data/news.json", 4000)
      .then((data) => (Array.isArray(data?.posts) ? data.posts : []))
      .catch(() => []);

    const remotePromise = scriptUrl
      ? fetchJsonWithTimeout(scriptUrl, remoteTimeoutMs)
          .then((result) =>
            result?.success && Array.isArray(result.posts) && result.posts.length
              ? result.posts
              : null
          )
          .catch(() => null)
      : Promise.resolve(null);

    if (!cached) {
      const localPosts = await localPromise;
      if (localPosts.length) show(localPosts);
    }

    const remotePosts = await remotePromise;
    if (remotePosts?.length) {
      writeNewsCache(cacheKey, remotePosts);
      show(remotePosts);
      return;
    }

    if (!shownFingerprint) {
      const localPosts = await localPromise;
      if (localPosts.length) show(localPosts);
      else showNewsError();
    }
  }

  loadNewsPosts();
})();
