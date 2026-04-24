import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { openai, FOOD_ESTIMATION_PROMPT } from '@/lib/openai';

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

    const body = await req.json() as { name?: string; grams?: number };
    const { name, grams } = body;

    if (!name || !grams) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti: name, grams' }, { status: 400 });
    }

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
    let parsed: EstimatedFood;
    try {
      parsed = JSON.parse(raw) as EstimatedFood;
    } catch {
      return NextResponse.json({ error: 'Risposta AI non valida. Riprova.' }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('POST /api/estimate-food error:', err);
    return NextResponse.json({ error: 'Errore stima valori nutrizionali' }, { status: 500 });
  }
}
