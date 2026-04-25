import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    let from: string;
    let to: string;

    if (dateParam) {
      from = `${dateParam}T00:00:00.000Z`;
      to = `${dateParam}T23:59:59.999Z`;
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      from = today.toISOString();
      to = tomorrow.toISOString();
    }

    const { data, error } = await supabase
      .from('water_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', from)
      .lt('logged_at', to)
      .order('logged_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ logs: data });
  } catch (err) {
    console.error('GET /api/water-logs error:', err);
    return NextResponse.json({ error: 'Errore recupero log acqua' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json() as { amount_ml: number; logged_at?: string };

    if (!body.amount_ml || body.amount_ml <= 0) {
      return NextResponse.json({ error: 'amount_ml non valido' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('water_logs')
      .insert({
        user_id: user.id,
        amount_ml: body.amount_ml,
        logged_at: body.logged_at ?? new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ log: data }, { status: 201 });
  } catch (err) {
    console.error('POST /api/water-logs error:', err);
    return NextResponse.json({ error: 'Errore salvataggio log acqua' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id obbligatorio' }, { status: 400 });

    const { error } = await supabase
      .from('water_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/water-logs error:', err);
    return NextResponse.json({ error: 'Errore eliminazione log acqua' }, { status: 500 });
  }
}
