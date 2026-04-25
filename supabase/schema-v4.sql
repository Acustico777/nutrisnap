-- NutriSnap schema v4 — IDEMPOTENT additive migration
-- Run on top of schema.sql + schema-v2.sql + schema-v3.sql
-- Execute in Supabase SQL editor

-- ─── A) Estendere profiles ────────────────────────────────────────────────────

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lean_mass_kg         DECIMAL(5,2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fat_mass_kg          DECIMAL(5,2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS body_fat_percent     DECIMAL(4,2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Segna come onboarded gli utenti esistenti che hanno già i dati bio compilati
-- (previene redirect loop per utenti già configurati prima di v4)
UPDATE public.profiles
SET onboarding_completed = TRUE
WHERE onboarding_completed = FALSE
  AND weight_kg IS NOT NULL
  AND height_cm IS NOT NULL
  AND age IS NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS path_preference      TEXT CHECK (path_preference IN ('nutrition','workout','both'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_weight_kg     DECIMAL(5,2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS goal_target_date     DATE;

-- ─── B) Nuove tabelle ─────────────────────────────────────────────────────────

-- weight_logs
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weight_kg        DECIMAL(5,2) NOT NULL,
  lean_mass_kg     DECIMAL(5,2),
  fat_mass_kg      DECIMAL(5,2),
  body_fat_percent DECIMAL(4,2),
  notes            TEXT,
  logged_at        TIMESTAMPTZ DEFAULT now(),
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS weight_logs_user_logged_at_idx
  ON public.weight_logs (user_id, logged_at DESC);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users select own weight_logs"  ON public.weight_logs;
DROP POLICY IF EXISTS "users insert own weight_logs"  ON public.weight_logs;
DROP POLICY IF EXISTS "users update own weight_logs"  ON public.weight_logs;
DROP POLICY IF EXISTS "users delete own weight_logs"  ON public.weight_logs;

CREATE POLICY "users select own weight_logs" ON public.weight_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own weight_logs" ON public.weight_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own weight_logs" ON public.weight_logs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users delete own weight_logs" ON public.weight_logs
  FOR DELETE USING (auth.uid() = user_id);

-- workout_sessions
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id      UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  day_label    TEXT,
  started_at   TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workout_sessions_user_started_at_idx
  ON public.workout_sessions (user_id, started_at DESC);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users select own workout_sessions"  ON public.workout_sessions;
DROP POLICY IF EXISTS "users insert own workout_sessions"  ON public.workout_sessions;
DROP POLICY IF EXISTS "users update own workout_sessions"  ON public.workout_sessions;
DROP POLICY IF EXISTS "users delete own workout_sessions"  ON public.workout_sessions;

CREATE POLICY "users select own workout_sessions" ON public.workout_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own workout_sessions" ON public.workout_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own workout_sessions" ON public.workout_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users delete own workout_sessions" ON public.workout_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- workout_session_sets
CREATE TABLE IF NOT EXISTS public.workout_session_sets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  muscle_group  TEXT,
  set_number    INT  NOT NULL,
  reps_done     INT,
  weight_kg     DECIMAL(6,2),
  rpe           INT  CHECK (rpe BETWEEN 1 AND 10),
  completed     BOOLEAN DEFAULT FALSE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workout_session_sets_session_set_idx
  ON public.workout_session_sets (session_id, set_number);

ALTER TABLE public.workout_session_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users select own workout_session_sets"  ON public.workout_session_sets;
DROP POLICY IF EXISTS "users insert own workout_session_sets"  ON public.workout_session_sets;
DROP POLICY IF EXISTS "users update own workout_session_sets"  ON public.workout_session_sets;
DROP POLICY IF EXISTS "users delete own workout_session_sets"  ON public.workout_session_sets;

-- RLS via JOIN a workout_sessions
CREATE POLICY "users select own workout_session_sets" ON public.workout_session_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = session_id AND ws.user_id = auth.uid()
    )
  );
CREATE POLICY "users insert own workout_session_sets" ON public.workout_session_sets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = session_id AND ws.user_id = auth.uid()
    )
  );
CREATE POLICY "users update own workout_session_sets" ON public.workout_session_sets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = session_id AND ws.user_id = auth.uid()
    )
  );
