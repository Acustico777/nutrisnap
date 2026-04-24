-- NutriSnap schema v2 — additive migration only
-- Run this on top of the existing schema.sql

-- ─── A) profiles: new columns ────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age int;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weight_kg numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS height_cm numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sex text check (sex in ('male','female'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activity_level text default 'moderate' check (activity_level in ('sedentary','light','moderate','active','very_active'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS diet_preference text default 'none';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS excluded_foods jsonb default '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bmr numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tdee numeric;

-- ─── B) meal_items: category column ──────────────────────────────────────────
ALTER TABLE public.meal_items ADD COLUMN IF NOT EXISTS category text default 'other' check (category in ('vegetables','meat','fish','fruit','other'));

-- ─── C) meal_plans table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_type text check (plan_type in ('daily','weekly')) not null,
  diet_preference text,
  target_calories int,
  plan_data jsonb not null,
  created_at timestamptz default now()
);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own meal_plans" ON public.meal_plans;
CREATE POLICY "users read own meal_plans" ON public.meal_plans
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users insert own meal_plans" ON public.meal_plans;
CREATE POLICY "users insert own meal_plans" ON public.meal_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users delete own meal_plans" ON public.meal_plans;
CREATE POLICY "users delete own meal_plans" ON public.meal_plans
  FOR DELETE USING (auth.uid() = user_id);
