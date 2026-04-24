import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PlanViewClient } from './plan-client';
import type { Profile, WorkoutPlan } from '@/lib/types';

export default async function WorkoutPlanPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: planData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ]);

  return (
    <PlanViewClient
      plan={(planData as WorkoutPlan | null) ?? null}
      profile={profile as Profile}
    />
  );
}
