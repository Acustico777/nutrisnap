import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';

interface Badge {
  id: string;
  label: string;
  description: string;
  unlocked: boolean;
}

function calcStreakFromDates(distinctDates: string[]): { current: number; longest: number; lastLogDate: string | null } {
  if (distinctDates.length === 0) return { current: 0, longest: 0, lastLogDate: null };

  // Sort descending
  const sorted = [...distinctDates].sort((a, b) => b.localeCompare(a));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0]!;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0]!;

  const lastLogDate = sorted[0] ?? null;

  // Current streak
  let current = 0;
  let streakStart: string;

  if (sorted[0] === todayStr) {
    streakStart = todayStr;
  } else if (sorted[0] === yesterdayStr) {
    streakStart = yesterdayStr;
  } else {
    // Last log was before yesterday -> streak broken
    return { current: 0, longest: 0, lastLogDate };
  }

  // Count consecutive from streakStart going back
  const dateSet = new Set(sorted);
  let cursor = new Date(streakStart + 'T00:00:00Z');
  while (dateSet.has(cursor.toISOString().split('T')[0]!)) {
    current++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  // Longest streak: iterate all sorted dates
  let longest = 0;
  let run = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = new Date(sorted[i]! + 'T00:00:00Z');
    const b = new Date(sorted[i + 1]! + 'T00:00:00Z');
    const diffDays = (a.getTime() - b.getTime()) / 86400000;
    if (Math.round(diffDays) === 1) {
      run++;
    } else {
      if (run > longest) longest = run;
      run = 1;
    }
  }
  if (run > longest) longest = run;

  return { current, longest, lastLogDate };
}

export async function GET(_req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    // Fetch meals last 90 days to calculate streak
    const since90 = new Date(Date.now() - 90 * 86400000).toISOString();

    const [
      { data: mealRows },
      { data: workoutRows },
      { data: weightRows },
      { data: waterRows },
    ] = await Promise.all([
      supabase.from('meals').select('consumed_at').eq('user_id', user.id).gte('consumed_at', since90),
      supabase.from('workout_sessions').select('completed_at').eq('user_id', user.id).not('completed_at', 'is', null),
      supabase.from('weight_logs').select('id').eq('user_id', user.id),
      supabase.from('water_logs').select('id').eq('user_id', user.id),
    ]);

    // Total counts
    const totalMeals = mealRows?.length ?? 0;
    const totalWorkouts = (workoutRows ?? []).filter(r => r.completed_at).length;
    const totalWeightLogs = weightRows?.length ?? 0;
    const totalWaterLogs = waterRows?.length ?? 0;

    // Count ALL meals (not just last 90 days) for badges
    const { count: allMealsCount } = await supabase
      .from('meals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const allMeals = allMealsCount ?? 0;

    // Distinct dates with logs from last 90 days
    const distinctDates = Array.from(
      new Set(
        (mealRows ?? []).map((r) => {
          const d = new Date(r.consumed_at as string);
          d.setHours(0, 0, 0, 0);
          return d.toISOString().split('T')[0]!;
        })
      )
    );

    const { current, longest, lastLogDate } = calcStreakFromDates(distinctDates);

    // Upsert streaks
    await supabase.from('streaks').upsert({
      user_id: user.id,
      current_streak: current,
      longest_streak: longest,
      last_log_date: lastLogDate,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    // Build badges
    const badges: Badge[] = [
      {
        id: 'first_flame',
        label: 'Prima fiamma',
        description: '3 giorni consecutivi di log',
        unlocked: current >= 3,
      },
      {
        id: 'full_week',
        label: 'Settimana piena',
        description: '7 giorni consecutivi di log',
        unlocked: current >= 7,
      },
      {
        id: 'two_weeks',
        label: 'Due settimane',
        description: '14 giorni consecutivi di log',
        unlocked: current >= 14,
      },
      {
        id: 'champion_month',
        label: 'Mese da campione',
        description: '30 giorni consecutivi di log',
        unlocked: current >= 30,
      },
      {
        id: '100_days',
        label: '100 giorni',
        description: 'Streak massima di almeno 100 giorni',
        unlocked: longest >= 100,
      },
      {
        id: 'first_meal',
        label: 'Primo pasto',
        description: 'Hai registrato il tuo primo pasto',
        unlocked: allMeals >= 1,
      },
      {
        id: 'ten_meals',
        label: '10 pasti',
        description: '10 pasti registrati in totale',
        unlocked: allMeals >= 10,
      },
      {
        id: 'hundred_meals',
        label: '100 pasti',
        description: '100 pasti registrati in totale',
        unlocked: allMeals >= 100,
      },
      {
        id: 'first_workout',
        label: 'Primo allenamento',
        description: 'Hai completato il tuo primo allenamento',
        unlocked: totalWorkouts >= 1,
      },
      {
        id: 'ten_workouts',
        label: '10 allenamenti',
        description: '10 sessioni di allenamento completate',
        unlocked: totalWorkouts >= 10,
      },
      {
        id: 'first_weight',
        label: 'Primo peso',
        description: 'Hai registrato la tua prima misurazione',
        unlocked: totalWeightLogs >= 1,
      },
      {
        id: 'weight_tracker',
        label: 'Tracker peso',
        description: '10 misurazioni di peso registrate',
        unlocked: totalWeightLogs >= 10,
      },
      {
        id: 'hydrated',
        label: 'Idratato',
        description: 'Hai registrato il consumo di acqua',
        unlocked: totalWaterLogs >= 1,
      },
    ];

    return NextResponse.json({
      current_streak: current,
      longest_streak: longest,
      last_log_date: lastLogDate,
      badges,
    });
  } catch (err) {
    console.error('GET /api/streak error:', err);
    return NextResponse.json({ error: 'Errore recupero streak' }, { status: 500 });
  }
}
