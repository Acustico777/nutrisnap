import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { HistoryClient } from './history-client';
import type { WorkoutSession, WorkoutSessionSet } from '@/lib/types';

export default async function WorkoutHistoryPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('workout_sessions')
    .select('*, workout_session_sets(*)')
    .eq('user_id', user.id)
    .not('completed_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(100);

  const sessions = (data ?? []).map((s) => ({
    ...s,
    workout_session_sets: [...(s.workout_session_sets ?? [])].sort(
      (a: WorkoutSessionSet, b: WorkoutSessionSet) => a.set_number - b.set_number
    ),
  })) as Array<WorkoutSession & { workout_session_sets: WorkoutSessionSet[] }>;

  return <HistoryClient sessions={sessions} />;
}
