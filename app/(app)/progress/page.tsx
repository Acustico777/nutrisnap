import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProgressClient } from './progress-client';
import type { Profile, WeightLog } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ProgressPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: logs }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .order('logged_at', { ascending: true }),
  ]);

  return (
    <ProgressClient
      profile={(profile ?? {}) as Profile}
      initialLogs={(logs ?? []) as WeightLog[]}
    />
  );
}
