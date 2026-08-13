# Spółka Wodna Wietrzno

Oficjalna strona Spółki Wodnej Wodociągu Wiejskiego Wietrzno – Łęki Dukielskie.

## Pliki

**Strona publiczna**
- `index.html` — struktura strony (zakładki)
- `styles.css` — wygląd
- `script.js` — nawigacja, formularz awarii, aktualności
- `config.js` — URL-e Apps Script (mail + aktualności)
- `assets/logo-spolka-wodna.png` — logo spółki
- `robots.txt` — blokada indeksowania panelu admina

**Panel aktualności (opcjonalny)**
- `n-7f4a9c2e.html` / `.js` / `.css` — ukryty panel edycji
- `apps-script/News.gs` — szablon backendu (wdrażasz w Google Apps Script, nie jest serwowany ze strony)

**Dokumenty**
- `formularze/` — plik: `Wniosek-o-przylaczenie-do-sieci-wodociagowej.pdf`
- `dokumenty/` — oczekiwany plik: `statut.pdf` (link w Informacjach; katalog może być poza repo)

## Aktualności — skąd się biorą

1. Od razu: ostatni zapis z przeglądarki (`localStorage`).
2. W tle: odświeżenie z `NEWS_CONFIG.scriptUrl` (Google Apps Script).
3. Jeśli chmura zwróci posty → podmiana listy + zapis do cache.
4. Timeout chmury: domyślnie 2,5 s (`NEWS_CONFIG.timeoutMs`).

## Uruchomienie

```bash
python3 -m http.server 8080
```

## Formularz awarii

Wysyłka: `MAIL_CONFIG.scriptUrl` w `config.js`.

## Aktualności i logowanie do panelu

Loginu i hasła **nie trzymaj w GitHubie**. Ustaw je wyłącznie w Google Apps Script (`ADMIN_LOGIN` i `ADMIN_PASSWORD` w wdrożonym skrypcie `News.gs`).  
Publiczny `config.js` ma tylko `NEWS_CONFIG.scriptUrl`.

Po zmianie loginu/hasła w Apps Script zrób nowe wdrożenie skryptu.
