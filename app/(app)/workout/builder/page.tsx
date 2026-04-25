import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BuilderClient } from './builder-client';
import type { Exercise } from '@/lib/types';

export default async function WorkoutBuilderPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: exercises } = await supabase
    .from('exercises')
    .select('*')
    .order('name_it');

  return <BuilderClient exercises={(exercises ?? []) as Exercise[]} />;
}
