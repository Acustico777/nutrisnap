import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { createClient } from '@/lib/supabase/server';
import type { MealPlan } from '@/lib/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { data: plan, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error || !plan) {
      return NextResponse.json({ error: 'Piano non trovato' }, { status: 404 });
    }

    const mealPlan = plan as MealPlan;
    const counts: Record<string, number> = {};

    for (const day of mealPlan.plan_data.days) {
      for (const meal of day.meals) {
        for (const ing of meal.ingredients) {
          const key = ing.trim().toLowerCase();
          counts[key] = (counts[key] ?? 0) + 1;
        }
      }
    }

    const items = Object.entries(counts)
      .map(([ingredient, count]) => ({ ingredient, count }))
      .sort((a, b) => a.ingredient.localeCompare(b.ingredient, 'it'));

    return NextResponse.json({ items });
  } catch (err) {
    console.error('GET /api/meal-plan/[id]/shopping-list error:', err);
    return NextResponse.json({ error: 'Errore generazione lista spesa' }, { status: 500 });
  }
}
