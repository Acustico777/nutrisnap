# NutriSnap

App web AI per il tracciamento delle calorie. Scatta una foto al tuo pasto e NutriSnap analizza automaticamente gli alimenti e i macronutrienti usando GPT-4o Vision.

---

## Setup locale

### 1. Installa le dipendenze

```bash
npm install
```

### 2. Crea il file `.env.local`

Copia il file di esempio e compila i valori:

```bash
cp .env.example .env.local
```

Contenuto di `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
ADMIN_EMAILS=
```

### 3. Setup Supabase

1. Vai su [supabase.com](https://supabase.com) e crea un nuovo progetto.
2. Nel pannello di controllo, apri **SQL Editor**.
3. Copia il contenuto di `supabase/schema.sql` e incollalo nell'editor, poi clicca **Run**.
4. Copia l'URL del progetto e le chiavi API dalla sezione **Settings → API**.

### 4. Avvia il server di sviluppo

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

---

## Come ottenere le chiavi

### Supabase URL e chiavi API

1. Vai su [app.supabase.com](https://app.supabase.com)
2. Seleziona il tuo progetto
3. Vai su **Settings → API**
4. Copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (tienila segreta!)

### OpenAI API Key

1. Vai su [platform.openai.com](https://platform.openai.com)
2. Crea o accedi al tuo account
3. Vai su **API Keys → Create new secret key**
4. Copia la chiave → `OPENAI_API_KEY`

---

## Deploy su Vercel

1. **Push su GitHub**: carica il progetto su un repository GitHub (pubblico o privato)
2. **Connetti su Vercel**: vai su [vercel.com](https://vercel.com), crea un account e clicca **Add New Project → Import Git Repository**
3. **Aggiungi le variabili d'ambiente**: nella sezione **Environment Variables** del progetto Vercel, aggiungi tutte le variabili presenti nel tuo `.env.local`
4. **Deploy**: clicca **Deploy** e attendi. Vercel rileva automaticamente Next.js.

---

## Come generare codici invito per gli amici

Dopo il primo accesso con il tuo account admin (`giulianodemail@gmail.com`):

1. Vai su **Impostazioni** (icona ingranaggio in basso)
2. Nella sezione **Codici invito** (visibile solo agli admin), clicca **Genera codice invito**
3. Copia il codice generato (8 caratteri) e condividilo con il tuo amico
4. Il tuo amico potrà usarlo durante la registrazione su `/signup`

I codici scadono dopo 30 giorni e possono essere utilizzati una sola volta.

---

## Stack tecnico

- **Next.js 14** App Router + TypeScript
- **Tailwind CSS** + shadcn/ui components
- **Framer Motion** per le animazioni
- **Recharts** per i grafici
- **Supabase** per auth, database e storage foto
- **OpenAI GPT-4o Vision** per l'analisi dei pasti
