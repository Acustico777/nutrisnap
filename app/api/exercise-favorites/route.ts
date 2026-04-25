import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { data, error } = await supabase
      .from('exercise_favorites')
      .select('exercise_id, created_at, exercises(*)')
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ favorites: data ?? [] });
  } catch (err) {
    console.error('GET /api/exercise-favorites error:', err);
    return NextResponse.json({ error: 'Errore recupero preferiti' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json() as { exercise_id: string };
    if (!body.exercise_id) {
      return NextResponse.json({ error: 'exercise_id è obbligatorio' }, { status: 400 });
    }

    const { error } = await supabase
      .from('exercise_favorites')
      .upsert({ user_id: user.id, exercise_id: body.exercise_id }, { onConflict: 'user_id,exercise_id' });

    if (error) throw error;

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('POST /api/exercise-favorites error:', err);
    return NextResponse.json({ error: 'Errore aggiunta preferito' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json() as { exercise_id: string };
    if (!body.exercise_id) {
      return NextResponse.json({ error: 'exercise_id è obbligatorio' }, { status: 400 });
    }

    const { error } = await supabase
      .from('exercise_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('exercise_id', body.exercise_id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/exercise-favorites error:', err);
    return NextResponse.json({ error: 'Errore rimozione preferito' }, { status: 500 });
  }
}
