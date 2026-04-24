import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WorkoutClient } from './workout-client';
import type { Profile } from '@/lib/types';

export default async function WorkoutPage() {
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

  return <WorkoutClient profile={profile as Profile} />;
}
