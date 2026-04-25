import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';

// Parse ISO week (YYYY-WW) and return Monday of that week
function isoWeekToMonday(isoWeek: string): Date {
  const [yearStr, weekStr] = isoWeek.split('-W');
  const year = parseInt(yearStr!, 10);
  const week = parseInt(weekStr!, 10);

  // Jan 4 is always in week 1
  const jan4 = new Date(year, 0, 4);
  const jan4Dow = jan4.getDay() === 0 ? 7 : jan4.getDay(); // 1=Mon...7=Sun
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - (jan4Dow - 1) + (week - 1) * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function dateToISOWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface WeekTotals {
  days_logged: number;
  meals_count: number;
  calories_avg: number;
  protein_avg: number;
  carbs_avg: number;
  fat_avg: number;
  water_avg_ml: number;
  workouts_count: number;
  workout_volume_total: number;
  weight_change_kg: number | null;
  weight_start: number | null;
  weight_end: number | null;
}

interface DailyEntry {
  date: string;
  calories: number;
  protein_g: number;
  workouts: number;
}

async function fetchWeekData(supabase: ReturnType<typeof createClient>, userId: string, monday: Date): Promise<{
  totals: WeekTotals;
  daily: DailyEntry[];
}> {
  const sunday = addDays(monday, 6);
  sunday.setHours(23, 59, 59, 999);
  const mondayISO = monday.toISOString();
  const sundayISO = sunday.toISOString();

  const [
    { data: meals },
    { data: workouts },
    { data: sets },
    { data: weightLogs },
    { data: waterLogs },
  ] = await Promise.all([
    supabase
      .from('meals')
      .select('consumed_at, total_calories, total_protein_g, total_carbs_g, total_fat_g')
      .eq('user_id', userId)
      .gte('consumed_at', mondayISO)
      .lte('consumed_at', sundayISO),
    supabase
      .from('workout_sessions')
      .select('id, completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .gte('completed_at', mondayISO)
      .lte('completed_at', sundayISO),
    supabase
      .from('workout_session_sets')
      .select('session_id, reps_done, weight_kg, completed')
      .eq('completed', true),
    supabase
      .from('weight_logs')
      .select('weight_kg, logged_at')
      .eq('user_id', userId)
      .gte('logged_at', mondayISO)
      .lte('logged_at', sundayISO)
      .order('logged_at', { ascending: true }),
    supabase
      .from('water_logs')
      .select('amount_ml, logged_at')
      .eq('user_id', userId)
      .gte('logged_at', mondayISO)
      .lte('logged_at', sundayISO),
  ]);

  const completedSessionIds = new Set((workouts ?? []).map((w) => w.id as string));

  // Volume: reps * kg for completed sets of this week's sessions
  const weekSets = (sets ?? []).filter((s) => completedSessionIds.has(s.session_id as string));
  const workoutVolume = weekSets.reduce((acc, s) => {
    return acc + ((s.reps_done as number ?? 0) * (s.weight_kg as number ?? 0));
  }, 0);

  // Daily map
  const dailyMap = new Map<string, { calories: number; protein_g: number; meals: number; workouts: number; water_ml: number }>();
  for (let i = 0; i < 7; i++) {
    const ds = toDateStr(addDays(monday, i));
    dailyMap.set(ds, { calories: 0, protein_g: 0, meals: 0, workouts: 0, water_ml: 0 });
  }

  function getDayStr(isoStr: string): string {
    const d = new Date(isoStr);
    return toDateStr(d);
  }

  for (const meal of meals ?? []) {
    const ds = getDayStr(meal.consumed_at as string);
    const day = dailyMap.get(ds);
    if (day) {
      day.calories += (meal.total_calories as number) ?? 0;
      day.protein_g += (meal.total_protein_g as number) ?? 0;
      day.meals++;
    }
  }

  for (const workout of workouts ?? []) {
    if (!workout.completed_at) continue;
    const ds = getDayStr(workout.completed_at as string);
    const day = dailyMap.get(ds);
    if (day) day.workouts++;
  }

  for (const wl of waterLogs ?? []) {
    const ds = getDayStr(wl.logged_at as string);
    const day = dailyMap.get(ds);
    if (day) day.water_ml += (wl.amount_ml as number) ?? 0;
  }

  const daysLogged = Array.from(dailyMap.values()).filter((d) => d.meals > 0).length;
  const loggedDays = Array.from(dailyMap.values()).filter((d) => d.meals > 0);
  const caloriesAvg = loggedDays.length > 0
    ? Math.round(loggedDays.reduce((s, d) => s + d.calories, 0) / loggedDays.length)
    : 0;
  const proteinAvg = loggedDays.length > 0
    ? Math.round(loggedDays.reduce((s, d) => s + d.protein_g, 0) / loggedDays.length)
    : 0;

  const allMeals = meals ?? [];
  const carbs = allMeals.length > 0
    ? Math.round(allMeals.reduce((s, m) => s + ((m.total_carbs_g as number) ?? 0), 0) / Math.max(1, daysLogged))
    : 0;
  const fat = allMeals.length > 0
    ? Math.round(allMeals.reduce((s, m) => s + ((m.total_fat_g as number) ?? 0), 0) / Math.max(1, daysLogged))
    : 0;

  const totalWater = Array.from(dailyMap.values()).reduce((s, d) => s + d.water_ml, 0);
  const waterAvg = Math.round(totalWater / 7);

  // Weight
  const wlSorted = (weightLogs ?? []).sort((a, b) =>
    new Date(a.logged_at as string).getTime() - new Date(b.logged_at as string).getTime()
  );
  const weightStart = wlSorted[0]?.weight_kg as number ?? null;
  const weightEnd = wlSorted[wlSorted.length - 1]?.weight_kg as number ?? null;
  const weightChange =
    weightStart !== null && weightEnd !== null
      ? Math.round((weightEnd - weightStart) * 100) / 100
      : null;

  const daily: DailyEntry[] = Array.from(dailyMap.entries()).map(([date, d]) => ({
    date,
    calories: Math.round(d.calories),
    protein_g: Math.round(d.protein_g),
    workouts: d.workouts,
  }));

  return {
    totals: {
      days_logged: daysLogged,
      meals_count: (meals ?? []).length,
      calories_avg: caloriesAvg,
      protein_avg: proteinAvg,
      carbs_avg: carbs,
      fat_avg: fat,
      water_avg_ml: waterAvg,
      workouts_count: (workouts ?? []).length,
      workout_volume_total: Math.round(workoutVolume),
      weight_change_kg: weightChange,
      weight_start: weightStart,
      weight_end: weightEnd,
    },
    daily,
  };
}

function generateInsights(totals: WeekTotals, caloriesTarget: number, proteinTarget: number): string[] {
  const insights: string[] = [];

  if (totals.workouts_count >= 4) {
    insights.push(`Hai allenato ${totals.workouts_count} volte questa settimana: ottimo impegno!`);
  } else if (totals.workouts_count === 0) {
    insights.push('Nessun allenamento questa settimana: prova a inserire almeno una sessione.');
  } else {
    insights.push(`${totals.workouts_count} allenament${totals.workouts_count === 1 ? 'o' : 'i'} completat${totals.workouts_count === 1 ? 'o' : 'i'} questa settimana.`);
  }

  if (caloriesTarget > 0 && totals.calories_avg > 0) {
    const diff = totals.calories_avg - caloriesTarget;
    if (Math.abs(diff) < 100) {
      insights.push('Calorie in linea con il target: ottimo!');
    } else if (diff < 0) {
      insights.push(`Calorie sotto il target di ${Math.abs(diff)} kcal/giorno in media.`);
    } else {
      insights.push(`Calorie sopra il target di +${diff} kcal/giorno in media.`);
    }
  }

  if (totals.water_avg_ml > 0 && totals.water_avg_ml < 1500) {
    insights.push(`Idratazione bassa: media di ${Math.round(totals.water_avg_ml / 100) / 10}L al giorno. Cerca di bere di più!`);
  } else if (totals.water_avg_ml >= 2000) {
    insights.push(`Ottima idratazione: ${Math.round(totals.water_avg_ml / 100) / 10}L in media al giorno.`);
  }

  if (totals.days_logged < 4) {
    insights.push(`Hai loggato solo ${totals.days_logged} giorn${totals.days_logged === 1 ? 'o' : 'i'}: prova a tracciare ogni giorno per risultati migliori.`);
  } else if (totals.days_logged === 7) {
    insights.push('Hai loggato tutti e 7 i giorni: consistenza perfetta!');
  }

  if (proteinTarget > 0 && totals.protein_avg > 0) {
    const prot_pct = Math.round((totals.protein_avg / proteinTarget) * 100);
    if (prot_pct < 80) {
      insights.push(`Proteine al ${prot_pct}% del target: aumenta le fonti proteiche.`);
    } else if (prot_pct >= 100) {
      insights.push('Proteine al target o superiori: ben fatto!');
    }
  }

  return insights;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const weekParam = searchParams.get('week'); // YYYY-WW

    const today = new Date();
    const currentWeekStr = weekParam ?? dateToISOWeek(today);

    let monday: Date;
    try {
      monday = isoWeekToMonday(currentWeekStr);
    } catch {
      monday = isoWeekToMonday(dateToISOWeek(today));
    }

    const prevMonday = addDays(monday, -7);

    // Fetch profile for targets
    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_calories, daily_protein_g, goal, target_weight_kg')
      .eq('id', user.id)
      .single();

    const caloriesTarget = (profile?.daily_calories as number) ?? 2000;
    const proteinTarget = (profile?.daily_protein_g as number) ?? 150;

    const [currentData, previousData] = await Promise.all([
      fetchWeekData(supabase, user.id, monday),
      fetchWeekData(supabase, user.id, prevMonday),
    ]);

    const sunday = addDays(monday, 6);

    const insights = generateInsights(currentData.totals, caloriesTarget, proteinTarget);

    // Best calorie day
    const bestDay = currentData.daily.reduce<DailyEntry | null>((best, d) => {
      if (!best || d.calories > best.calories) return d;
      return best;
    }, null);

    const caloriesPct = caloriesTarget > 0 && currentData.totals.calories_avg > 0
      ? Math.min(100, Math.round((currentData.totals.calories_avg / caloriesTarget) * 100))
      : 0;
    const proteinPct = proteinTarget > 0 && currentData.totals.protein_avg > 0
      ? Math.min(100, Math.round((currentData.totals.protein_avg / proteinTarget) * 100))
      : 0;

    return NextResponse.json({
      week_start: toDateStr(monday),
      week_end: toDateStr(sunday),
      totals: currentData.totals,
      previous: previousData.totals,
      adherence: {
        calories_target: caloriesTarget,
        calories_avg: currentData.totals.calories_avg,
        calories_pct: caloriesPct,
        protein_target: proteinTarget,
        protein_avg: currentData.totals.protein_avg,
        protein_pct: proteinPct,
      },
      daily: currentData.daily,
      best_calorie_day: bestDay && bestDay.calories > 0 ? { date: bestDay.date, calories: bestDay.calories } : null,
      insights,
    });
  } catch (err) {
    console.error('GET /api/weekly-report error:', err);
    return NextResponse.json({ error: 'Errore recupero report settimanale' }, { status: 500 });
  }
}
