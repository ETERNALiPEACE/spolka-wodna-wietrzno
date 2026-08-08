(() => {
  const newsConfig = window.NEWS_CONFIG || {};
  const scriptUrl = String(newsConfig.scriptUrl || "").trim();
  const adminPasswordHash = String(newsConfig.adminPasswordHash || "").toLowerCase();

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

  const LOCAL_KEY = "spolka-wodna-news-posts";

  async function sha256Hex(value) {
    const data = new TextEncoder().encode(String(value));
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

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

  function readLocalPosts() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function writeLocalPosts(items) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  }

  async function apiRequest(payload) {
    if (!scriptUrl) {
      throw new Error("Brak NEWS_CONFIG.scriptUrl");
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

  async function loadPosts() {
    if (scriptUrl) {
      const result = await apiRequest({ action: "list" });
      posts = sortPosts(result.posts || []);
      writeLocalPosts(posts);
      return posts;
    }

    const local = readLocalPosts();
    if (local) {
      posts = sortPosts(local);
      return posts;
    }

    const response = await fetch(`data/news.json?v=${Date.now()}`);
    const data = await response.json();
    posts = sortPosts(data.posts || []);
    writeLocalPosts(posts);
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
    if (scriptUrl) {
      storageHint.textContent =
        "Posty są zapisywane online (Google Apps Script) i od razu pojawiają się na stronie publicznej.";
      return;
    }
    storageHint.innerHTML =
      "Tryb lokalny: posty zapisują się w tej przeglądarce. Aby były widoczne dla wszystkich, wdroż backend aktualności i uzupełnij <code>NEWS_CONFIG.scriptUrl</code> — albo pobierz plik JSON i wgraj go do <code>data/news.json</code>.";
  }

  function downloadNewsJson() {
    const blob = new Blob([JSON.stringify({ posts }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "news.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function ensureDownloadButton() {
    if (scriptUrl || document.getElementById("download-json-btn")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "download-json-btn";
    btn.className = "btn btn-ghost";
    btn.textContent = "Pobierz news.json";
    btn.addEventListener("click", downloadNewsJson);
    document.querySelector(".admin-list-head")?.appendChild(btn);
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
    if (!adminPasswordHash) {
      setStatus(loginStatus, "Brak konfiguracji dostępu.", "is-error");
      return;
    }

    const hash = await sha256Hex(password);
    if (hash !== adminPasswordHash) {
      setStatus(loginStatus, "Nieprawidłowe hasło.", "is-error");
      return;
    }

    sessionPassword = password;
    loginPanel.hidden = true;
    editorPanel.hidden = false;
    updateStorageHint();
    ensureDownloadButton();
    resetForm();
    await refresh();
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
      if (scriptUrl) {
        const result = await apiRequest({
          action: isEdit ? "update" : "add",
          post,
        });
        posts = sortPosts(result.posts || []);
      } else {
        if (isEdit) {
          posts = posts.map((item) => (item.id === post.id ? post : item));
        } else {
          posts = [post, ...posts.filter((item) => item.id !== post.id)];
        }
        posts = sortPosts(posts);
        writeLocalPosts(posts);
      }

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
      if (scriptUrl) {
        const result = await apiRequest({ action: "delete", id: deleteId });
        posts = sortPosts(result.posts || []);
      } else {
        posts = posts.filter((item) => item.id !== deleteId);
        writeLocalPosts(posts);
      }
      renderPosts();
      if (fieldId.value === deleteId) resetForm();
      setStatus(editorStatus, "Post został usunięty.", "is-ok");
    } catch (error) {
      setStatus(editorStatus, error.message || "Nie udało się usunąć posta.", "is-error");
    }
  });

  // Publiczna strona też czyta lokalne posty, gdy brak scriptUrl (ta sama przeglądarka).
  window.NEWS_LOCAL_BRIDGE = {
    key: LOCAL_KEY,
  };
})();
