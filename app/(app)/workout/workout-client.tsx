'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Dumbbell, BookOpen, ClipboardList, Loader2, AlertCircle, Wrench, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GOAL_LABELS } from '@/lib/nutrition';
import type { Profile, WorkoutPlan } from '@/lib/types';

interface Props {
  profile: Profile;
}

const DAYS_OPTIONS = [1, 2, 3, 4, 5, 6];

const SEX_LABELS: Record<string, string> = {
  male: 'Uomo',
  female: 'Donna',
};

function isProfileComplete(profile: Profile): boolean {
  return !!(profile.weight_kg && profile.height_cm && profile.sex && profile.age);
}

export function WorkoutClient({ profile }: Props) {
  const router = useRouter();
  const [daysPerWeek, setDaysPerWeek] = useState<number>(profile.days_per_week ?? 3);
  const [location, setLocation] = useState<'gym' | 'home'>(profile.workout_location ?? 'gym');
  const [generating, setGenerating] = useState(false);
  const [latestPlan, setLatestPlan] = useState<WorkoutPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  useEffect(() => {
    async function loadPlan() {
      try {
        const res = await fetch('/api/workout-plan');
        const data = await res.json() as { plan: WorkoutPlan | null; error?: string };
        if (res.ok && !data.error) setLatestPlan(data.plan);
      } catch {
        // silently ignore
      } finally {
        setLoadingPlan(false);
      }
    }
    loadPlan();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch('/api/workout-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days_per_week: daysPerWeek,
          location,
          goal: profile.goal ?? 'maintain',
          name: `Piano ${new Date().toLocaleDateString('it-IT')}`,
        }),
      });
      const data = await res.json() as { plan: WorkoutPlan; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? 'Errore generazione piano');
      toast.success('Scheda generata!');
      router.push('/workout/plan');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante la generazione');
    } finally {
      setGenerating(false);
    }
  }

  const complete = isProfileComplete(profile);

  return (
    <div className="mx-auto max-w-md md:max-w-3xl px-4 pt-8 pb-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-primary-500" />
          <h1 className="text-2xl font-bold text-foreground">Workout</h1>
        </div>
        <p className="text-sm text-muted-foreground">Allenamento personalizzato</p>
      </motion.div>

      {/* Quick links */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="grid grid-cols-2 gap-3"
      >
        <Link
          href="/workout/library"
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-4 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
        >
          <BookOpen className="h-5 w-5 text-primary-500" />
          Libreria esercizi
        </Link>
        {latestPlan ? (
          <Link
            href="/workout/plan"
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-primary-500/40 bg-primary-500/10 px-3 py-4 text-sm font-medium text-primary-500 hover:bg-primary-500/20 transition-colors"
          >
            <ClipboardList className="h-5 w-5" />
            Vedi piano
          </Link>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground cursor-not-allowed opacity-60">
            <ClipboardList className="h-5 w-5" />
            Nessun piano
          </div>
        )}
        <Link
          href="/workout/builder"
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-4 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
        >
          <Wrench className="h-5 w-5 text-primary-500" />
          Crea piano custom
        </Link>
        <Link
          href="/workout/history"
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-4 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
        >
          <History className="h-5 w-5 text-primary-500" />
          Storico allenamenti
        </Link>
      </motion.div>

      {/* Profile summary */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="rounded-2xl border border-border bg-card p-4"
      >
        <h2 className="text-sm font-semibold text-foreground mb-2">Profilo attuale</h2>
        {complete ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>Sesso: <strong className="text-foreground">{SEX_LABELS[profile.sex!] ?? '—'}</strong></span>
            <span>Peso: <strong className="text-foreground">{profile.weight_kg} kg</strong></span>
            <span>Altezza: <strong className="text-foreground">{profile.height_cm} cm</strong></span>
            <span>Età: <strong className="text-foreground">{profile.age} anni</strong></span>
            <span>Obiettivo: <strong className="text-foreground">{GOAL_LABELS[profile.goal] ?? '—'}</strong></span>
          </div>
        ) : (
          <div className="flex items-start gap-2 text-sm text-amber-400">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              Completa il profilo nelle{' '}
              <Link href="/settings" className="underline font-medium">
                Impostazioni
              </Link>{' '}
              per generare il piano.
            </span>
          </div>
        )}
      </motion.div>

      {/* Generation form (only if profile complete) */}
      {complete && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="rounded-2xl border border-border bg-card p-5 space-y-5"
        >
          <h2 className="text-base font-semibold text-foreground">Genera scheda</h2>

          {/* Days per week */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Giorni di allenamento / settimana</p>
            <div className="flex gap-2 flex-wrap">
              {DAYS_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDaysPerWeek(d)}
                  className={`h-10 w-10 rounded-xl text-sm font-bold border transition-colors ${
                    daysPerWeek === d
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'border-border text-foreground hover:border-primary-500/50'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Luogo</p>
            <div className="flex rounded-xl border border-border p-1 gap-1">
              {(['gym', 'home'] as const).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location === loc
                      ? 'bg-primary-500 text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {loc === 'gym' ? 'Palestra' : 'Casa (a corpo libero)'}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generazione in corso…</>
            ) : (
              <><Dumbbell className="mr-2 h-4 w-4" /> Genera scheda</>
            )}
          </Button>
        </motion.div>
      )}

      {/* Latest plan card */}
      {!loadingPlan && latestPlan && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="rounded-2xl border border-border bg-card p-4"
        >
          <h2 className="text-sm font-semibold text-foreground mb-1">Tuo ultimo piano</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Creato il {new Date(latestPlan.created_at).toLocaleDateString('it-IT')}
            {latestPlan.days_per_week && ` · ${latestPlan.days_per_week} giorni/settimana`}
            {latestPlan.location && ` · ${latestPlan.location === 'gym' ? 'Palestra' : 'Casa'}`}
          </p>
          <Link
            href="/workout/plan"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-500 hover:underline"
          >
            <ClipboardList className="h-4 w-4" />
            Vedi piano →
          </Link>
        </motion.div>
      )}
    </div>
  );
}
