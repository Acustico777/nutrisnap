import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { buildWorkoutPlan } from '@/lib/exercises-builder';
import type { Exercise, WorkoutPlan } from '@/lib/types';
import type { Goal } from '@/lib/nutrition';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json() as {
      days_per_week: number;
      location: 'gym' | 'home';
      goal?: Goal;
      name?: string;
    };

    const { days_per_week, location } = body;

    if (!days_per_week || days_per_week < 1 || days_per_week > 6) {
      return NextResponse.json({ error: 'days_per_week deve essere compreso tra 1 e 6' }, { status: 400 });
    }
    if (!location || !['gym', 'home'].includes(location)) {
      return NextResponse.json({ error: 'location deve essere "gym" o "home"' }, { status: 400 });
    }

    // Fetch profile to get default goal
    const { data: profile } = await supabase
      .from('profiles')
      .select('goal')
      .eq('id', user.id)
      .single();

    const goal: Goal = body.goal ?? (profile?.goal as Goal | null) ?? 'maintain';

    // Fetch all exercises from DB
    const { data: exercises, error: exError } = await supabase
      .from('exercises')
      .select('*');

    if (exError) throw exError;

    if (!exercises || exercises.length === 0) {
      return NextResponse.json({ error: 'Nessun esercizio trovato nel database. Esegui la migrazione schema-v3.sql.' }, { status: 500 });
    }

    // Build the plan
    const days = buildWorkoutPlan({
      goal,
      days_per_week,
      location,
      exercises: exercises as Exercise[],
    });

    const plan_data = { days };

    const { data: plan, error: insertError } = await supabase
      .from('workout_plans')
      .insert({
        user_id: user.id,
        name: body.name ?? null,
        goal,
        days_per_week,
        location,
        plan_data,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ plan }, { status: 201 });
  } catch (err) {
    console.error('POST /api/workout-plan error:', err);
    return NextResponse.json({ error: 'Errore generazione piano di allenamento' }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { data: plan, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ plan: plan as WorkoutPlan | null });
  } catch (err) {
    console.error('GET /api/workout-plan error:', err);
    return NextResponse.json({ error: 'Errore recupero piano di allenamento' }, { status: 500 });
  }
}
