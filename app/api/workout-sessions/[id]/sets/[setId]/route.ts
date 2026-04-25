import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; setId: string } }
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
      reps_done?: number | null;
      weight_kg?: number | null;
      rpe?: number | null;
      completed?: boolean;
      notes?: string | null;
    };

    const update: Record<string, number | boolean | string | null> = {};
    if (body.reps_done !== undefined) update.reps_done = body.reps_done;
    if (body.weight_kg !== undefined) update.weight_kg = body.weight_kg;
    if (body.rpe !== undefined) update.rpe = body.rpe;
    if (body.completed !== undefined) update.completed = body.completed;
    if (body.notes !== undefined) update.notes = body.notes;

    const { data, error } = await supabase
      .from('workout_session_sets')
      .update(update)
      .eq('id', params.setId)
      .eq('session_id', params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Set non trovato' }, { status: 404 });

    return NextResponse.json({ set: data });
  } catch (err) {
    console.error('PATCH /api/workout-sessions/[id]/sets/[setId] error:', err);
    return NextResponse.json({ error: 'Errore aggiornamento set' }, { status: 500 });
  }
}
