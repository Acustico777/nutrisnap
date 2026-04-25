import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { EditMealClient } from './edit-client';
import type { Meal } from '@/lib/types';

export default async function EditMealPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: meal } = await supabase
    .from('meals')
    .select('*, meal_items(*)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!meal) notFound();

  return <EditMealClient meal={meal as Meal} />;
}
