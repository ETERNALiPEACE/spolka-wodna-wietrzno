# Spółka Wodna Wietrzno

Oficjalna strona Spółki Wodnej Wodociągu Wiejskiego Wietrzno – Łęki Dukielskie.

## O projekcie

Strona zawiera informacje o spółce, aktualności, formularze do pobrania, dane kontaktowe i możliwość zgłoszenia awarii online.

## Pliki główne

- `index.html` — struktura strony
- `styles.css` — stylowanie
- `script.js` — logika nawigacji i formularzy
- `config.js` — konfiguracja (linki do Google Apps Script)
- `assets/` — logo i grafiki
- `formularze/` — dokumenty PDF

## Jak uruchomić
Otwórz `https://eternalipeace.github.io/spolka-wodna-wietrzno/` w przeglądarce.

## Funkcjonalności

- **Nawigacja** — 7 sekcji dostępne z menu
- **Aktualności** — pobierane z Google Apps Script
- **Formularz awarii** — zgłaszanie problemów online
- **Responsywny design** — działa na mobile i desktop

## Integracja z Google Apps Script

Aktualności i formularze awarii wysyłane są do Google Apps Script. 
Adresy URL skryptów znajdują się w `config.js`.

Dane loginu i hasła do panelu adminstracyjnego ustawiaj wyłącznie w Google Apps Script, nie w GitHubie.
