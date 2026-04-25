import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FavoritesClient } from './favorites-client';
import type { FavoriteMeal } from '@/lib/types';

export default async function FavoritesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: favorites } = await supabase
    .from('favorite_meals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return <FavoritesClient favorites={(favorites ?? []) as FavoriteMeal[]} />;
}
