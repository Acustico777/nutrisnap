import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { createClient } from '@/lib/supabase/server';
import { inferCategory } from '@/lib/categories';
import type { MealItem } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json() as { favorite_id: string; meal_type?: string };

    if (!body.favorite_id) {
      return NextResponse.json({ error: 'favorite_id obbligatorio' }, { status: 400 });
    }

    // Fetch favorite (RLS ensures ownership)
    const { data: fav, error: fetchError } = await supabase
      .from('favorite_meals')
      .select('*')
      .eq('id', body.favorite_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !fav) {
      return NextResponse.json({ error: 'Preferito non trovato' }, { status: 404 });
    }

    const items: MealItem[] = (fav.items_json as MealItem[]) ?? [];

    // Insert new meal
    const { data: meal, error: mealError } = await supabase
      .from('meals')
      .insert({
        user_id: user.id,
        photo_url: null,
        meal_type: body.meal_type ?? 'lunch',
        total_calories: fav.total_calories ?? 0,
        total_protein_g: fav.total_protein_g ?? 0,
        total_carbs_g: fav.total_carbs_g ?? 0,
        total_fat_g: fav.total_fat_g ?? 0,
        notes: fav.name,
        consumed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (mealError) throw mealError;

    if (items.length > 0) {
      const mealItems = items.map((item) => ({
        meal_id: meal.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        category: item.category ?? inferCategory(item.name),
        fiber_g: item.fiber_g ?? null,
        sugar_g: item.sugar_g ?? null,
        sodium_mg: item.sodium_mg ?? null,
      }));

      const { error: itemsError } = await supabase.from('meal_items').insert(mealItems);
      if (itemsError) throw itemsError;
    }

    return NextResponse.json({ meal }, { status: 201 });
  } catch (err) {
    console.error('POST /api/meals/from-favorite error:', err);
    return NextResponse.json({ error: 'Errore aggiunta pasto preferito' }, { status: 500 });
  }
}
