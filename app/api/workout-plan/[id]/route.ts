import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import type { WorkoutPlan } from '@/lib/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { data: plan, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Piano non trovato' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ plan: plan as WorkoutPlan });
  } catch (err) {
    console.error('GET /api/workout-plan/[id] error:', err);
    return NextResponse.json({ error: 'Errore recupero piano di allenamento' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { error } = await supabase
      .from('workout_plans')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/workout-plan/[id] error:', err);
    return NextResponse.json({ error: 'Errore eliminazione piano di allenamento' }, { status: 500 });
  }
}
