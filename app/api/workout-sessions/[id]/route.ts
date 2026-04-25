import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import type { WorkoutSessionSet } from '@/lib/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*, workout_session_sets(*)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error) return NextResponse.json({ error: 'Sessione non trovata' }, { status: 404 });

    const session = {
      ...data,
      workout_session_sets: [...(data.workout_session_sets ?? [])].sort(
        (a: WorkoutSessionSet, b: WorkoutSessionSet) => a.set_number - b.set_number
      ),
    };

    return NextResponse.json({ session });
  } catch (err) {
    console.error('GET /api/workout-sessions/[id] error:', err);
    return NextResponse.json({ error: 'Errore recupero sessione' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json() as {
      completed_at?: string;
      notes?: string;
    };

    const update: Record<string, string | null> = {};
    if (body.completed_at !== undefined) update.completed_at = body.completed_at;
    if (body.notes !== undefined) update.notes = body.notes;

    const { data, error } = await supabase
      .from('workout_sessions')
      .update(update)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Sessione non trovata' }, { status: 404 });

    return NextResponse.json({ session: data });
  } catch (err) {
    console.error('PATCH /api/workout-sessions/[id] error:', err);
    return NextResponse.json({ error: 'Errore aggiornamento sessione' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { error } = await supabase
      .from('workout_sessions')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: 'Errore eliminazione sessione' }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/workout-sessions/[id] error:', err);
    return NextResponse.json({ error: 'Errore eliminazione sessione' }, { status: 500 });
  }
}
