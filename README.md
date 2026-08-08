# Spółka Wodna Wietrzno

Oficjalna strona Spółki Wodnej Wodociągu Wiejskiego Wietrzno – Łęki Dukielskie.

## Pliki

- `index.html` — struktura strony (zakładki)
- `styles.css` — wygląd
- `script.js` — nawigacja, formularz awarii, aktualności
- `config.js` — konfiguracja maila i aktualności
- `data/news.json` — domyślna lista aktualności
- `apps-script/News.gs` — backend aktualności (Google Apps Script)
- `dokumenty/` — statut PDF
- `formularze/` — formularze PDF

## Uruchomienie

Otwórz `index.html` w przeglądarce lub serwuj katalog lokalnie, np.:

```bash
python3 -m http.server 8080
```

## Formularz awarii

Wysyłka idzie przez Google Apps Script — adres endpointu jest w `config.js` (`MAIL_CONFIG.scriptUrl`).

## Aktualności

Publiczna lista ładuje się z backendu (`NEWS_CONFIG.scriptUrl`) albo z `data/news.json`.

Panel redakcji jest celowo niepubliczny (osobny, nieoczywisty adres + hasło trzymane jako hash w `config.js`).  
Po wdrożeniu `apps-script/News.gs` wklej URL `/exec` do `NEWS_CONFIG.scriptUrl` i ustaw własne hasło w skrypcie.
