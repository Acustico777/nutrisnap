import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';

type RangeParam = 'week' | 'month' | 'year' | 'all';

function getFromDate(range: RangeParam): Date | null {
  if (range === 'all') return null;
  const now = new Date();
  if (range === 'week') {
    const d = new Date(now);
    d.setDate(now.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === 'month') {
    const d = new Date(now);
    d.setDate(now.getDate() - 29);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  // year
  const d = new Date(now);
  d.setFullYear(now.getFullYear() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const rangeRaw = searchParams.get('range') ?? 'all';
    const range: RangeParam = (['week', 'month', 'year', 'all'].includes(rangeRaw) ? rangeRaw : 'all') as RangeParam;

    let query = supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false });

    const fromDate = getFromDate(range);
    if (fromDate) {
      query = query.gte('logged_at', fromDate.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ logs: data ?? [] });
  } catch (err) {
    console.error('GET /api/weight-logs error:', err);
    return NextResponse.json({ error: 'Errore recupero log peso' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json() as {
      weight_kg: number;
      lean_mass_kg?: number | null;
      fat_mass_kg?: number | null;
      body_fat_percent?: number | null;
      notes?: string | null;
      logged_at?: string | null;
    };

    if (!body.weight_kg || isNaN(Number(body.weight_kg))) {
      return NextResponse.json({ error: 'Peso obbligatorio' }, { status: 400 });
    }

    let lean_mass_kg = body.lean_mass_kg ?? null;
    let fat_mass_kg = body.fat_mass_kg ?? null;
    const body_fat_percent = body.body_fat_percent ?? null;

    // Auto-calculate lean/fat if bf% is provided and one is missing
    if (body_fat_percent !== null) {
      const fatKg = Math.round((body.weight_kg * body_fat_percent) / 100 * 100) / 100;
      const leanKg = Math.round((body.weight_kg - fatKg) * 100) / 100;
      if (fat_mass_kg === null) fat_mass_kg = fatKg;
      if (lean_mass_kg === null) lean_mass_kg = leanKg;
    }

    const loggedAt = body.logged_at ? new Date(body.logged_at) : new Date();

    const { data: newLog, error: insertError } = await supabase
      .from('weight_logs')
      .insert({
        user_id: user.id,
        weight_kg: body.weight_kg,
        lean_mass_kg,
        fat_mass_kg,
        body_fat_percent,
        notes: body.notes ?? null,
        logged_at: loggedAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Check if this is the most recent log — if so, update the profile
    const { data: latestLog } = await supabase
      .from('weight_logs')
      .select('id, logged_at')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(1)
      .single();

    if (latestLog && latestLog.id === newLog.id) {
      await supabase
        .from('profiles')
        .update({
          weight_kg: body.weight_kg,
          lean_mass_kg,
          fat_mass_kg,
          body_fat_percent,
        })
        .eq('id', user.id);
    }

    return NextResponse.json({ log: newLog }, { status: 201 });
  } catch (err) {
    console.error('POST /api/weight-logs error:', err);
    return NextResponse.json({ error: 'Errore salvataggio log peso' }, { status: 500 });
  }
}
