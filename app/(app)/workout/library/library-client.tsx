'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, BookOpen, X } from 'lucide-react';
import { BodyDiagram } from '@/components/body-diagram';
import { ExerciseCard } from '@/components/exercise-card';
import type { Exercise } from '@/lib/types';

type MuscleGroup = Exercise['muscle_group'];
type Equipment = 'all' | 'gym' | 'bodyweight';

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Petto',
  back: 'Schiena',
  shoulders: 'Spalle',
  biceps: 'Bicipiti',
  triceps: 'Tricipiti',
  forearms: 'Avambracci',
  abs: 'Addominali',
  quadriceps: 'Quadricipiti',
  hamstrings: 'Femorali',
  glutes: 'Glutei',
  calves: 'Polpacci',
  traps: 'Trapezi',
  full_body: 'Corpo intero',
};

const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: 'all', label: 'Tutti' },
  { value: 'gym', label: 'Palestra' },
  { value: 'bodyweight', label: 'A corpo libero' },
];

// Muscles not easily clickable on body diagram shown as chips
const CHIP_MUSCLES: MuscleGroup[] = ['forearms', 'abs', 'glutes', 'calves', 'traps', 'full_body'];

export function LibraryClient() {
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = useState<Equipment>('all');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExercises = useCallback(async (muscle: MuscleGroup | null, eq: Equipment) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (muscle) params.set('muscle_group', muscle);
      if (eq !== 'all') params.set('equipment', eq);
      const res = await fetch(`/api/exercises?${params.toString()}`);
      const data = await res.json() as { exercises: Exercise[]; error?: string };
      if (res.ok && !data.error) setExercises(data.exercises ?? []);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExercises(selectedMuscle, equipment);
  }, [selectedMuscle, equipment, fetchExercises]);

  function handleMuscleSelect(muscle: MuscleGroup) {
    setSelectedMuscle((prev) => (prev === muscle ? null : muscle));
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-8 pb-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary-500" />
          <h1 className="text-2xl font-bold text-foreground">Libreria esercizi</h1>
        </div>
        <p className="text-sm text-muted-foreground">Seleziona un muscolo per filtrare</p>
      </motion.div>

      {/* Body diagram */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.08 }}
        className="rounded-2xl border border-border bg-card p-4 flex flex-col items-center"
      >
        <BodyDiagram
          onSelect={handleMuscleSelect}
          selected={selectedMuscle}
        />
      </motion.div>

      {/* Extra chip muscles */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CHIP_MUSCLES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleMuscleSelect(m)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              selectedMuscle === m
                ? 'bg-primary-500 text-white border-primary-500'
                : 'border-border text-muted-foreground hover:border-primary-500/50 hover:text-foreground'
            }`}
          >
            {MUSCLE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Active filter chip */}
      {selectedMuscle && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtro:</span>
          <button
            type="button"
            onClick={() => setSelectedMuscle(null)}
            className="inline-flex items-center gap-1 rounded-full bg-primary-500/10 border border-primary-500/30 px-3 py-1 text-xs font-medium text-primary-500"
          >
            {MUSCLE_LABELS[selectedMuscle]}
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Equipment toggle */}
      <div className="flex rounded-xl border border-border p-1 gap-1">
        {EQUIPMENT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setEquipment(opt.value)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              equipment === opt.value
                ? 'bg-primary-500 text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <p className="text-sm text-muted-foreground">Caricamento esercizi…</p>
        </div>
      ) : exercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nessun esercizio trovato</p>
          <p className="text-xs text-muted-foreground/70">Prova a cambiare i filtri</p>
        </div>
      ) : (
        <div>
          <p className="text-xs text-muted-foreground mb-3">{exercises.length} esercizi trovati</p>
          <div className="grid grid-cols-2 gap-3">
            {exercises.map((ex, i) => (
              <motion.div
                key={ex.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <ExerciseCard exercise={ex} />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
