'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Dumbbell, CheckCircle2, Circle, Plus, Flag, Clock, ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RestTimer } from '@/components/rest-timer';
import type { Profile, WorkoutSession, WorkoutSessionSet } from '@/lib/types';

interface Props {
  session: WorkoutSession & { workout_session_sets: WorkoutSessionSet[] };
  profile: Profile;
}

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Petto', back: 'Schiena', shoulders: 'Spalle',
  biceps: 'Bicipiti', triceps: 'Tricipiti', forearms: 'Avambracci',
  abs: 'Addominali', quadriceps: 'Quadricipiti', hamstrings: 'Femorali',
  glutes: 'Glutei', calves: 'Polpacci', traps: 'Trapezi', full_body: 'Corpo intero',
};

const RPE_OPTIONS = [6, 7, 8, 9, 10];

function groupSetsByExercise(sets: WorkoutSessionSet[]) {
  const map = new Map<string, WorkoutSessionSet[]>();
  for (const s of sets) {
    const existing = map.get(s.exercise_name) ?? [];
    existing.push(s);
    map.set(s.exercise_name, existing);
  }
  return map;
}

export function SessionClient({ session: initialSession, profile: _profile }: Props) {
  const router = useRouter();
  const isReadOnly = initialSession.completed_at !== null;

  const [sets, setSets] = useState<WorkoutSessionSet[]>(initialSession.workout_session_sets);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishNotes, setFinishNotes] = useState(initialSession.notes ?? '');
  const debounceMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Elapsed timer
  useEffect(() => {
    if (isReadOnly) return;
    const start = new Date(initialSession.started_at).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [initialSession.started_at, isReadOnly]);

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const patchSet = useCallback(async (setId: string, payload: Partial<WorkoutSessionSet>) => {
    try {
      const res = await fetch(`/api/workout-sessions/${initialSession.id}/sets/${setId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Errore salvataggio set');
    }
  }, [initialSession.id]);

  const debouncePatch = useCallback((setId: string, payload: Partial<WorkoutSessionSet>) => {
    const existing = debounceMap.current.get(setId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => patchSet(setId, payload), 500);
    debounceMap.current.set(setId, t);
  }, [patchSet]);

  function updateSet(setId: string, field: keyof WorkoutSessionSet, value: WorkoutSessionSet[keyof WorkoutSessionSet]) {
    setSets((prev) =>
      prev.map((s) => (s.id === setId ? { ...s, [field]: value } : s))
    );
    debouncePatch(setId, { [field]: value });
  }

  async function handleToggleComplete(set: WorkoutSessionSet) {
    const newVal = !set.completed;
    updateSet(set.id, 'completed', newVal);
    if (newVal) setShowRestTimer(true);
  }

  async function handleAddSet(exerciseName: string, muscleGroup: string | null) {
    const exerciseSets = sets.filter((s) => s.exercise_name === exerciseName);
    const maxNum = exerciseSets.reduce((m, s) => Math.max(m, s.set_number), 0);
    try {
      const res = await fetch(`/api/workout-sessions/${initialSession.id}/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_name: exerciseName,
          muscle_group: muscleGroup,
          set_number: maxNum + 1,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { set: WorkoutSessionSet };
        setSets((prev) => [...prev, data.set]);
      } else {
        toast.error('Errore aggiunta set');
      }
    } catch {
      toast.error('Errore aggiunta set');
    }
  }

  async function handleFinish() {
    setFinishing(true);
    try {
      const res = await fetch(`/api/workout-sessions/${initialSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed_at: new Date().toISOString(),
          notes: finishNotes || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Allenamento completato!');
      router.push('/workout/history');
    } catch {
      toast.error('Errore nel completare l\'allenamento');
      setFinishing(false);
    }
  }

  const exerciseMap = groupSetsByExercise(sets);

  const completedCount = sets.filter((s) => s.completed).length;
  const totalCount = sets.length;

  // Read-only: completion date formatted
  const completedDate = initialSession.completed_at
    ? new Date(initialSession.completed_at).toLocaleDateString('it-IT', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : null;

  return (
    <div className="mx-auto max-w-md px-4 pt-6 pb-32 space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Indietro
        </button>

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary-500" />
              <h1 className="text-xl font-bold text-foreground">
                {initialSession.day_label ?? 'Allenamento'}
              </h1>
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{new Date(initialSession.started_at).toLocaleDateString('it-IT')}</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {completedCount}/{totalCount} set
              </span>
            </div>
          </div>
          {!isReadOnly && (
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-mono font-medium text-foreground">
              <Clock className="h-3.5 w-3.5 text-primary-500" />
              {formatElapsed(elapsed)}
            </div>
          )}
        </div>

        {/* Read-only banner */}
        {isReadOnly && completedDate && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            Sessione completata il {completedDate}
          </div>
        )}
      </motion.div>

      {/* Exercises */}
      {Array.from(exerciseMap.entries()).map(([exerciseName, exSets], ei) => {
        const muscle = exSets[0]?.muscle_group ?? null;
        return (
          <motion.div
            key={exerciseName}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ei * 0.06 }}
            className="rounded-2xl border border-border bg-card overflow-hidden"
          >
            {/* Exercise header */}
            <div className="bg-muted/30 px-4 py-3 border-b border-border">
              <p className="text-sm font-bold text-foreground">{exerciseName}</p>
              {muscle && (
                <span className="inline-flex items-center rounded-full bg-primary-500/10 px-2 py-0.5 text-[10px] font-medium text-primary-500 mt-1">
                  {MUSCLE_LABELS[muscle] ?? muscle}
                </span>
              )}
            </div>

            {/* Sets */}
            <div className="divide-y divide-border">
              {exSets.map((s) => (
                <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                  {/* Set number */}
                  <span className="text-xs font-bold text-muted-foreground w-6 flex-shrink-0">
                    #{s.set_number}
                  </span>

                  {/* Reps */}
                  <div className="flex flex-col items-center gap-0.5">
                    <label className="text-[9px] text-muted-foreground">Rip.</label>
                    <input
                      type="number"
                      min={0}
                      value={s.reps_done ?? ''}
                      disabled={isReadOnly}
                      onChange={(e) =>
                        updateSet(s.id, 'reps_done', e.target.value === '' ? null : parseInt(e.target.value))
                      }
                      className="w-12 rounded-lg border border-border bg-muted/20 px-1.5 py-1 text-xs text-center font-medium text-foreground focus:outline-none focus:border-primary-500 disabled:opacity-60"
                    />
                  </div>

                  {/* Weight */}
                  <div className="flex flex-col items-center gap-0.5">
                    <label className="text-[9px] text-muted-foreground">Kg</label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={s.weight_kg ?? ''}
                      disabled={isReadOnly}
                      onChange={(e) =>
                        updateSet(s.id, 'weight_kg', e.target.value === '' ? null : parseFloat(e.target.value))
                      }
                      className="w-14 rounded-lg border border-border bg-muted/20 px-1.5 py-1 text-xs text-center font-medium text-foreground focus:outline-none focus:border-primary-500 disabled:opacity-60"
                    />
                  </div>

                  {/* RPE */}
                  <div className="flex flex-col items-center gap-0.5">
                    <label className="text-[9px] text-muted-foreground">RPE</label>
                    <select
                      value={s.rpe ?? ''}
                      disabled={isReadOnly}
                      onChange={(e) =>
                        updateSet(s.id, 'rpe', e.target.value === '' ? null : parseInt(e.target.value))
                      }
                      className="w-14 rounded-lg border border-border bg-muted/20 px-1 py-1 text-xs text-center font-medium text-foreground focus:outline-none focus:border-primary-500 disabled:opacity-60"
                    >
                      <option value="">—</option>
                      {RPE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {/* Completed toggle */}
                  <button
                    type="button"
                    onClick={() => !isReadOnly && handleToggleComplete(s)}
                    disabled={isReadOnly}
                    className={`ml-auto flex-shrink-0 transition-colors disabled:cursor-default ${
                      s.completed ? 'text-emerald-500' : 'text-muted-foreground/40 hover:text-muted-foreground'
                    }`}
                  >
                    {s.completed ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Circle className="h-6 w-6" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Add set button */}
            {!isReadOnly && (
              <div className="px-4 py-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => handleAddSet(exerciseName, exSets[0]?.muscle_group ?? null)}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary-500 hover:text-primary-400 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Aggiungi set
                </button>
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Rest timer overlay */}
      {showRestTimer && (
        <RestTimer
          defaultSec={90}
          onClose={() => setShowRestTimer(false)}
          onDone={() => setShowRestTimer(false)}
        />
      )}

      {/* Finish button (only active sessions) */}
      {!isReadOnly && (
        <div className="fixed bottom-20 left-0 right-0 px-4 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setShowFinishModal(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3.5 text-sm transition-colors shadow-lg"
          >
            <Flag className="h-4 w-4" />
            Termina allenamento
          </button>
        </div>
      )}

      {/* Finish modal */}
      {showFinishModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
          onClick={() => setShowFinishModal(false)}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-md rounded-t-2xl border border-border bg-card p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-foreground">Termina allenamento</h2>
            <p className="text-sm text-muted-foreground">
              {completedCount} di {totalCount} set completati.
            </p>
            <textarea
              value={finishNotes}
              onChange={(e) => setFinishNotes(e.target.value)}
              placeholder="Note opzionali (es. energia, dolori, progressi...)"
              rows={3}
              className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary-500 resize-none"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFinishModal(false)}
                className="flex-1"
              >
                Annulla
              </Button>
              <Button
                onClick={handleFinish}
                disabled={finishing}
                className="flex-1"
              >
                {finishing ? 'Salvataggio…' : 'Conferma'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
