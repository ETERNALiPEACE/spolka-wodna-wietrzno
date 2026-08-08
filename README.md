# Spółka Wodna Wietrzno

Oficjalna strona Spółki Wodnej Wodociągu Wiejskiego Wietrzno – Łęki Dukielskie.

## Pliki

- `index.html` — struktura strony (zakładki)
- `styles.css` — wygląd
- `script.js` — nawigacja zakładek i formularz awarii
- `config.js` — konfiguracja e-mail (EmailJS)
- `dokumenty/` — statut PDF
- `formularze/` — formularze PDF

## Uruchomienie

Otwórz `index.html` w przeglądarce lub serwuj katalog lokalnie, np.:

```bash
python3 -m http.server 8080
```

## Formularz awarii

Uzupełnij dane EmailJS w `config.js`, aby zgłoszenia szły automatycznie na `leogamepl@gmail.com`.
Bez konfiguracji formularz otwiera klienta poczty (`mailto`).
