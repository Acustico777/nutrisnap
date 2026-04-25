import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';

interface DayData {
  date: string;
  meals_count: number;
  calories_total: number;
  workouts_count: number;
  weight_logged: boolean;
  water_ml: number;
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]!;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month'); // YYYY-MM

    let year: number;
    let month: number; // 0-indexed

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split('-').map(Number);
      year = y!;
      month = m! - 1;
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth();
    }

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const fromISO = new Date(Date.UTC(year, month, 1)).toISOString();
    const toISO = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString();

    // Fetch all data in parallel
    const [
      { data: meals },
      { data: workouts },
      { data: weightLogs },
      { data: waterLogs },
    ] = await Promise.all([
      supabase
        .from('meals')
        .select('id, total_calories, consumed_at')
        .eq('user_id', user.id)
        .gte('consumed_at', fromISO)
        .lte('consumed_at', toISO),
      supabase
        .from('workout_sessions')
        .select('id, completed_at')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .gte('completed_at', fromISO)
        .lte('completed_at', toISO),
      supabase
        .from('weight_logs')
        .select('id, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', fromISO)
        .lte('logged_at', toISO),
      supabase
        .from('water_logs')
        .select('amount_ml, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', fromISO)
        .lte('logged_at', toISO),
    ]);

    // Build day map
    const dayMap = new Map<string, DayData>();

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dayMap.set(ds, {
        date: ds,
        meals_count: 0,
        calories_total: 0,
        workouts_count: 0,
        weight_logged: false,
        water_ml: 0,
      });
    }

    function getDateStr(isoStr: string): string {
      const d = new Date(isoStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    for (const meal of meals ?? []) {
      const ds = getDateStr(meal.consumed_at as string);
      const day = dayMap.get(ds);
      if (day) {
        day.meals_count++;
        day.calories_total += (meal.total_calories as number) ?? 0;
      }
    }

    for (const workout of workouts ?? []) {
      if (!workout.completed_at) continue;
      const ds = getDateStr(workout.completed_at as string);
      const day = dayMap.get(ds);
      if (day) day.workouts_count++;
    }

    for (const wl of weightLogs ?? []) {
      const ds = getDateStr(wl.logged_at as string);
      const day = dayMap.get(ds);
      if (day) day.weight_logged = true;
    }

    for (const wl of waterLogs ?? []) {
      const ds = getDateStr(wl.logged_at as string);
      const day = dayMap.get(ds);
      if (day) day.water_ml += (wl.amount_ml as number) ?? 0;
    }

    const result = Array.from(dayMap.values()).map((d) => ({
      ...d,
      calories_total: Math.round(d.calories_total),
    }));

    return NextResponse.json({ days: result, year, month: month + 1 });
  } catch (err) {
    console.error('GET /api/calendar error:', err);
    return NextResponse.json({ error: 'Errore recupero calendario' }, { status: 500 });
  }
}
