# Spółka Wodna Wietrzno

Oficjalna strona Spółki Wodnej Wodociągu Wiejskiego Wietrzno – Łęki Dukielskie.

## Pliki

- `index.html` — struktura strony (zakładki)
- `styles.css` — wygląd
- `script.js` — nawigacja, formularz awarii, aktualności
- `config.js` — konfiguracja maila i adresu skryptu aktualności
- `data/news.json` — zapasowa lista aktualności
- `apps-script/News.gs` — backend aktualności (Google Apps Script)
- `dokumenty/` — statut PDF
- `formularze/` — formularze PDF

## Uruchomienie

```bash
python3 -m http.server 8080
```

## Formularz awarii

Wysyłka: `MAIL_CONFIG.scriptUrl` w `config.js`.

## Aktualności i hasło panelu

Hasła **nie trzymaj w GitHubie**. Ustaw je wyłącznie w Google Apps Script (`ADMIN_PASSWORD` w wdrożonym skrypcie).  
Publiczny `config.js` ma tylko `NEWS_CONFIG.scriptUrl`.

Jeśli chcesz, żeby cały kod repozytorium też nie był widoczny dla obcych, ustaw repozytorium jako **prywatne** (GitHub Pages z prywatnego repo może wymagać planu Pro).
