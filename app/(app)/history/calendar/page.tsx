import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CalendarClient } from './calendar-client';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <CalendarClient />;
}
