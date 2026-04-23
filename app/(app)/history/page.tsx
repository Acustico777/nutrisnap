import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { HistoryClient } from './history-client';
import type { Meal } from '@/lib/types';

export default async function HistoryPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const { data: meals } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', user.id)
    .gte('consumed_at', monthAgo.toISOString())
    .order('consumed_at', { ascending: false });

  return <HistoryClient meals={(meals ?? []) as Meal[]} />;
}
