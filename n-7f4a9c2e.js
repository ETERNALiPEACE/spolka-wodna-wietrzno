(() => {
  const newsConfig = window.NEWS_CONFIG || {};
  const scriptUrl = String(newsConfig.scriptUrl || "").trim();

  const loginPanel = document.getElementById("login-panel");
  const editorPanel = document.getElementById("editor-panel");
  const loginForm = document.getElementById("login-form");
  const loginStatus = document.getElementById("login-status");
  const postForm = document.getElementById("post-form");
  const editorStatus = document.getElementById("editor-status");
  const editorTitle = document.getElementById("editor-title");
  const postsList = document.getElementById("admin-posts");
  const reloadBtn = document.getElementById("reload-posts-btn");
  const resetBtn = document.getElementById("reset-post-btn");

  const fieldId = document.getElementById("post-id");
  const fieldDate = document.getElementById("post-date");
  const fieldTitle = document.getElementById("post-title");
  const fieldBody = document.getElementById("post-body");
  const bodyEditor = document.getElementById("post-body-editor");
  const formatToolbar = document.querySelector(".news-format-toolbar");

  let sessionLogin = "";
  let sessionPassword = "";
  let posts = [];

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

        if (tag === "SPAN") {
          const isLg = node.classList.contains("news-text-lg");
          const isSm = node.classList.contains("news-text-sm");
          if (isLg || isSm) {
            const span = document.createElement("span");
            span.className = isLg ? "news-text-lg" : "news-text-sm";
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
      range.insertNode(span);
      selection.removeAllRanges();
      const next = document.createRange();
      next.selectNodeContents(span);
      selection.addRange(next);
      return true;
    } catch {
      return false;
    }
  }

  function applyFormat(command) {
    if (!bodyEditor) return;
    bodyEditor.focus();

    if (command === "bold") {
      document.execCommand("bold", false);
    } else if (command === "italic") {
      document.execCommand("italic", false);
    } else if (command === "larger") {
      wrapSelection("news-text-lg");
    } else if (command === "smaller") {
      wrapSelection("news-text-sm");
    } else if (command === "clear") {
      document.execCommand("removeFormat", false);
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && bodyEditor.contains(selection.anchorNode)) {
        const text = selection.toString();
        document.execCommand("insertText", false, text);
      }
    }

    syncHiddenBody();
  }

  formatToolbar?.addEventListener("mousedown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const btn = target.closest("[data-format]");
    if (!btn) return;
    // Zachowaj zaznaczenie w edytorze.
    event.preventDefault();
  });

  formatToolbar?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const btn = target.closest("[data-format]");
    if (!btn) return;
    applyFormat(btn.getAttribute("data-format"));
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

  function renderPosts() {
    if (!postsList) return;
    if (!posts.length) {
      postsList.innerHTML = '<li class="admin-empty">Brak postów. Dodaj pierwszy komunikat.</li>';
      return;
    }

    postsList.innerHTML = posts
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

    try {
      await apiRequest({ action: "login" });
      loginPanel.hidden = true;
      editorPanel.hidden = false;
      resetForm();
      await refresh();
      setStatus(loginStatus, "", null);
    } catch (error) {
      sessionLogin = "";
      sessionPassword = "";
      setStatus(loginStatus, error.message || "Nieprawidłowy login lub hasło.", "is-error");
    }
  });

  resetBtn?.addEventListener("click", () => {
    resetForm();
    setStatus(editorStatus, "", null);
  });

  reloadBtn?.addEventListener("click", () => {
    refresh();
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
})();
