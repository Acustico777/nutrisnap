import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SessionClient } from './session-client';
import type { Profile, WorkoutSession, WorkoutSessionSet } from '@/lib/types';

export default async function WorkoutSessionPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: sessionData }, { data: profile }] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('*, workout_session_sets(*)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ]);

  if (!sessionData) redirect('/workout');

  const session: WorkoutSession & { workout_session_sets: WorkoutSessionSet[] } = {
    ...sessionData,
    workout_session_sets: [...(sessionData.workout_session_sets ?? [])].sort(
      (a: WorkoutSessionSet, b: WorkoutSessionSet) => a.set_number - b.set_number
    ),
  };

  return <SessionClient session={session} profile={profile as Profile} />;
}
