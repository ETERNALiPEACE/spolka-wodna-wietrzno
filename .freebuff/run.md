# Spółka Wodna – strona statyczna

## Jak uruchomić podgląd

Projekt to statyczna strona HTML (brak package.json, buildu ani zależności). **Nie używaj trybu `htmlPath`** — lokalny serwer podglądu nie obsługuje wersjonowanych zasobów (`styles.css?v=109`, `script.js?v=87` → 404, strona renderuje się bez stylów).

Uruchom serwer HTTP z katalogu projektu:

```
python -m http.server 8901 --bind 127.0.0.1
```

Następnie zarejestruj podgląd na `http://127.0.0.1:8901/index.html` (karta Formularze: `#forms`).

## Artefakty

Brak artefaktów do odtworzenia — projekt nie wymaga instalacji ani kopiowania plików. Styling zależy od wersjonowanych plików `styles.css?v=N`, `script.js?v=N`, `config.js?v=N` — po edycji podbij wersję w `index.html`, żeby przeglądarki nie używały cache.
