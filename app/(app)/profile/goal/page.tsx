import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GoalClient } from './goal-client';
import type { Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ProfileGoalPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/onboarding');

  return <GoalClient profile={profile as Profile} />;
}
