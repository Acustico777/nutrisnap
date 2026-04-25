import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { createClient } from '@/lib/supabase/server';
import type { MealItem } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json() as { source_meal_id: string; meal_type?: string };

    if (!body.source_meal_id) {
      return NextResponse.json({ error: 'source_meal_id obbligatorio' }, { status: 400 });
    }

    // Fetch source meal with items (RLS ensures ownership)
    const { data: source, error: fetchError } = await supabase
      .from('meals')
      .select('*, meal_items(*)')
      .eq('id', body.source_meal_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !source) {
      return NextResponse.json({ error: 'Pasto sorgente non trovato' }, { status: 404 });
    }

    // Insert new meal
    const { data: meal, error: mealError } = await supabase
      .from('meals')
      .insert({
        user_id: user.id,
        photo_url: source.photo_url,
        meal_type: body.meal_type ?? source.meal_type,
        total_calories: source.total_calories,
        total_protein_g: source.total_protein_g,
        total_carbs_g: source.total_carbs_g,
        total_fat_g: source.total_fat_g,
        notes: source.notes,
        consumed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (mealError) throw mealError;

    // Duplicate meal items
    const sourceItems: MealItem[] = (source.meal_items as MealItem[]) ?? [];
    if (sourceItems.length > 0) {
      const duplicatedItems = sourceItems.map((item) => ({
        meal_id: meal.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        category: item.category,
        fiber_g: item.fiber_g ?? null,
        sugar_g: item.sugar_g ?? null,
        sodium_mg: item.sodium_mg ?? null,
      }));

      const { error: itemsError } = await supabase.from('meal_items').insert(duplicatedItems);
      if (itemsError) throw itemsError;
    }

    return NextResponse.json({ meal }, { status: 201 });
  } catch (err) {
    console.error('POST /api/meals/duplicate error:', err);
    return NextResponse.json({ error: 'Errore duplicazione pasto' }, { status: 500 });
  }
}
