import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import type { WorkoutDay } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json() as {
      name: string;
      days: WorkoutDay[];
    };

    if (!body.name || !body.days || body.days.length === 0) {
      return NextResponse.json({ error: 'name e days sono obbligatori' }, { status: 400 });
    }

    const { data: plan, error } = await supabase
      .from('workout_plans')
      .insert({
        user_id: user.id,
        name: body.name,
        goal: null,
        days_per_week: body.days.length,
        location: null,
        plan_data: { days: body.days },
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ plan }, { status: 201 });
  } catch (err) {
    console.error('POST /api/workout-plan/custom error:', err);
    return NextResponse.json({ error: 'Errore creazione piano custom' }, { status: 500 });
  }
}
