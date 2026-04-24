# Esercizi — asset locali

Per ogni esercizio nel database (tabella `exercises`), il campo `gif_url` punta a un file qui dentro, organizzato per muscle_group:

```
public/exercises/
├── chest/
│   ├── bench_press.gif
│   ├── push_up.gif
│   └── ...
├── back/
│   └── ...
└── ...
```

Per aggiungere immagini reali:
1. Scarica GIF (preferito) o PNG dell'esercizio
2. Rinomina con lo slug ID dell'esercizio (es. `bench_press.gif`)
3. Mettilo nella cartella del muscle_group corretto

Se manca un file, l'app mostra `placeholder.svg` automaticamente.
