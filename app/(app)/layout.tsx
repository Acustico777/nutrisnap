import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BottomNav } from '@/components/bottom-nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Controlla se l'utente ha completato l'onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed, path_preference')
    .eq('id', user.id)
    .single();

  // Se il profilo esiste ma onboarding non è completato, reindirizza
  if (profile && profile.onboarding_completed === false) {
    redirect('/onboarding');
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 pb-24">{children}</main>
      <BottomNav pathPreference={(profile?.path_preference ?? null) as 'nutrition' | 'workout' | 'both' | null} />
    </div>
  );
}
