import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { AnalyzedFoodItem } from '@/lib/types';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabase
      .from('meals')
      .select('*, meal_items(*)')
      .eq('user_id', user.id)
      .order('consumed_at', { ascending: false });

    if (from) query = query.gte('consumed_at', from);
    if (to) query = query.lt('consumed_at', to);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ meals: data });
  } catch (err) {
    console.error('GET /api/meals error:', err);
    return NextResponse.json({ error: 'Errore recupero pasti' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json() as {
      items: AnalyzedFoodItem[];
      mealType: string;
      notes?: string;
      photoBase64?: string;
      photoMimeType?: string;
    };

    const { items, mealType, notes, photoBase64, photoMimeType } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Nessun alimento' }, { status: 400 });
    }

    // Upload photo if provided
    let photoUrl: string | null = null;
    if (photoBase64) {
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const ext = (photoMimeType ?? 'image/jpeg').includes('png') ? 'png' : 'jpg';
      const filename = `${user.id}/${randomUUID()}.${ext}`;
      const buffer = Buffer.from(photoBase64, 'base64');

      const { error: uploadError } = await serviceSupabase.storage
        .from('meal-photos')
        .upload(filename, buffer, {
          contentType: photoMimeType ?? 'image/jpeg',
          upsert: false,
        });

      if (!uploadError) {
        const { data: urlData } = serviceSupabase.storage
          .from('meal-photos')
          .getPublicUrl(filename);
        photoUrl = urlData.publicUrl;
      }
    }

    // Calculate totals
    const totals = items.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories * item.quantity,
        protein_g: acc.protein_g + item.protein_g * item.quantity,
        carbs_g: acc.carbs_g + item.carbs_g * item.quantity,
        fat_g: acc.fat_g + item.fat_g * item.quantity,
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );

    // Insert meal
    const { data: meal, error: mealError } = await supabase
      .from('meals')
      .insert({
        user_id: user.id,
        photo_url: photoUrl,
        meal_type: mealType,
        total_calories: totals.calories,
        total_protein_g: totals.protein_g,
        total_carbs_g: totals.carbs_g,
        total_fat_g: totals.fat_g,
        notes: notes ?? null,
        consumed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (mealError) throw mealError;

    // Insert meal items
    const mealItems = items.map((item) => ({
      meal_id: meal.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
    }));

    const { error: itemsError } = await supabase.from('meal_items').insert(mealItems);
    if (itemsError) throw itemsError;

    return NextResponse.json({ meal }, { status: 201 });
  } catch (err) {
    console.error('POST /api/meals error:', err);
    return NextResponse.json({ error: 'Errore salvataggio pasto' }, { status: 500 });
  }
}
