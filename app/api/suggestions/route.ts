import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/lib/categories';
import type { FoodSuggestion } from '@/lib/types';

type RangeParam = 'day' | 'week' | 'month';

function getDateRange(range: RangeParam): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  let from: Date;
  if (range === 'day') {
    from = new Date(now); from.setHours(0, 0, 0, 0);
  } else if (range === 'week') {
    from = new Date(now); from.setDate(now.getDate() - 6); from.setHours(0, 0, 0, 0);
  } else {
    from = new Date(now); from.setDate(now.getDate() - 29); from.setHours(0, 0, 0, 0);
  }
  return { from, to };
}

const SUGGESTION_TEMPLATES: Record<string, { reason: string; examples: string[] }> = {
  vegetables: {
    reason: 'Stai mangiando poche verdure questa settimana — prova ad aggiungere più ortaggi ai tuoi pasti.',
    examples: ['Insalata mista', 'Broccoli al vapore', 'Spinaci saltati', 'Zuppa di verdure', 'Caponata'],
  },
  meat: {
    reason: 'Le proteine animali sono basse — un pasto a base di carne magra può aiutarti.',
    examples: ['Petto di pollo grigliato', 'Tacchino al forno', 'Bistecca magra', 'Polpette di manzo', 'Ragù di carne'],
  },
  fish: {
    reason: 'Il pesce è scarso nella tua dieta — è ottimo per gli omega-3.',
    examples: ['Salmone al forno', 'Tonno scottato', 'Branzino al cartoccio', 'Sgombro grigliato', 'Insalata di gamberi'],
  },
  fruit: {
    reason: 'Poca frutta questa settimana — uno spuntino a base di frutta è veloce e sano.',
    examples: ['Mela', 'Banana', 'Mix di frutti di bosco', 'Macedonia', 'Pera'],
  },
};

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const rangeParam = (searchParams.get('range') ?? 'week') as RangeParam;
    const range: RangeParam = ['day', 'week', 'month'].includes(rangeParam) ? rangeParam : 'week';

    const { from, to } = getDateRange(range);

    // Get profile for excluded_foods
    const { data: profile } = await supabase
      .from('profiles')
      .select('excluded_foods')
      .eq('id', user.id)
      .single();

    const excludedFoods: string[] = (profile?.excluded_foods as string[] | null) ?? [];

    const { data: meals, error } = await supabase
      .from('meals')
      .select('meal_items(calories, quantity, category)')
      .eq('user_id', user.id)
      .gte('consumed_at', from.toISOString())
      .lte('consumed_at', to.toISOString());

    if (error) throw error;

    // Tally calories per category (excluding 'other')
    const categoryCalories: Record<string, number> = {};
    for (const cat of CATEGORIES) categoryCalories[cat] = 0;

    for (const meal of meals ?? []) {
      for (const item of (meal.meal_items as Array<{ calories: number; quantity: number; category?: string }> ?? [])) {
        const cat = item.category ?? 'other';
        categoryCalories[cat] = (categoryCalories[cat] ?? 0) + (item.calories ?? 0) * (item.quantity ?? 1);
      }
    }

    // Find bottom 2 categories (exclude 'other')
    const scoredCategories = CATEGORIES
      .filter((cat) => cat !== 'other')
      .map((cat) => ({ cat, kcal: categoryCalories[cat] ?? 0 }))
      .sort((a, b) => a.kcal - b.kcal)
      .slice(0, 2);

    const suggestions: FoodSuggestion[] = scoredCategories.map(({ cat }) => {
      const template = SUGGESTION_TEMPLATES[cat];
      const filteredExamples = template.examples.filter(
        (ex) => !excludedFoods.some((excl) => ex.toLowerCase().includes(excl.toLowerCase()))
      );

      return {
        category: cat as FoodSuggestion['category'],
        reason: template.reason,
        examples: filteredExamples,
      };
    });

    return NextResponse.json({ range, suggestions });
  } catch (err) {
    console.error('GET /api/suggestions error:', err);
    return NextResponse.json({ error: 'Errore recupero suggerimenti' }, { status: 500 });
  }
}
