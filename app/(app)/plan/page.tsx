import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PlanClient } from './plan-client';
import type { Profile } from '@/lib/types';

export default async function PlanPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return <PlanClient profile={profile as Profile} />;
}
