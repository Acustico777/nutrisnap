import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/categories';
import type { CategoryBreakdown } from '@/lib/types';

type RangeParam = 'day' | 'week' | 'month';

function getDateRange(range: RangeParam): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  let from: Date;
  if (range === 'day') {
    from = new Date(now);
    from.setHours(0, 0, 0, 0);
  } else if (range === 'week') {
    from = new Date(now);
    from.setDate(now.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  } else {
    from = new Date(now);
    from.setDate(now.getDate() - 29);
    from.setHours(0, 0, 0, 0);
  }

  return { from, to };
}

function dateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0]!;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const rangeParam = (searchParams.get('range') ?? 'week') as RangeParam;
    const range: RangeParam = ['day', 'week', 'month'].includes(rangeParam) ? rangeParam : 'week';

    const { from, to } = getDateRange(range);

    const { data: meals, error } = await supabase
      .from('meals')
      .select('consumed_at, meal_items(name, quantity, calories, protein_g, carbs_g, fat_g, category)')
      .eq('user_id', user.id)
      .gte('consumed_at', from.toISOString())
      .lte('consumed_at', to.toISOString());

    if (error) throw error;

    // Accumulate per-category totals
    const categoryCalories: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      categoryCalories[cat] = 0;
      categoryCounts[cat] = 0;
    }

    // Build daily series map: date string -> per-category calories + macros
    type DayData = { cats: Record<string, number>; protein_g: number; carbs_g: number; fat_g: number };
    const seriesMap: Map<string, DayData> = new Map();

    // Populate date slots
    const cursor = new Date(from);
    while (cursor <= to) {
      const ds = toDateString(cursor);
      const dayCats: Record<string, number> = {};
      for (const cat of CATEGORIES) dayCats[cat] = 0;
      seriesMap.set(ds, { cats: dayCats, protein_g: 0, carbs_g: 0, fat_g: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    let totalItems = 0;

    for (const meal of meals ?? []) {
      const mealDate = toDateString(new Date(meal.consumed_at as string));
      const dayData = seriesMap.get(mealDate);

      for (const item of (meal.meal_items as Array<{ name: string; quantity: number; calories: number; protein_g?: number; carbs_g?: number; fat_g?: number; category?: string }> ?? [])) {
        const cat = (item.category ?? 'other') as string;
        const qty = item.quantity ?? 1;
        const kcal = (item.calories ?? 0) * qty;

        categoryCalories[cat] = (categoryCalories[cat] ?? 0) + kcal;
        categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
        totalItems += 1;

        if (dayData) {
          dayData.cats[cat] = (dayData.cats[cat] ?? 0) + kcal;
          dayData.protein_g += (item.protein_g ?? 0) * qty;
          dayData.carbs_g += (item.carbs_g ?? 0) * qty;
          dayData.fat_g += (item.fat_g ?? 0) * qty;
        }
      }
    }

    const totalCalories = Object.values(categoryCalories).reduce((a, b) => a + b, 0);

    const breakdown: CategoryBreakdown[] = CATEGORIES.map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      calories: Math.round(categoryCalories[cat] ?? 0),
      count: categoryCounts[cat] ?? 0,
      percent: totalCalories > 0
        ? Math.round(((categoryCalories[cat] ?? 0) / totalCalories) * 100)
        : 0,
    }));

    const series = Array.from(seriesMap.entries()).map(([date, dayData]) => {
      const dayTotal = Object.values(dayData.cats).reduce((a, b) => a + b, 0);
      return {
        date,
        label: dateLabel(date),
        categories: {
          vegetables: Math.round(dayData.cats['vegetables'] ?? 0),
          meat: Math.round(dayData.cats['meat'] ?? 0),
          fish: Math.round(dayData.cats['fish'] ?? 0),
          fruit: Math.round(dayData.cats['fruit'] ?? 0),
          other: Math.round(dayData.cats['other'] ?? 0),
        },
        total: Math.round(dayTotal),
        protein_g: Math.round(dayData.protein_g),
        carbs_g: Math.round(dayData.carbs_g),
        fat_g: Math.round(dayData.fat_g),
      };
    });

    return NextResponse.json({
      range,
      breakdown,
      series,
      totalCalories: Math.round(totalCalories),
      totalItems,
    });
  } catch (err) {
    console.error('GET /api/insights error:', err);
    return NextResponse.json({ error: 'Errore recupero insights' }, { status: 500 });
  }
}
