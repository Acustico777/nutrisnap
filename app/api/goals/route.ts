import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { data, error } = await supabase
      .from('profiles')
      .select('daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    return NextResponse.json({ goals: data });
  } catch (err) {
    console.error('GET /api/goals error:', err);
    return NextResponse.json({ error: 'Errore recupero obiettivi' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json() as {
      daily_calories?: number;
      daily_protein_g?: number;
      daily_carbs_g?: number;
      daily_fat_g?: number;
    };

    const { error } = await supabase
      .from('profiles')
      .update({
        daily_calories: body.daily_calories,
        daily_protein_g: body.daily_protein_g,
        daily_carbs_g: body.daily_carbs_g,
        daily_fat_g: body.daily_fat_g,
      })
      .eq('id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PUT /api/goals error:', err);
    return NextResponse.json({ error: 'Errore aggiornamento obiettivi' }, { status: 500 });
  }
}
