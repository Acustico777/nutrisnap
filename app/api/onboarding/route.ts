import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import {
  calculateBMR,
  calculateBMRKatch,
  calculateTDEE,
  calorieTargetForGoal,
  macroSplitForGoal,
} from '@/lib/nutrition';
import type { ActivityLevel, Goal } from '@/lib/nutrition';

interface OnboardingBody {
  // Step 2 — dati fisici base
  sex: 'male' | 'female';
  age: number;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  // Step 3 — composizione corporea (opzionali)
  body_fat_percent?: number | null;
  lean_mass_kg?: number | null;
  fat_mass_kg?: number | null;
  // Step 4 — obiettivo
  goal: Goal;
  target_weight_kg?: number | null;
  goal_target_date?: string | null;
  // Step 5 — percorso
  path_preference: 'nutrition' | 'workout' | 'both';
  // Step 5b — alimentazione (opzionale se path = workout)
  diet_preference?: string;
  excluded_foods?: string[];
  // Step 5c — allenamento (opzionale se path = nutrition)
  days_per_week?: number | null;
  workout_location?: 'gym' | 'home' | null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const body = await req.json() as OnboardingBody;

    // Validazione campi obbligatori
    const { sex, age, height_cm, weight_kg, activity_level, goal, path_preference } = body;
    if (!sex || !age || !height_cm || !weight_kg || !activity_level || !goal || !path_preference) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 });
    }

    // Calcolo lean_mass e fat_mass se bf% fornita
    let lean_mass_kg = body.lean_mass_kg ?? null;
    let fat_mass_kg = body.fat_mass_kg ?? null;
    const body_fat_percent = body.body_fat_percent ?? null;

    if (body_fat_percent != null && weight_kg) {
      lean_mass_kg = lean_mass_kg ?? parseFloat((weight_kg * (1 - body_fat_percent / 100)).toFixed(2));
      fat_mass_kg  = fat_mass_kg  ?? parseFloat((weight_kg * (body_fat_percent / 100)).toFixed(2));
    }

    // Calcolo BMR: Katch-McArdle se lean_mass disponibile, altrimenti Mifflin-St Jeor
    const bmr = lean_mass_kg != null
      ? calculateBMRKatch(lean_mass_kg)
      : calculateBMR({ sex, weight_kg, height_cm, age });

    const tdee = calculateTDEE(bmr, activity_level);
    const daily_calories = calorieTargetForGoal(tdee, goal);
    const macros = macroSplitForGoal(daily_calories, goal);

    const updatePayload = {
      // dati fisici
      sex,
      age,
      height_cm,
      weight_kg,
      activity_level,
      // composizione corporea
      body_fat_percent,
      lean_mass_kg,
      fat_mass_kg,
      // calcoli
      bmr,
      tdee,
      daily_calories,
      daily_protein_g: macros.protein_g,
      daily_carbs_g: macros.carbs_g,
      daily_fat_g: macros.fat_g,
      // obiettivo
      goal,
      target_weight_kg: body.target_weight_kg ?? null,
      goal_target_date: body.goal_target_date ?? null,
      // percorso
      path_preference,
      // alimentazione
      diet_preference: body.diet_preference ?? 'none',
      excluded_foods: body.excluded_foods ?? [],
      // allenamento
      days_per_week: body.days_per_week ?? null,
      workout_location: body.workout_location ?? null,
      // onboarding completato
      onboarding_completed: true,
    };

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ profile }, { status: 200 });
  } catch (err) {
    console.error('POST /api/onboarding error:', err);
    return NextResponse.json({ error: 'Errore durante il salvataggio del profilo' }, { status: 500 });
  }
}
