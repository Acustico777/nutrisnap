import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WeeklyClient } from './weekly-client';
import type { Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function WeeklyPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return <WeeklyClient profile={(profile ?? {}) as Profile} />;
}
