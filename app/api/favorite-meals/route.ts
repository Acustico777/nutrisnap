import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { createClient } from '@/lib/supabase/server';
import type { MealItem } from '@/lib/types';

export async function GET(_req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { data, error } = await supabase
      .from('favorite_meals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ favorites: data });
  } catch (err) {
    console.error('GET /api/favorite-meals error:', err);
    return NextResponse.json({ error: 'Errore recupero preferiti' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json() as {
      name: string;
      items_json: MealItem[];
      total_calories: number;
      total_protein_g: number;
      total_carbs_g: number;
      total_fat_g: number;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('favorite_meals')
      .insert({
        user_id: user.id,
        name: body.name.trim(),
        items_json: body.items_json,
        total_calories: body.total_calories,
        total_protein_g: body.total_protein_g,
        total_carbs_g: body.total_carbs_g,
        total_fat_g: body.total_fat_g,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ favorite: data }, { status: 201 });
  } catch (err) {
    console.error('POST /api/favorite-meals error:', err);
    return NextResponse.json({ error: 'Errore salvataggio preferito' }, { status: 500 });
  }
}
