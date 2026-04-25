import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    // Verify session ownership
    const { data: session, error: sessionErr } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Sessione non trovata' }, { status: 404 });
    }

    const body = await req.json() as {
      exercise_name: string;
      muscle_group?: string | null;
      set_number: number;
    };

    const { data, error } = await supabase
      .from('workout_session_sets')
      .insert({
        session_id: params.id,
        exercise_name: body.exercise_name,
        muscle_group: body.muscle_group ?? null,
        set_number: body.set_number,
        completed: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ set: data }, { status: 201 });
  } catch (err) {
    console.error('POST /api/workout-sessions/[id]/sets error:', err);
    return NextResponse.json({ error: 'Errore aggiunta set' }, { status: 500 });
  }
}
