import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import type { WorkoutSession, WorkoutSessionSet } from '@/lib/types';

export type WorkoutSessionWithSets = WorkoutSession & {
  workout_session_sets: WorkoutSessionSet[];
};

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const plan_id = searchParams.get('plan_id');

    let q = supabase
      .from('workout_sessions')
      .select('*, workout_session_sets(*)')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(50);

    if (plan_id) q = q.eq('plan_id', plan_id);

    const { data, error } = await q;
    if (error) throw error;

    // Sort sets by set_number
    const sessions = (data ?? []).map((s) => ({
      ...s,
      workout_session_sets: [...(s.workout_session_sets ?? [])].sort(
        (a: WorkoutSessionSet, b: WorkoutSessionSet) => a.set_number - b.set_number
      ),
    }));

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error('GET /api/workout-sessions error:', err);
    return NextResponse.json({ error: 'Errore recupero sessioni' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json() as {
      plan_id?: string;
      day_label: string;
      exercises: Array<{
        exercise_name: string;
        muscle_group: string;
        sets: number;
      }>;
    };

    const { plan_id, day_label, exercises } = body;
    if (!day_label) {
      return NextResponse.json({ error: 'day_label è obbligatorio' }, { status: 400 });
    }

    // Create the session
    const { data: session, error: sessionErr } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        plan_id: plan_id ?? null,
        day_label,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionErr) throw sessionErr;

    // Build set rows
    const setRows: Array<{
      session_id: string;
      exercise_name: string;
      muscle_group: string | null;
      set_number: number;
      completed: boolean;
    }> = [];

    for (const ex of exercises ?? []) {
      const numSets = Math.max(1, ex.sets ?? 1);
      for (let i = 1; i <= numSets; i++) {
        setRows.push({
          session_id: session.id,
          exercise_name: ex.exercise_name,
          muscle_group: ex.muscle_group ?? null,
          set_number: i,
          completed: false,
        });
      }
    }

    if (setRows.length > 0) {
      const { error: setsErr } = await supabase
        .from('workout_session_sets')
        .insert(setRows);
      if (setsErr) throw setsErr;
    }

    // Fetch complete session with sets
    const { data: fullSession, error: fetchErr } = await supabase
      .from('workout_sessions')
      .select('*, workout_session_sets(*)')
      .eq('id', session.id)
      .single();
    if (fetchErr) throw fetchErr;

    const result = {
      ...fullSession,
      workout_session_sets: [...(fullSession.workout_session_sets ?? [])].sort(
        (a: WorkoutSessionSet, b: WorkoutSessionSet) => a.set_number - b.set_number
      ),
    };

    return NextResponse.json({ session: result }, { status: 201 });
  } catch (err) {
    console.error('POST /api/workout-sessions error:', err);
    return NextResponse.json({ error: 'Errore creazione sessione' }, { status: 500 });
  }
}
