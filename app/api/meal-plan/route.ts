import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { openai, MEAL_PLAN_PROMPT } from '@/lib/openai';
import { GLUTEN_FOODS } from '@/lib/nutrition';
import type { MealPlan } from '@/lib/types';

interface MealPlanData {
  days: Array<{
    day_label: string;
    meals: Array<{
      meal_type: string;
      name: string;
      description: string;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      ingredients: string[];
    }>;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json() as {
      plan_type: 'daily' | 'weekly';
      diet_preference?: string;
      target_calories?: number;
    };

    const { plan_type } = body;
    if (!plan_type || !['daily', 'weekly'].includes(plan_type)) {
      return NextResponse.json({ error: 'plan_type non valido (daily|weekly)' }, { status: 400 });
    }

    // Get profile defaults
    const { data: profile } = await supabase
      .from('profiles')
      .select('diet_preference, excluded_foods, tdee')
      .eq('id', user.id)
      .single();

    const diet_preference = body.diet_preference ?? (profile?.diet_preference as string | null) ?? 'none';
    const target_calories = body.target_calories ?? (profile?.tdee as number | null) ?? 2000;
    const profileExcluded: string[] = (profile?.excluded_foods as string[] | null) ?? [];
    // Automatically add gluten foods for celiac users
    const excluded_foods: string[] = diet_preference === 'celiac'
      ? Array.from(new Set([...profileExcluded, ...GLUTEN_FOODS]))
      : profileExcluded;

    const userMessage = JSON.stringify({
      plan_type,
      target_calories,
      diet_preference,
      excluded_foods,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: MEAL_PLAN_PROMPT },
        { role: 'user', content: userMessage },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    let planData: MealPlanData;
    try {
      planData = JSON.parse(raw) as MealPlanData;
    } catch {
      return NextResponse.json({ error: 'Risposta AI non valida. Riprova.' }, { status: 502 });
    }

    if (!planData.days || !Array.isArray(planData.days)) {
      return NextResponse.json({ error: 'Piano generato non valido. Riprova.' }, { status: 502 });
    }

    const { data: plan, error: insertError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: user.id,
        plan_type,
        diet_preference,
        target_calories,
        plan_data: planData,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ plan }, { status: 201 });
  } catch (err) {
    console.error('POST /api/meal-plan error:', err);
    return NextResponse.json({ error: 'Errore generazione piano alimentare' }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { data: plan, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ plan: plan as MealPlan | null });
  } catch (err) {
    console.error('GET /api/meal-plan error:', err);
    return NextResponse.json({ error: 'Errore recupero piano alimentare' }, { status: 500 });
  }
}
