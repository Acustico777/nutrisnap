import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { ADMIN_EMAILS } from '@/lib/constants';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: string; inviteCode?: string };
    const { email, inviteCode } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email richiesta' }, { status: 400 });
    }

    // Admin email bypass
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      return NextResponse.json({ valid: true, skipInvite: true });
    }

    if (!inviteCode) {
      return NextResponse.json({ error: 'Codice invito richiesto' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: code, error } = await serviceSupabase
      .from('invite_codes')
      .select('*')
      .eq('code', inviteCode.toUpperCase())
      .single();

    if (error || !code) {
      return NextResponse.json({ error: 'Codice invito non trovato' }, { status: 400 });
    }

    if (code.used_by) {
      return NextResponse.json({ error: 'Codice invito già utilizzato' }, { status: 400 });
    }

    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Codice invito scaduto' }, { status: 400 });
    }

    return NextResponse.json({ valid: true });
  } catch (err) {
    console.error('validate-invite error:', err);
    return NextResponse.json({ error: 'Errore validazione' }, { status: 500 });
  }
}
