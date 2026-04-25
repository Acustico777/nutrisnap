import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';
import { inferCategory } from '@/lib/categories';
import type { AnalyzedFoodItem } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { data: meal, error } = await supabase
      .from('meals')
      .select('*, meal_items(*)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error || !meal) return NextResponse.json({ error: 'Pasto non trovato' }, { status: 404 });

    return NextResponse.json({ meal });
  } catch (err) {
    console.error('GET /api/meals/[id] error:', err);
    return NextResponse.json({ error: 'Errore recupero pasto' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json() as {
      items?: AnalyzedFoodItem[];
      mealType?: string;
      notes?: string;
    };

    const updateData: Record<string, unknown> = {};

    if (body.mealType !== undefined) updateData.meal_type = body.mealType;
    if (body.notes !== undefined) updateData.notes = body.notes;

    if (body.items && body.items.length > 0) {
      const totals = body.items.reduce(
        (acc, item) => ({
          calories: acc.calories + item.calories * item.quantity,
          protein_g: acc.protein_g + item.protein_g * item.quantity,
          carbs_g: acc.carbs_g + item.carbs_g * item.quantity,
          fat_g: acc.fat_g + item.fat_g * item.quantity,
        }),
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
      );

      updateData.total_calories = totals.calories;
      updateData.total_protein_g = totals.protein_g;
      updateData.total_carbs_g = totals.carbs_g;
      updateData.total_fat_g = totals.fat_g;

      // Delete existing items
      const { error: deleteError } = await supabase
        .from('meal_items')
        .delete()
        .eq('meal_id', params.id);
      if (deleteError) throw deleteError;

      // Re-insert items
      const mealItems = body.items.map((item) => ({
        meal_id: params.id,
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

      const { error: insertError } = await supabase.from('meal_items').insert(mealItems);
      if (insertError) throw insertError;
    }

    const { data: meal, error } = await supabase
      .from('meals')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ meal });
  } catch (err) {
    console.error('PATCH /api/meals/[id] error:', err);
    return NextResponse.json({ error: 'Errore aggiornamento pasto' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/meals/[id] error:', err);
    return NextResponse.json({ error: 'Errore eliminazione pasto' }, { status: 500 });
  }
}