CREATE POLICY "users delete own workout_session_sets" ON public.workout_session_sets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = session_id AND ws.user_id = auth.uid()
    )
  );

-- favorite_meals
CREATE TABLE IF NOT EXISTS public.favorite_meals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  items_json      JSONB NOT NULL,
  total_calories  DECIMAL(7,2),
  total_protein_g DECIMAL(6,2),
  total_carbs_g   DECIMAL(6,2),
  total_fat_g     DECIMAL(6,2),
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.favorite_meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users select own favorite_meals"  ON public.favorite_meals;
DROP POLICY IF EXISTS "users insert own favorite_meals"  ON public.favorite_meals;
DROP POLICY IF EXISTS "users update own favorite_meals"  ON public.favorite_meals;
DROP POLICY IF EXISTS "users delete own favorite_meals"  ON public.favorite_meals;

CREATE POLICY "users select own favorite_meals" ON public.favorite_meals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own favorite_meals" ON public.favorite_meals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own favorite_meals" ON public.favorite_meals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users delete own favorite_meals" ON public.favorite_meals
  FOR DELETE USING (auth.uid() = user_id);

-- water_logs
CREATE TABLE IF NOT EXISTS public.water_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_ml  INT  NOT NULL CHECK (amount_ml > 0),
  logged_at  TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS water_logs_user_logged_at_idx
  ON public.water_logs (user_id, logged_at DESC);

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users select own water_logs"  ON public.water_logs;
DROP POLICY IF EXISTS "users insert own water_logs"  ON public.water_logs;
DROP POLICY IF EXISTS "users update own water_logs"  ON public.water_logs;
DROP POLICY IF EXISTS "users delete own water_logs"  ON public.water_logs;

CREATE POLICY "users select own water_logs" ON public.water_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own water_logs" ON public.water_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own water_logs" ON public.water_logs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users delete own water_logs" ON public.water_logs
  FOR DELETE USING (auth.uid() = user_id);

-- exercise_favorites
-- Nota: exercises.id è TEXT (vedi schema-v3), quindi exercise_id deve essere TEXT
CREATE TABLE IF NOT EXISTS public.exercise_favorites (
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, exercise_id)
);

ALTER TABLE public.exercise_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users select own exercise_favorites"  ON public.exercise_favorites;
DROP POLICY IF EXISTS "users insert own exercise_favorites"  ON public.exercise_favorites;
DROP POLICY IF EXISTS "users delete own exercise_favorites"  ON public.exercise_favorites;

CREATE POLICY "users select own exercise_favorites" ON public.exercise_favorites
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own exercise_favorites" ON public.exercise_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own exercise_favorites" ON public.exercise_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- streaks
CREATE TABLE IF NOT EXISTS public.streaks (
  user_id        UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_log_date  DATE,
  updated_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users select own streaks"  ON public.streaks;
DROP POLICY IF EXISTS "users insert own streaks"  ON public.streaks;
DROP POLICY IF EXISTS "users update own streaks"  ON public.streaks;

CREATE POLICY "users select own streaks" ON public.streaks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own streaks" ON public.streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own streaks" ON public.streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- ─── C) Estendere meal_items con micronutrienti opzionali ─────────────────────

ALTER TABLE public.meal_items ADD COLUMN IF NOT EXISTS fiber_g    DECIMAL(5,2);
ALTER TABLE public.meal_items ADD COLUMN IF NOT EXISTS sugar_g    DECIMAL(5,2);
ALTER TABLE public.meal_items ADD COLUMN IF NOT EXISTS sodium_mg  DECIMAL(7,2);

-- ─── D) meal_plans.plan_data (jsonb) ─────────────────────────────────────────
-- Nessuna modifica schema necessaria: plan_data è già JSONB.
-- Il campo "steps" (array di stringhe con istruzioni di preparazione) viene
-- aggiunto direttamente nel JSON generato dall'AI. Ogni pasto può contenere:
--   "steps": ["Passo 1...", "Passo 2...", ...]
-- Retrocompatibile: i piani esistenti semplicemente non hanno il campo steps.
