(() => {
  const newsConfig = window.NEWS_CONFIG || {};
  const scriptUrl = String(newsConfig.scriptUrl || "").trim();

  const loginPanel = document.getElementById("login-panel");
  const editorPanel = document.getElementById("editor-panel");
  const adminHeader = document.querySelector(".admin-header");
  const loginForm = document.getElementById("login-form");
  const loginStatus = document.getElementById("login-status");
  const loginLoader = document.getElementById("login-loader");
  const loginSubmitBtn = loginForm?.querySelector('button[type="submit"]');
  const postForm = document.getElementById("post-form");
  const editorStatus = document.getElementById("editor-status");
  const editorTitle = document.getElementById("editor-title");
  const postsList = document.getElementById("admin-posts");
  const postsPagination = document.getElementById("admin-posts-pagination");
  const reloadBtn = document.getElementById("reload-posts-btn");
  const resetBtn = document.getElementById("reset-post-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const passwordToggle = document.getElementById("password-toggle");
  const passwordInput = document.getElementById("admin-password");

  const fieldId = document.getElementById("post-id");
  const fieldDate = document.getElementById("post-date");
  const fieldTitle = document.getElementById("post-title");
  const fieldBody = document.getElementById("post-body");
  const bodyEditor = document.getElementById("post-body-editor");
  const formatToolbar = document.querySelector(".news-format-toolbar");

  let sessionLogin = "";
  let sessionPassword = "";
  let posts = [];
  const ADMIN_PAGE_SIZE = 4;
  let adminPage = 1;

  function setStatus(el, message, type) {
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || "";
    el.classList.remove("is-ok", "is-error");
    if (type) el.classList.add(type);
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

  function sortPosts(items) {
    return [...items].sort((a, b) => {
      if (a.date === b.date) return String(b.id).localeCompare(String(a.id));
      return a.date < b.date ? 1 : -1;
    });
  }

  function createId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `post-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

  function extractSafeAlign(el) {
    if (!(el instanceof HTMLElement)) return "";
    const alignValues = ["left", "center", "right", "justify"];
    for (const value of alignValues) {
      if (el.classList.contains(`news-align-${value}`)) return value;
    }
    const attrAlign = String(el.getAttribute("align") || "").trim().toLowerCase();
    if (alignValues.includes(attrAlign)) return attrAlign;
    const styleAlign = String(el.style?.textAlign || "").trim().toLowerCase();
    return alignValues.includes(styleAlign) ? styleAlign : "";
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
          const align = extractSafeAlign(node);
          if (align) {
            const block = document.createElement("p");
            block.className = `news-align-${align}`;
            while (node.firstChild) block.appendChild(node.firstChild);
            node.replaceWith(block);
            clean(block);
            return;
          }
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

  function renderNewsBodyHtml(raw) {
    const value = String(raw || "");
    if (!value) return "";
    if (!hasHtmlTags(value)) {
      return escapeHtml(value).replaceAll("\n", "<br>");
    }
    return sanitizeNewsHtml(value);
  }

  function plainTextFromHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = String(html || "");
    return (div.textContent || "").replace(/\u00a0/g, " ").trim();
  }

  function syncHiddenBody() {
    if (!fieldBody || !bodyEditor) return;
    fieldBody.value = sanitizeNewsHtml(bodyEditor.innerHTML);
  }

  function setEditorBody(raw) {
    if (!bodyEditor || !fieldBody) return;
    const value = String(raw || "");
    if (!value) {
      bodyEditor.innerHTML = "";
      fieldBody.value = "";
      return;
    }
    if (!hasHtmlTags(value)) {
      bodyEditor.innerHTML = escapeHtml(value).replaceAll("\n", "<br>");
    } else {
      bodyEditor.innerHTML = sanitizeNewsHtml(value);
    }
    fieldBody.value = sanitizeNewsHtml(bodyEditor.innerHTML);
  }

  function wrapSelection(className) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
    if (!bodyEditor.contains(selection.anchorNode)) return false;

    try {
      const range = selection.getRangeAt(0);
      const span = document.createElement("span");
      span.className = className;
      span.appendChild(range.extractContents());
      // Usuń zagnieżdżone stare klasy rozmiaru.
      span.querySelectorAll("[class*='news-text-']").forEach((nested) => {
        const sizeClass = extractSafeSizeClass(nested);
        if (!sizeClass) return;
        while (nested.firstChild) nested.parentNode.insertBefore(nested.firstChild, nested);
        nested.remove();
      });
      range.insertNode(span);
      selection.removeAllRanges();
      const next = document.createRange();
      next.selectNodeContents(span);
      selection.addRange(next);
      savedEditorRange = next.cloneRange();
      return true;
    } catch {
      return false;
    }
  }

  function unwrapFontSizeFromSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
    if (!bodyEditor.contains(selection.anchorNode)) return false;

    let node = selection.anchorNode;
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const sized = node instanceof HTMLElement
      ? node.closest("[class*='news-text-']")
      : null;
    if (!(sized instanceof HTMLElement) || !bodyEditor.contains(sized)) return false;

    const parent = sized.parentNode;
    while (sized.firstChild) parent.insertBefore(sized.firstChild, sized);
    sized.remove();
    return true;
  }

  function getFontSizeAtSelection() {
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode || !bodyEditor.contains(selection.anchorNode)) {
      return 16;
    }
    let node = selection.anchorNode;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    if (!(node instanceof HTMLElement)) return 16;
    const sized = node.closest("[class*='news-text-']");
    const sizeClass = sized ? extractSafeSizeClass(sized) : "";
    const match = sizeClass.match(/news-text-(\d+)/);
    return match ? Number(match[1]) : 16;
  }

  function syncFontSizeSelect(size) {
    if (!fontSizeSelect) return;
    const value = String(size || 16);
    if ([...fontSizeSelect.options].some((opt) => opt.value === value)) {
      fontSizeSelect.value = value;
    } else {
      fontSizeSelect.value = "16";
    }
    if (fontSizeDisplay) {
      fontSizeDisplay.textContent = fontSizeSelect.value;
    }
  }

  const FONT_SIZES = [12, 14, 16, 18, 20, 24];

  function applyFontSize(sizeValue) {
    if (!bodyEditor) return;
    restoreEditorSelection();
    bodyEditor.focus();
    const size = Number(sizeValue) || 16;

    if (size === 16) {
      unwrapFontSizeFromSelection();
    } else {
      wrapSelection(`news-text-${size}`);
    }

    syncHiddenBody();
    syncFontSizeSelect(size);
  }

  function stepFontSize(delta) {
    const current = Number(fontSizeSelect?.value) || 16;
    let idx = FONT_SIZES.indexOf(current);
    if (idx < 0) idx = FONT_SIZES.indexOf(16);
    const nextIdx = Math.min(FONT_SIZES.length - 1, Math.max(0, idx + Number(delta || 0)));
    applyFontSize(FONT_SIZES[nextIdx]);
  }

  let savedEditorRange = null;

  function saveEditorSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    if (!bodyEditor.contains(selection.anchorNode)) return;
    savedEditorRange = selection.getRangeAt(0).cloneRange();
  }

  function restoreEditorSelection() {
    if (!savedEditorRange || !bodyEditor) return false;
    bodyEditor.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedEditorRange);
    return true;
  }

  function applyTextColor(colorValue) {
    const color = normalizeColor(colorValue);
    if (!color || !bodyEditor) return;
    restoreEditorSelection();
    bodyEditor.focus();
    document.execCommand("foreColor", false, color);
    syncHiddenBody();
  }

  function applyFormat(command) {
    if (!bodyEditor) return;
    bodyEditor.focus();

    if (command === "bold") {
      document.execCommand("bold", false);
    } else if (command === "italic") {
      document.execCommand("italic", false);
    } else if (command === "underline") {
      document.execCommand("underline", false);
    } else if (
      command === "align-left" ||
      command === "align-center" ||
      command === "align-right" ||
      command === "justify"
    ) {
      const execMap = {
        "align-left": "justifyLeft",
        "align-center": "justifyCenter",
        "align-right": "justifyRight",
        justify: "justifyFull",
      };
      document.execCommand(execMap[command], false);
    } else if (command === "clear") {
      document.execCommand("removeFormat", false);
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && bodyEditor.contains(selection.anchorNode)) {
        const text = selection.toString();
        document.execCommand("insertText", false, text);
      }
      syncFontSizeSelect(16);
    }

    syncHiddenBody();
  }

  const fontSizeSelect = document.getElementById("news-font-size");
  const fontSizeDisplay = document.getElementById("news-font-size-display");
  const colorInput = document.getElementById("news-text-color");
  const colorSwatch = document.getElementById("news-text-color-swatch");

  function syncColorSwatch(colorValue) {
    if (!colorSwatch) return;
    const color = normalizeColor(colorValue) || "#1a4a7a";
    colorSwatch.style.background = color;
  }

  syncColorSwatch(colorInput?.value || "#1a4a7a");
  syncFontSizeSelect(16);

  formatToolbar?.addEventListener("mousedown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const formatBtn = target.closest("[data-format]");
    const sizeStepBtn = target.closest("[data-size-step]");
    const colorWrap = target.closest(".news-format-color-wrap");
    const sizeSelect = target.closest(".news-format-size-select");
    if (!formatBtn && !sizeStepBtn && !colorWrap && !sizeSelect) return;
    saveEditorSelection();
    // Format/step buttons: block focus steal. Color/select: leave native behavior.
    if (formatBtn || sizeStepBtn) event.preventDefault();
  });

  formatToolbar?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const sizeStepBtn = target.closest("[data-size-step]");
    if (sizeStepBtn) {
      stepFontSize(sizeStepBtn.getAttribute("data-size-step"));
      return;
    }

    const btn = target.closest("[data-format]");
    if (!btn) return;
    applyFormat(btn.getAttribute("data-format"));
  });

  fontSizeSelect?.addEventListener("mousedown", () => {
    saveEditorSelection();
  });

  fontSizeSelect?.addEventListener("change", () => {
    applyFontSize(fontSizeSelect.value);
  });

  colorInput?.addEventListener("input", () => {
    syncColorSwatch(colorInput.value);
    applyTextColor(colorInput.value);
  });

  colorInput?.addEventListener("change", () => {
    syncColorSwatch(colorInput.value);
    applyTextColor(colorInput.value);
  });

  bodyEditor?.addEventListener("mouseup", () => {
    syncFontSizeSelect(getFontSizeAtSelection());
  });

  bodyEditor?.addEventListener("keyup", () => {
    syncFontSizeSelect(getFontSizeAtSelection());
  });

  bodyEditor?.addEventListener("input", () => {
    if (!fieldBody || !bodyEditor) return;
    fieldBody.value = sanitizeNewsHtml(bodyEditor.innerHTML);
  });

  bodyEditor?.addEventListener("paste", (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") || "";
    document.execCommand("insertText", false, text);
  });

  async function apiRequest(payload) {
    if (!scriptUrl) {
      throw new Error(
        "Brak NEWS_CONFIG.scriptUrl. Wdróż apps-script/News.gs i wklej adres /exec do config.js."
      );
    }
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        ...payload,
        login: sessionLogin,
        password: sessionPassword,
      }),
    });
    const result = await response.json();
    if (!result?.success) {
      throw new Error(result?.message || "Operacja nie powiodła się.");
    }
    return result;
  }

  function syncPublicCache() {
    try {
      localStorage.setItem(
        "spolka-wodna-news-cache-v1",
        JSON.stringify({ savedAt: Date.now(), posts })
      );
    } catch {
      // ignore
    }
  }

  async function loadPosts() {
    const result = await apiRequest({ action: "list" });
    posts = sortPosts(result.posts || []);
    syncPublicCache();
    return posts;
  }

  function getAdminPageCount(total) {
    return Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  }

  function renderAdminPagination(total, page) {
    if (!postsPagination) return;

    const pageCount = getAdminPageCount(total);
    if (total <= ADMIN_PAGE_SIZE) {
      postsPagination.hidden = true;
      postsPagination.innerHTML = "";
      return;
    }

    adminPage = Math.min(Math.max(1, page), pageCount);
    postsPagination.hidden = false;

    const buttons = [];
    buttons.push(
      `<button type="button" class="news-page-btn" data-admin-page="${adminPage - 1}" ${
        adminPage <= 1 ? "disabled" : ""
      } aria-label="Poprzednia strona">Poprzednia</button>`
    );

    for (let i = 1; i <= pageCount; i += 1) {
      const active = i === adminPage;
      buttons.push(
        `<button type="button" class="news-page-btn${active ? " is-active" : ""}" data-admin-page="${i}" ${
          active ? 'aria-current="page"' : ""
        }>${i}</button>`
      );
    }

    buttons.push(
      `<button type="button" class="news-page-btn" data-admin-page="${adminPage + 1}" ${
        adminPage >= pageCount ? "disabled" : ""
      } aria-label="Następna strona">Następna</button>`
    );

    postsPagination.innerHTML = `
      <p class="news-page-status">Strona ${adminPage} z ${pageCount}</p>
      <div class="news-page-controls">${buttons.join("")}</div>
    `;
  }

  function renderPosts() {
    if (!postsList) return;
    if (!posts.length) {
      postsList.innerHTML = '<li class="admin-empty">Brak postów. Dodaj pierwszy komunikat.</li>';
      renderAdminPagination(0, 1);
      return;
    }

    const pageCount = getAdminPageCount(posts.length);
    adminPage = Math.min(Math.max(1, adminPage), pageCount);
    const start = (adminPage - 1) * ADMIN_PAGE_SIZE;
    const pageItems = posts.slice(start, start + ADMIN_PAGE_SIZE);

    postsList.innerHTML = pageItems
      .map(
        (post) => `
      <li class="admin-post" data-id="${escapeHtml(post.id)}">
        <div>
          <time datetime="${escapeHtml(post.date)}">${escapeHtml(formatNewsDate(post.date))}</time>
          <h3>${escapeHtml(post.title)}</h3>
          <div class="admin-post-body">${renderNewsBodyHtml(post.body)}</div>
        </div>
        <div class="admin-post-actions">
          <button type="button" class="btn btn-ghost" data-edit="${escapeHtml(post.id)}">Edytuj</button>
          <button type="button" class="btn btn-ghost" data-delete="${escapeHtml(post.id)}">Usuń</button>
        </div>
      </li>`
      )
      .join("");

    renderAdminPagination(posts.length, adminPage);
  }

  function goToAdminPage(rawPage) {
    const next = Number(rawPage);
    if (!Number.isFinite(next)) return;
    adminPage = next;
    renderPosts();
    postsList?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function resetForm() {
    fieldId.value = "";
    fieldDate.value = new Date().toISOString().slice(0, 10);
    fieldTitle.value = "";
    setEditorBody("");
    editorTitle.textContent = "Nowy post";
  }

  function fillForm(post) {
    fieldId.value = post.id;
    fieldDate.value = post.date;
    fieldTitle.value = post.title;
    setEditorBody(post.body);
    editorTitle.textContent = "Edycja posta";
  }

  async function refresh() {
    setStatus(editorStatus, "Ładowanie postów…");
    try {
      await loadPosts();
      renderPosts();
      setStatus(editorStatus, "", null);
    } catch (error) {
      setStatus(editorStatus, error.message || "Nie udało się wczytać postów.", "is-error");
    }
  }

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const login = String(formData.get("login") || "").trim();
    const password = String(formData.get("password") || "");

    if (!scriptUrl) {
      setStatus(
        loginStatus,
        "Panel wymaga wdrożonego skryptu News.gs. Ustaw login i hasło w Apps Script oraz scriptUrl w config.js.",
        "is-error"
      );
      return;
    }

    if (!login) {
      setStatus(loginStatus, "Podaj login.", "is-error");
      return;
    }

    if (!password) {
      setStatus(loginStatus, "Podaj hasło.", "is-error");
      return;
    }

    sessionLogin = login;
    sessionPassword = password;
    setStatus(loginStatus, "Logowanie…");
    if (loginLoader) loginLoader.hidden = false;
    if (loginPanel) loginPanel.hidden = true;
    if (adminHeader) adminHeader.hidden = true;
    if (loginSubmitBtn) loginSubmitBtn.disabled = true;

    try {
      await apiRequest({ action: "login" });
      if (loginLoader) loginLoader.hidden = true;
      if (adminHeader) adminHeader.hidden = false;
      if (adminNavTabs) adminNavTabs.hidden = false;
      // Reset tabs to Posts
      navTabs.forEach((t) => t.classList.remove("is-active"));
      navTabs[0]?.classList.add("is-active");
      editorPanel.hidden = false;
      editorPanel.removeAttribute("aria-hidden");
      if (settingsPanel) {
        settingsPanel.hidden = true;
        settingsPanel.setAttribute("aria-hidden", "true");
      }
      resetForm();
      await refresh();
      updateAdminScrollTop();
      setStatus(loginStatus, "", null);
    } catch (error) {
      sessionLogin = "";
      sessionPassword = "";
      if (loginPanel) loginPanel.hidden = false;
      setStatus(loginStatus, error.message || "Nieprawidłowy login lub hasło.", "is-error");
    } finally {
      if (adminHeader) adminHeader.hidden = false;
      if (loginLoader) loginLoader.hidden = true;
      if (loginSubmitBtn) loginSubmitBtn.disabled = false;
    }
  });

  passwordToggle?.addEventListener("click", () => {
    const show = passwordToggle.getAttribute("aria-pressed") !== "true";
    passwordToggle.setAttribute("aria-pressed", String(show));
    passwordToggle.setAttribute("aria-label", show ? "Ukryj hasło" : "Pokaż hasło");
    if (passwordInput) passwordInput.type = show ? "text" : "password";
    passwordInput?.focus();
  });

  logoutBtn?.addEventListener("click", () => {
    sessionLogin = "";
    sessionPassword = "";
    if (editorPanel) {
      editorPanel.hidden = true;
      editorPanel.setAttribute("aria-hidden", "true");
    }
    if (settingsPanel) {
      settingsPanel.hidden = true;
      settingsPanel.setAttribute("aria-hidden", "true");
    }
    if (adminNavTabs) adminNavTabs.hidden = true;
    if (loginPanel) loginPanel.hidden = false;
    loginForm?.reset();
    resetForm();
    setStatus(loginStatus, "", null);
    setStatus(editorStatus, "", null);
    // Reset tabs to Posts
    navTabs.forEach((t) => t.classList.remove("is-active"));
    navTabs[0]?.classList.add("is-active");
  });

  resetBtn?.addEventListener("click", () => {
    resetForm();
    setStatus(editorStatus, "", null);
  });

  reloadBtn?.addEventListener("click", () => {
    refresh();
  });

  postsPagination?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const btn = target.closest("[data-admin-page]");
    if (!(btn instanceof HTMLElement) || btn.hasAttribute("disabled")) return;
    goToAdminPage(btn.getAttribute("data-admin-page"));
  });

  postForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    syncHiddenBody();

    const plain = plainTextFromHtml(fieldBody.value);
    if (!plain) {
      setStatus(editorStatus, "Uzupełnij treść posta.", "is-error");
      bodyEditor?.focus();
      return;
    }

    if (fieldBody.value.length > 4000) {
      setStatus(editorStatus, "Treść jest zbyt długa (max 4000 znaków).", "is-error");
      return;
    }

    if (!postForm.reportValidity()) return;

    const post = {
      id: fieldId.value || createId(),
      date: fieldDate.value.trim(),
      title: fieldTitle.value.trim(),
      body: fieldBody.value.trim(),
    };

    const isEdit = Boolean(fieldId.value);

    try {
      const result = await apiRequest({
        action: isEdit ? "update" : "add",
        post,
      });
      posts = sortPosts(result.posts || []);
      syncPublicCache();
      if (!isEdit) adminPage = 1;
      renderPosts();
      resetForm();
      setStatus(
        editorStatus,
        isEdit ? "Post został zaktualizowany." : "Post został dodany.",
        "is-ok"
      );
    } catch (error) {
      setStatus(editorStatus, error.message || "Nie udało się zapisać posta.", "is-error");
    }
  });

  postsList?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const editId = target.getAttribute("data-edit");
    if (editId) {
      const post = posts.find((item) => item.id === editId);
      if (post) {
        fillForm(post);
        setStatus(editorStatus, "", null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    const deleteId = target.getAttribute("data-delete");
    if (!deleteId) return;
    if (!window.confirm("Usunąć ten post?")) return;

    try {
      const result = await apiRequest({ action: "delete", id: deleteId });
      posts = sortPosts(result.posts || []);
      syncPublicCache();
      renderPosts();
      if (fieldId.value === deleteId) resetForm();
      setStatus(editorStatus, "Post został usunięty.", "is-ok");
    } catch (error) {
      setStatus(editorStatus, error.message || "Nie udało się usunąć posta.", "is-error");
    }
  });

  // Przycisk „wróć na górę" — pływający, pojawia się po przewinięciu,
  // ale tylko po zalogowaniu (nie na ekranie logowania).
  const adminScrollTop = document.getElementById("scroll-top");
  if (adminScrollTop) {
    const SCROLL_TOP_SHOW_AFTER = 280;
    let scrollTopQueued = false;

    function editorVisible() {
      const editor = document.getElementById("editor-panel");
      const settings = document.getElementById("settings-panel");
      return (Boolean(editor) && !editor.hidden) || (Boolean(settings) && !settings.hidden);
    }

    function updateAdminScrollTop() {
      const y = window.scrollY || window.pageYOffset || 0;
      const show = editorVisible() && y > SCROLL_TOP_SHOW_AFTER;
      adminScrollTop.classList.toggle("is-visible", show);
      adminScrollTop.setAttribute("aria-hidden", show ? "false" : "true");
      adminScrollTop.tabIndex = show ? 0 : -1;
    }

    function onAdminScrollOrResize() {
      if (scrollTopQueued) return;
      scrollTopQueued = true;
      requestAnimationFrame(() => {
        scrollTopQueued = false;
        updateAdminScrollTop();
      });
    }

    adminScrollTop.addEventListener("click", () => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, left: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });

    window.addEventListener("scroll", onAdminScrollOrResize, { passive: true });
    window.addEventListener("resize", onAdminScrollOrResize);
    updateAdminScrollTop();
  }

  /* ===== Admin navigation tabs ===== */
  const navTabs = document.querySelectorAll(".admin-nav-tab");
  const adminNavTabs = document.getElementById("admin-nav-tabs");
  const settingsPanel = document.getElementById("settings-panel");

  navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      navTabs.forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      const target = tab.getAttribute("data-tab");
      if (editorPanel) editorPanel.hidden = target !== "posts";
      if (settingsPanel) settingsPanel.hidden = target !== "settings";
    });
  });

  /* ===== Settings: Board & Prices (localStorage) ===== */
  const BOARD_STORAGE_KEY = "spolka-wodna-board-v1";
  const PRICES_STORAGE_KEY = "spolka-wodna-prices-v1";

  const defaultBoard = [
    { role: "Przewodniczący Zarządu", names: ["Mateusz Delimata"] },
    { role: "Członek Zarządu", names: ["Joanna Reczkowska", "Ireneusz Dzdowicz", "Wioletta Bogaczyk", "Leszek Kołacz", "Mieczysław Delimata"] },
  ];

  const defaultPrices = [
    { role: "Woda (za 1m³)", names: ["6,50 PLN (netto) + 8% Vat"] },
    { role: "Abonament miesięczny", names: ["15,00 PLN"] },
  ];

  function loadSettings(key, defaults) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {}
    return JSON.parse(JSON.stringify(defaults));
  }

  function saveSettings(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent("settings-changed", { detail: { key } }));
  }

  function renderBoardEditor(data) {
    const container = document.getElementById("board-editor");
    if (!container) return;
    container.innerHTML = data.map((entry, i) => `
      <div class="settings-row" data-idx="${i}">
        <input class="role-input" type="text" value="${escapeHtml(entry.role)}" placeholder="Rola" aria-label="Rola" />
        <div class="names-inputs">
          ${entry.names.map((n, j) => `<input class="name-input" type="text" value="${escapeHtml(n)}" placeholder="Imię i nazwisko" aria-label="Imię i nazwisko ${j + 1}" />`).join("")}
        </div>
        <button type="button" class="btn-remove" title="Usuń" aria-label="Usuń">×</button>
      </div>
    `).join("");
  }

  function renderPricesEditor(data) {
    const container = document.getElementById("prices-editor");
    if (!container) return;
    container.innerHTML = data.map((entry, i) => `
      <div class="settings-row" data-idx="${i}">
        <input class="role-input" type="text" value="${escapeHtml(entry.role)}" placeholder="Nazwa" aria-label="Nazwa" />
        <div class="names-inputs">
          ${entry.names.map((n, j) => `<input class="name-input" type="text" value="${escapeHtml(n)}" placeholder="Wartość" aria-label="Wartość ${j + 1}" />`).join("")}
        </div>
        <button type="button" class="btn-remove" title="Usuń" aria-label="Usuń">×</button>
      </div>
    `).join("");
  }

  function collectBoardData() {
    const container = document.getElementById("board-editor");
    if (!container) return [];
    return [...container.querySelectorAll(".settings-row")].map((row) => {
      const role = row.querySelector(".role-input")?.value.trim() || "";
      const names = [...row.querySelectorAll(".name-input")].map((inp) => inp.value.trim()).filter(Boolean);
      return { role, names };
    }).filter((e) => e.role || e.names.length > 0);
  }

  function collectPricesData() {
    const container = document.getElementById("prices-editor");
    if (!container) return [];
    return [...container.querySelectorAll(".settings-row")].map((row) => {
      const role = row.querySelector(".role-input")?.value.trim() || "";
      const names = [...row.querySelectorAll(".name-input")].map((inp) => inp.value.trim()).filter(Boolean);
      return { role, names };
    }).filter((e) => e.role || e.names.length > 0);
  }

  // Initial render
  let boardData = loadSettings(BOARD_STORAGE_KEY, defaultBoard);
  let pricesData = loadSettings(PRICES_STORAGE_KEY, defaultPrices);
  renderBoardEditor(boardData);
  renderPricesEditor(pricesData);

  // Add member
  document.getElementById("add-board-member")?.addEventListener("click", () => {
    boardData.push({ role: "Członek Zarządu", names: [""] });
    renderBoardEditor(boardData);
  });

  // Add price entry
  document.getElementById("add-price-entry")?.addEventListener("click", () => {
    pricesData.push({ role: "", names: [""] });
    renderPricesEditor(pricesData);
  });

  // Remove member/price (delegation)
  document.getElementById("board-editor")?.addEventListener("click", (e) => {
    if (!e.target.closest(".btn-remove")) return;
    const row = e.target.closest(".settings-row");
    if (row) {
      boardData = collectBoardData();
      boardData.splice(Number(row.dataset.idx), 1);
      renderBoardEditor(boardData);
    }
  });

  document.getElementById("prices-editor")?.addEventListener("click", (e) => {
    if (!e.target.closest(".btn-remove")) return;
    const row = e.target.closest(".settings-row");
    if (row) {
      pricesData = collectPricesData();
      pricesData.splice(Number(row.dataset.idx), 1);
      renderPricesEditor(pricesData);
    }
  });

  // Save board
  document.getElementById("save-board-btn")?.addEventListener("click", () => {
    boardData = collectBoardData();
    saveSettings(BOARD_STORAGE_KEY, boardData);
    setStatus(document.getElementById("board-status"), "Zarząd został zapisany.", "is-ok");
  });

  // Save prices
  document.getElementById("save-prices-btn")?.addEventListener("click", () => {
    pricesData = collectPricesData();
    saveSettings(PRICES_STORAGE_KEY, pricesData);
    setStatus(document.getElementById("prices-status"), "Cennik został zapisany.", "is-ok");
  });

  // Reset board
  document.getElementById("reset-board-btn")?.addEventListener("click", () => {
    boardData = JSON.parse(JSON.stringify(defaultBoard));
    renderBoardEditor(boardData);
    setStatus(document.getElementById("board-status"), "Przywrócono domyślne dane.", "is-ok");
  });

  // Reset prices
  document.getElementById("reset-prices-btn")?.addEventListener("click", () => {
    pricesData = JSON.parse(JSON.stringify(defaultPrices));
    renderPricesEditor(pricesData);
    setStatus(document.getElementById("prices-status"), "Przywrócono domyślne dane.", "is-ok");
  });

  /* ===== Committee editor ===== */
  const COMMITTEE_STORAGE_KEY = "spolka-wodna-committee-v1";

  const defaultCommittee = [
    { role: "Przewodniczący", names: ["do uzupełnienia"] },
    { role: "Członek", names: ["do uzupełnienia", "do uzupełnienia"] },
  ];

  function renderCommitteeEditor(data) {
    const container = document.getElementById("committee-editor");
    if (!container) return;
    container.innerHTML = data.map((entry, i) => `\r
      <div class="settings-row" data-idx="${i}">\r
        <input class="role-input" type="text" value="${escapeHtml(entry.role)}" placeholder="Rola" aria-label="Rola" />\r
        <div class="names-inputs">\r
          ${entry.names.map((n, j) => `<input class="name-input" type="text" value="${escapeHtml(n)}" placeholder="Imię i nazwisko" aria-label="Imię i nazwisko ${j + 1}" />`).join("")}\r
        </div>\r
        <button type="button" class="btn-remove" title="Usuń" aria-label="Usuń">×</button>\r
      </div>\r
    `).join("");
  }

  function collectCommitteeData() {
    const container = document.getElementById("committee-editor");
    if (!container) return [];
    return [...container.querySelectorAll(".settings-row")].map((row) => {
      const role = row.querySelector(".role-input")?.value.trim() || "";
      const names = [...row.querySelectorAll(".name-input")].map((inp) => inp.value.trim()).filter(Boolean);
      return { role, names };
    }).filter((e) => e.role || e.names.length > 0);
  }

  let committeeData = loadSettings(COMMITTEE_STORAGE_KEY, defaultCommittee);
  renderCommitteeEditor(committeeData);

  document.getElementById("add-committee-member")?.addEventListener("click", () => {
    committeeData.push({ role: "Członek", names: [""] });
    renderCommitteeEditor(committeeData);
  });

  document.getElementById("committee-editor")?.addEventListener("click", (e) => {
    if (!e.target.closest(".btn-remove")) return;
    const row = e.target.closest(".settings-row");
    if (row) {
      committeeData = collectCommitteeData();
      committeeData.splice(Number(row.dataset.idx), 1);
      renderCommitteeEditor(committeeData);
    }
  });

  document.getElementById("save-committee-btn")?.addEventListener("click", () => {
    committeeData = collectCommitteeData();
    saveSettings(COMMITTEE_STORAGE_KEY, committeeData);
    setStatus(document.getElementById("committee-status"), "Komisja została zapisana.", "is-ok");
  });

  document.getElementById("reset-committee-btn")?.addEventListener("click", () => {
    committeeData = JSON.parse(JSON.stringify(defaultCommittee));
    renderCommitteeEditor(committeeData);
    setStatus(document.getElementById("committee-status"), "Przywrócono domyślne dane.", "is-ok");
  });
})();
