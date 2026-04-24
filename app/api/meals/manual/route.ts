import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { openai, FOOD_ESTIMATION_PROMPT } from '@/lib/openai';
import { inferCategory } from '@/lib/categories';

interface EstimatedFood {
  name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  category: 'vegetables' | 'meat' | 'fish' | 'fruit' | 'other';
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json() as {
      name: string;
      grams: number;
      calories?: number | null;
      mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      notes?: string;
    };

    const { name, grams, mealType, notes } = body;
    const rawCalories = body.calories;

    if (!name || !grams || !mealType) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti: name, grams, mealType' }, { status: 400 });
    }

    let calories: number;
    let protein_g = 0;
    let carbs_g = 0;
    let fat_g = 0;
    let category: 'vegetables' | 'meat' | 'fish' | 'fruit' | 'other' = inferCategory(name);

    if (!rawCalories) {
      // Call OpenAI to estimate
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: FOOD_ESTIMATION_PROMPT },
          { role: 'user', content: `Food: ${name}, Grams: ${grams}` },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      let estimated: EstimatedFood;
      try {
        estimated = JSON.parse(raw) as EstimatedFood;
      } catch {
        return NextResponse.json({ error: 'Risposta AI non valida. Riprova.' }, { status: 502 });
      }

      calories = estimated.calories ?? 0;
      protein_g = estimated.protein_g ?? 0;
      carbs_g = estimated.carbs_g ?? 0;
      fat_g = estimated.fat_g ?? 0;
      category = estimated.category ?? inferCategory(name);
    } else {
      calories = rawCalories;
    }

    // Insert meal
    const { data: meal, error: mealError } = await supabase
      .from('meals')
      .insert({
        user_id: user.id,
        photo_url: null,
        meal_type: mealType,
        total_calories: calories,
        total_protein_g: protein_g,
        total_carbs_g: carbs_g,
        total_fat_g: fat_g,
        notes: notes ?? null,
        consumed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (mealError) throw mealError;

    // Insert single meal item
    const { error: itemsError } = await supabase.from('meal_items').insert({
      meal_id: meal.id,
      name,
      quantity: 1,
      unit: 'porzione',
      calories,
      protein_g,
      carbs_g,
      fat_g,
      category,
    });

    if (itemsError) throw itemsError;

    return NextResponse.json({ meal }, { status: 201 });
  } catch (err) {
    console.error('POST /api/meals/manual error:', err);
    return NextResponse.json({ error: 'Errore salvataggio pasto manuale' }, { status: 500 });
  }
}
