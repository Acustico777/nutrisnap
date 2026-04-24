import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const muscle_group = searchParams.get('muscle_group');
    const equipment = searchParams.get('equipment');

    let q = supabase.from('exercises').select('*').order('name_it');
    if (muscle_group) q = q.eq('muscle_group', muscle_group);
    if (equipment) q = q.eq('equipment', equipment);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ exercises: data });
  } catch (err) {
    console.error('GET /api/exercises error:', err);
    return NextResponse.json({ error: 'Errore recupero esercizi' }, { status: 500 });
  }
}
