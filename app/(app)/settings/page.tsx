import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsClient } from './settings-client';
import type { Profile, InviteCode } from '@/lib/types';

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  let inviteCodes: InviteCode[] = [];
  if (profile?.is_admin) {
    const { data } = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false });
    inviteCodes = (data ?? []) as InviteCode[];
  }

  return (
    <SettingsClient
      profile={profile as Profile}
      inviteCodes={inviteCodes}
    />
  );
}
