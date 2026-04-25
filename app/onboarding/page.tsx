import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';
import { OnboardingClient } from './onboarding-client';

export default async function OnboardingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Se già onboarded, vai alla dashboard
  if (profile?.onboarding_completed === true) {
    redirect('/dashboard');
  }

  return <OnboardingClient profile={profile as Profile | null} />;
}
