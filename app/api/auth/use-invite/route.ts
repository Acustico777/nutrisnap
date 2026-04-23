import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { ADMIN_EMAILS } from '@/lib/constants';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: string; inviteCode?: string };
    const { email, inviteCode } = body;

    if (!email || !inviteCode) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find the user by email
    const { data: usersData } = await serviceSupabase.auth.admin.listUsers();
    const user = usersData?.users?.find((u) => u.email === email);

    if (!user) {
      // User hasn't confirmed yet — skip for now
      return NextResponse.json({ success: true });
    }

    // Mark invite as used
    await serviceSupabase
      .from('invite_codes')
      .update({ used_by: user.id, used_at: new Date().toISOString() })
      .eq('code', inviteCode.toUpperCase());

    // Set admin flag if needed
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      await serviceSupabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('use-invite error:', err);
    return NextResponse.json({ error: 'Errore aggiornamento invito' }, { status: 500 });
  }
}
