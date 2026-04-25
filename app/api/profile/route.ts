import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { calculateBMR, calculateTDEE } from '@/lib/nutrition';
import type { ActivityLevel, Sex } from '@/lib/nutrition';

export async function GET(_req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    return NextResponse.json({ profile });
  } catch (err) {
    console.error('GET /api/profile error:', err);
    return NextResponse.json({ error: 'Errore recupero profilo' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json() as {
      display_name?: string;
      age?: number;
      weight_kg?: number;
      height_cm?: number;
      sex?: 'male' | 'female';
      activity_level?: ActivityLevel;
      diet_preference?: string;
      excluded_foods?: string[];
      goal?: 'cut' | 'lean_bulk' | 'maintain';
      days_per_week?: number;
      workout_location?: 'gym' | 'home';
      target_weight_kg?: number | null;
      goal_target_date?: string | null;
      path_preference?: 'nutrition' | 'workout' | 'both';
    };

    // Build update payload with only provided fields
    const updates: Record<string, unknown> = {};
    if (body.display_name !== undefined) updates.display_name = body.display_name;
    if (body.age !== undefined) updates.age = body.age;
    if (body.weight_kg !== undefined) updates.weight_kg = body.weight_kg;
    if (body.height_cm !== undefined) updates.height_cm = body.height_cm;
    if (body.sex !== undefined) updates.sex = body.sex;
    if (body.activity_level !== undefined) updates.activity_level = body.activity_level;
    if (body.diet_preference !== undefined) updates.diet_preference = body.diet_preference;
    if (body.excluded_foods !== undefined) updates.excluded_foods = body.excluded_foods;
    if (body.goal !== undefined) updates.goal = body.goal;
    if (body.days_per_week !== undefined) updates.days_per_week = body.days_per_week;
    if (body.workout_location !== undefined) updates.workout_location = body.workout_location;
    if (body.target_weight_kg !== undefined) updates.target_weight_kg = body.target_weight_kg;
    if (body.goal_target_date !== undefined) updates.goal_target_date = body.goal_target_date;
    if (body.path_preference !== undefined) updates.path_preference = body.path_preference;

    // If body has BMR-relevant fields, fetch current profile to fill gaps
    const hasBodyMetrics =
      body.age !== undefined ||
      body.weight_kg !== undefined ||
      body.height_cm !== undefined ||
      body.sex !== undefined ||
      body.activity_level !== undefined;

    if (hasBodyMetrics) {
      const { data: current } = await supabase
        .from('profiles')
        .select('age, weight_kg, height_cm, sex, activity_level')
        .eq('id', user.id)
        .single();

      const age = body.age ?? (current?.age as number | null);
      const weight_kg = body.weight_kg ?? (current?.weight_kg as number | null);
      const height_cm = body.height_cm ?? (current?.height_cm as number | null);
      const sex = (body.sex ?? (current?.sex as string | null)) as Sex | null;
      const activity_level = (body.activity_level ?? (current?.activity_level as string | null) ?? 'moderate') as ActivityLevel;

      if (age && weight_kg && height_cm && sex) {
        const bmr = calculateBMR({ sex, weight_kg, height_cm, age });
        const tdee = calculateTDEE(bmr, activity_level);
        updates.bmr = bmr;
        updates.tdee = tdee;
      }
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ profile });
  } catch (err) {
    console.error('PUT /api/profile error:', err);
    return NextResponse.json({ error: 'Errore aggiornamento profilo' }, { status: 500 });
  }
}
