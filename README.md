# Spółka Wodna Wietrzno

Oficjalna strona Spółki Wodnej Wodociągu Wiejskiego Wietrzno – Łęki Dukielskie.

## Pliki

- `index.html` — struktura strony (zakładki)
- `styles.css` — wygląd
- `script.js` — nawigacja, formularz awarii, aktualności
- `config.js` — konfiguracja maila i aktualności
- `admin.html` — panel dodawania/edycji aktualności
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

1. Wejdź na `admin.html`
2. Zaloguj się hasłem z `NEWS_CONFIG.adminPassword` (domyślnie `wietrzno`)
3. Dodawaj, edytuj i usuwaj posty

### Żeby posty były widoczne dla wszystkich online

1. Wdróż skrypt z `apps-script/News.gs` jako aplikację internetową
2. Wklej URL `/exec` do `NEWS_CONFIG.scriptUrl` w `config.js`
3. Ustaw to samo hasło w skrypcie i w `config.js`

Bez `scriptUrl` działa tryb lokalny (ta sama przeglądarka) oraz przycisk pobierania `news.json` do ręcznego wgrania do `data/news.json`.
