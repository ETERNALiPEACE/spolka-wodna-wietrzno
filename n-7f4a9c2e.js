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
  const storageHint = document.getElementById("storage-hint");
  const reloadBtn = document.getElementById("reload-posts-btn");
  const resetBtn = document.getElementById("reset-post-btn");

  const fieldId = document.getElementById("post-id");
  const fieldDate = document.getElementById("post-date");
  const fieldTitle = document.getElementById("post-title");
  const fieldBody = document.getElementById("post-body");

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

  async function apiRequest(payload) {
    if (!scriptUrl) {
      throw new Error(
        "Brak NEWS_CONFIG.scriptUrl. Wdróż apps-script/News.gs i wklej adres /exec do config.js."
      );
    }
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...payload, password: sessionPassword }),
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
          <p>${escapeHtml(post.body)}</p>
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
    fieldBody.value = "";
    editorTitle.textContent = "Nowy post";
  }

  function fillForm(post) {
    fieldId.value = post.id;
    fieldDate.value = post.date;
    fieldTitle.value = post.title;
    fieldBody.value = post.body;
    editorTitle.textContent = "Edycja posta";
  }

  function updateStorageHint() {
    if (!storageHint) return;
    storageHint.textContent =
      "Hasło jest sprawdzane po stronie Google Apps Script (poza GitHubem). Posty zapisują się online i od razu widać je na stronie.";
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
    const password = String(new FormData(loginForm).get("password") || "");

    if (!scriptUrl) {
      setStatus(
        loginStatus,
        "Panel wymaga wdrożonego skryptu News.gs. Hasła nie trzymamy już w GitHubie — ustaw je tylko w Apps Script i wklej scriptUrl do config.js.",
        "is-error"
      );
      return;
    }

    if (!password) {
      setStatus(loginStatus, "Podaj hasło.", "is-error");
      return;
    }

    sessionPassword = password;
    setStatus(loginStatus, "Sprawdzanie hasła…");

    try {
      await apiRequest({ action: "login" });
      loginPanel.hidden = true;
      editorPanel.hidden = false;
      updateStorageHint();
      resetForm();
      await refresh();
      setStatus(loginStatus, "", null);
    } catch (error) {
      sessionPassword = "";
      setStatus(loginStatus, error.message || "Nieprawidłowe hasło.", "is-error");
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
