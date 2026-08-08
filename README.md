# Spółka Wodna Wietrzno

Oficjalna strona Spółki Wodnej Wodociągu Wiejskiego Wietrzno – Łęki Dukielskie.

## Pliki

**Strona publiczna**
- `index.html` — struktura strony (zakładki)
- `styles.css` — wygląd
- `script.js` — nawigacja, formularz awarii, aktualności
- `config.js` — URL-e Apps Script (mail + aktualności)
- `data/news.json` — lokalna lista aktualności (używana, gdy chmura jest pusta)
- `robots.txt` — blokada indeksowania panelu admina

**Panel aktualności (opcjonalny)**
- `n-7f4a9c2e.html` / `.js` / `.css` — ukryty panel edycji
- `apps-script/News.gs` — szablon backendu (wdrażasz w Google Apps Script, nie jest serwowany ze strony)

**Placeholdery (brak PDF w repo)**
- `dokumenty/` — oczekiwany plik: `statut.pdf` (link w Informacjach)
- `formularze/` — oczekiwany plik: `Formularz-wniosku-o-wydanie-warunkow-przylaczenia.pdf`

## Aktualności — skąd się biorą

1. Jeśli `NEWS_CONFIG.scriptUrl` zwraca **niepustą** listę postów → te są pokazywane.
2. W przeciwnym razie (pusta chmura / błąd) → `data/news.json`.

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
