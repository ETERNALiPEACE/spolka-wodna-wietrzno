/**
 * Skrypt Google Apps Script do przechowywania aktualności.
 *
 * 1. Wejdź na https://script.google.com/ → Nowy projekt
 * 2. Wklej ten kod i zapisz
 * 3. Wdróż → Nowa wdrożenie → Aplikacja internetowa
 *    - Wykonuje jako: Ja
 *    - Kto ma dostęp: Każdy
 * 4. Skopiuj URL zakończony na /exec do config.js → NEWS_CONFIG.scriptUrl
 * 5. Ustaw poniżej własne hasło (to samo, którego używasz w panelu redakcji)
 */

var ADMIN_PASSWORD = "WSTAW_WLASNE_HASLO";
var PROPERTY_KEY = "NEWS_POSTS";

function doGet() {
  return jsonOutput({ success: true, posts: getPosts() });
}

function doPost(e) {
  try {
    var data = JSON.parse((e.postData && e.postData.contents) || "{}");
    if (String(data.password || "") !== ADMIN_PASSWORD) {
      return jsonOutput({ success: false, message: "Nieprawidłowe hasło." });
    }

    var action = String(data.action || "");
    var posts = getPosts();

    if (action === "list") {
      return jsonOutput({ success: true, posts: posts });
    }

    if (action === "add") {
      var post = normalizePost(data.post, true);
      if (!post) {
        return jsonOutput({ success: false, message: "Uzupełnij datę, tytuł i treść." });
      }
      posts.unshift(post);
      savePosts(posts);
      return jsonOutput({ success: true, posts: posts, post: post });
    }

    if (action === "update") {
      var updated = normalizePost(data.post, false);
      if (!updated || !updated.id) {
        return jsonOutput({ success: false, message: "Brak danych posta do aktualizacji." });
      }
      var found = false;
      posts = posts.map(function (item) {
        if (item.id === updated.id) {
          found = true;
          return updated;
        }
        return item;
      });
      if (!found) {
        return jsonOutput({ success: false, message: "Nie znaleziono posta." });
      }
      savePosts(posts);
      return jsonOutput({ success: true, posts: posts });
    }

    if (action === "delete") {
      var id = String((data.post && data.post.id) || data.id || "");
      if (!id) {
        return jsonOutput({ success: false, message: "Brak identyfikatora posta." });
      }
      posts = posts.filter(function (item) {
        return item.id !== id;
      });
      savePosts(posts);
      return jsonOutput({ success: true, posts: posts });
    }

    if (action === "replace") {
      var incoming = Array.isArray(data.posts) ? data.posts : [];
      var cleaned = [];
      for (var i = 0; i < incoming.length; i += 1) {
        var item = normalizePost(incoming[i], false);
        if (item) cleaned.push(item);
      }
      cleaned.sort(comparePosts);
      savePosts(cleaned);
      return jsonOutput({ success: true, posts: cleaned });
    }

    return jsonOutput({ success: false, message: "Nieznana akcja." });
  } catch (err) {
    return jsonOutput({ success: false, message: String(err) });
  }
}

function getPosts() {
  var raw = PropertiesService.getScriptProperties().getProperty(PROPERTY_KEY);
  if (!raw) return [];
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function savePosts(posts) {
  PropertiesService.getScriptProperties().setProperty(
    PROPERTY_KEY,
    JSON.stringify(posts)
  );
}

function normalizePost(input, createId) {
  if (!input || typeof input !== "object") return null;
  var date = String(input.date || "").trim();
  var title = String(input.title || "").trim();
  var body = String(input.body || "").trim();
  if (!date || !title || !body) return null;

  var id = String(input.id || "").trim();
  if (!id && createId) {
    id = Utilities.getUuid();
  }
  if (!id) return null;

  return {
    id: id,
    date: date,
    title: title,
    body: body,
  };
}

function comparePosts(a, b) {
  if (a.date === b.date) return String(b.id).localeCompare(String(a.id));
  return a.date < b.date ? 1 : -1;
}

function jsonOutput(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
