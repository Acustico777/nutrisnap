'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ClipboardList, Download, RefreshCw, Dumbbell, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GOAL_LABELS } from '@/lib/nutrition';
import type { Profile, WorkoutPlan } from '@/lib/types';

interface Props {
  plan: WorkoutPlan | null;
  profile: Profile;
}

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Petto', back: 'Schiena', shoulders: 'Spalle',
  biceps: 'Bicipiti', triceps: 'Tricipiti', forearms: 'Avambracci',
  abs: 'Addominali', quadriceps: 'Quadricipiti', hamstrings: 'Femorali',
  glutes: 'Glutei', calves: 'Polpacci', traps: 'Trapezi', full_body: 'Corpo intero',
};

export function PlanViewClient({ plan: initialPlan, profile }: Props) {
  const router = useRouter();
  const [plan] = useState<WorkoutPlan | null>(initialPlan);
  const [deleting, setDeleting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  async function handleDelete() {
    if (!plan) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/workout-plan/${plan.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Piano eliminato');
      router.push('/workout');
      router.refresh();
    } catch {
      toast.error('Impossibile eliminare il piano');
      setDeleting(false);
    }
  }

  async function handleDownloadPDF() {
    if (!plan) return;
    setGeneratingPdf(true);
    try {
      const { generateWorkoutPDF } = await import('@/lib/pdf');
      generateWorkoutPDF(plan, profile);
    } catch {
      toast.error('Errore nella generazione del PDF');
    } finally {
      setGeneratingPdf(false);
    }
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-md px-4 pt-8 pb-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary-500" />
            <h1 className="text-2xl font-bold text-foreground">Piano di allenamento</h1>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center"
        >
          <Dumbbell className="h-12 w-12 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Nessun piano ancora</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Genera il tuo primo piano di allenamento</p>
          </div>
          <Link href="/workout">
            <Button className="mt-2">Genera scheda</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-8 pb-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary-500" />
            <h1 className="text-2xl font-bold text-foreground">Piano di allenamento</h1>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {plan.goal && <span>{GOAL_LABELS[plan.goal]}</span>}
            {plan.days_per_week && <span>{plan.days_per_week} giorni/settimana</span>}
            {plan.location && <span>{plan.location === 'gym' ? 'Palestra' : 'Casa'}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDownloadPDF}
          disabled={generatingPdf}
          title="Scarica PDF"
          className="flex-shrink-0 flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
        >
          <Download className="h-4 w-4 text-primary-500" />
          PDF
        </button>
      </motion.div>

      {/* Days */}
      <div className="space-y-4">
        {plan.plan_data.days.map((day, di) => (
          <motion.div
            key={day.day_label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: di * 0.07 }}
            className="rounded-2xl border border-border bg-card overflow-hidden"
          >
            {/* Day header */}
            <div className="bg-muted/30 px-4 py-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">{day.day_label}</h3>
              {day.muscle_focus.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {day.muscle_focus.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-primary-500/10 px-2 py-0.5 text-[10px] font-medium text-primary-500"
                    >
                      {MUSCLE_LABELS[m] ?? m}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Exercise list */}
            <div className="divide-y divide-border">
              {day.exercises.map((ex, ei) => (
                <div key={ei} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{ex.exercise_name}</p>
                    <p className="text-xs text-muted-foreground">{MUSCLE_LABELS[ex.muscle_group] ?? ex.muscle_group}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <span className="rounded-lg border border-border bg-muted/30 px-2 py-1 text-[10px] font-medium text-foreground">
                      {ex.sets}×{ex.reps}
                    </span>
                    <span className="rounded-lg border border-border bg-muted/30 px-2 py-1 text-[10px] font-medium text-muted-foreground">
                      {ex.rest_sec}s
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Link to library */}
            <div className="px-4 py-2 border-t border-border">
              <Link
                href="/workout/library"
                className="flex items-center gap-1 text-xs text-primary-500 hover:underline"
              >
                Sfoglia esercizi correlati
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Rigenera */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={deleting}
          className="w-full"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${deleting ? 'animate-spin' : ''}`} />
          {deleting ? 'Eliminazione…' : 'Rigenera scheda'}
        </Button>
      </motion.div>
    </div>
  );
}
