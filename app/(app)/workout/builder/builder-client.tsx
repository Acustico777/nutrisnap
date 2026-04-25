'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Plus, Trash2, Search, X, Wand2, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Exercise, WorkoutDay, WorkoutExerciseEntry } from '@/lib/types';

interface Props {
  exercises: Exercise[];
}

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Petto', back: 'Schiena', shoulders: 'Spalle',
  biceps: 'Bicipiti', triceps: 'Tricipiti', forearms: 'Avambracci',
  abs: 'Addominali', quadriceps: 'Quadricipiti', hamstrings: 'Femorali',
  glutes: 'Glutei', calves: 'Polpacci', traps: 'Trapezi', full_body: 'Corpo intero',
};

type MuscleGroup = Exercise['muscle_group'] | 'all';

interface DayDraft {
  day_label: string;
  exercises: WorkoutExerciseEntry[];
}

export function BuilderClient({ exercises }: Props) {
  const router = useRouter();
  const [planName, setPlanName] = useState('');
  const [days, setDays] = useState<DayDraft[]>([{ day_label: 'Giorno 1', exercises: [] }]);
  const [saving, setSaving] = useState(false);

  // Exercise picker state
  const [pickerDayIndex, setPickerDayIndex] = useState<number | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerMuscle, setPickerMuscle] = useState<MuscleGroup>('all');

  // Expanded days
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([0]));

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const matchMuscle = pickerMuscle === 'all' || ex.muscle_group === pickerMuscle;
      const matchSearch = ex.name_it.toLowerCase().includes(pickerSearch.toLowerCase());
      return matchMuscle && matchSearch;
    });
  }, [exercises, pickerMuscle, pickerSearch]);

  function addDay() {
    const newIndex = days.length;
    setDays((prev) => [...prev, { day_label: `Giorno ${newIndex + 1}`, exercises: [] }]);
    setExpandedDays((prev) => new Set([...prev, newIndex]));
  }

  function removeDay(i: number) {
    setDays((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateDayLabel(i: number, label: string) {
    setDays((prev) => prev.map((d, idx) => idx === i ? { ...d, day_label: label } : d));
  }

  function toggleExpand(i: number) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  function openPicker(dayIndex: number) {
    setPickerDayIndex(dayIndex);
    setPickerSearch('');
    setPickerMuscle('all');
  }

  function closePicker() {
    setPickerDayIndex(null);
  }

  function addExerciseToDay(ex: Exercise) {
    if (pickerDayIndex === null) return;
    const entry: WorkoutExerciseEntry = {
      exercise_id: ex.id,
      exercise_name: ex.name_it,
      muscle_group: ex.muscle_group,
      sets: ex.default_sets,
      reps: ex.default_reps,
      rest_sec: ex.default_rest_sec,
    };
    setDays((prev) =>
      prev.map((d, idx) =>
        idx === pickerDayIndex
          ? { ...d, exercises: [...d.exercises, entry] }
          : d
      )
    );
    closePicker();
  }

  function removeExerciseFromDay(dayIdx: number, exIdx: number) {
    setDays((prev) =>
      prev.map((d, idx) =>
        idx === dayIdx
          ? { ...d, exercises: d.exercises.filter((_, i) => i !== exIdx) }
          : d
      )
    );
  }

  function updateExerciseField(dayIdx: number, exIdx: number, field: keyof WorkoutExerciseEntry, value: WorkoutExerciseEntry[keyof WorkoutExerciseEntry]) {
    setDays((prev) =>
      prev.map((d, dIdx) =>
        dIdx === dayIdx
          ? {
              ...d,
              exercises: d.exercises.map((ex, eIdx) =>
                eIdx === exIdx ? { ...ex, [field]: value } : ex
              ),
            }
          : d
      )
    );
  }

  async function handleSave() {
    if (!planName.trim()) {
      toast.error('Inserisci un nome per il piano');
      return;
    }
    if (days.length === 0 || days.every((d) => d.exercises.length === 0)) {
      toast.error('Aggiungi almeno un esercizio');
      return;
    }

    setSaving(true);
    try {
      const planDays: WorkoutDay[] = days.map((d) => ({
        day_label: d.day_label,
        muscle_focus: Array.from(new Set(d.exercises.map((e) => e.muscle_group))),
        exercises: d.exercises,
      }));

      const res = await fetch('/api/workout-plan/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: planName, days: planDays }),
      });

      if (!res.ok) throw new Error();
      toast.success('Piano salvato!');
      router.push('/workout/plan');
      router.refresh();
    } catch {
      toast.error('Errore nel salvare il piano');
    } finally {
      setSaving(false);
    }
  }

  const muscleOptions: MuscleGroup[] = [
    'all', 'chest', 'back', 'shoulders', 'biceps', 'triceps',
    'abs', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'traps', 'forearms', 'full_body',
  ];

  return (
    <div className="mx-auto max-w-md md:max-w-3xl px-4 pt-8 pb-32 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-primary-500" />
          <h1 className="text-2xl font-bold text-foreground">Crea piano custom</h1>
        </div>
        <p className="text-sm text-muted-foreground">Costruisci la tua scheda personalizzata</p>
      </motion.div>

      {/* Plan name */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="rounded-2xl border border-border bg-card p-4"
      >
        <label className="text-sm font-medium text-foreground block mb-2">Nome piano</label>
        <input
          type="text"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          placeholder="es. Push Pull Legs"
          className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary-500"
        />
      </motion.div>

      {/* Days */}
      {days.map((day, di) => (
        <motion.div
          key={di}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: di * 0.06 }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          {/* Day header */}
          <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center gap-2">
            <input
              type="text"
              value={day.day_label}
              onChange={(e) => updateDayLabel(di, e.target.value)}
              className="flex-1 bg-transparent text-sm font-bold text-foreground focus:outline-none"
            />
            <button
              type="button"
              onClick={() => toggleExpand(di)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {expandedDays.has(di) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {days.length > 1 && (
              <button
                type="button"
                onClick={() => removeDay(di)}
                className="text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <AnimatePresence>
            {expandedDays.has(di) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Exercises */}
                {day.exercises.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-muted-foreground text-center">
                    Nessun esercizio aggiunto
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {day.exercises.map((ex, ei) => (
                      <div key={ei} className="px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{ex.exercise_name}</p>
                            <p className="text-xs text-muted-foreground">{MUSCLE_LABELS[ex.muscle_group] ?? ex.muscle_group}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExerciseFromDay(di, ei)}
                            className="text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex flex-col gap-0.5">
                            <label className="text-[9px] text-muted-foreground">Serie</label>
                            <input
                              type="number"
                              min={1}
                              value={ex.sets}
                              onChange={(e) => updateExerciseField(di, ei, 'sets', parseInt(e.target.value) || 3)}
                              className="w-14 rounded-lg border border-border bg-muted/20 px-2 py-1 text-xs text-center font-medium text-foreground focus:outline-none focus:border-primary-500"
                            />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <label className="text-[9px] text-muted-foreground">Rip.</label>
                            <input
                              type="text"
                              value={ex.reps}
                              onChange={(e) => updateExerciseField(di, ei, 'reps', e.target.value)}
                              className="w-16 rounded-lg border border-border bg-muted/20 px-2 py-1 text-xs text-center font-medium text-foreground focus:outline-none focus:border-primary-500"
                            />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <label className="text-[9px] text-muted-foreground">Riposo (s)</label>
                            <input
                              type="number"
                              min={0}
                              value={ex.rest_sec}
                              onChange={(e) => updateExerciseField(di, ei, 'rest_sec', parseInt(e.target.value) || 90)}
                              className="w-16 rounded-lg border border-border bg-muted/20 px-2 py-1 text-xs text-center font-medium text-foreground focus:outline-none focus:border-primary-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add exercise button */}
                <div className="px-4 py-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => openPicker(di)}
                    className="flex items-center gap-1.5 text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Aggiungi esercizio
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}

      {/* Add day */}
      <button
        type="button"
        onClick={addDay}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-sm font-medium text-muted-foreground hover:border-primary-500/50 hover:text-foreground transition-colors"
      >
        <Plus className="h-4 w-4" />
        Aggiungi giorno
      </button>

      {/* Save button (sticky) */}
      <div className="fixed bottom-20 left-0 right-0 px-4 max-w-md mx-auto">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 text-sm font-semibold shadow-lg"
        >
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvataggio…</>
          ) : (
            <><Wand2 className="mr-2 h-4 w-4" /> Salva piano</>
          )}
        </Button>
      </div>

      {/* Exercise Picker Modal */}
      <AnimatePresence>
        {pickerDayIndex !== null && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
            onClick={closePicker}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md h-[75vh] rounded-t-2xl border border-border bg-card flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Picker header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-bold text-foreground">Scegli esercizio</h3>
                <button type="button" onClick={closePicker} className="text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search + filter */}
              <div className="px-4 py-3 space-y-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Cerca esercizio..."
                    className="w-full rounded-xl border border-border bg-muted/20 pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {muscleOptions.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPickerMuscle(m)}
                      className={`flex-shrink-0 rounded-full px-3 py-1 text-[10px] font-medium border transition-colors ${
                        pickerMuscle === m
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'border-border text-muted-foreground hover:border-primary-500/50'
                      }`}
                    >
                      {m === 'all' ? 'Tutti' : MUSCLE_LABELS[m] ?? m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exercise list */}
              <div className="flex-1 overflow-y-auto divide-y divide-border">
                {filteredExercises.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nessun esercizio trovato</p>
                ) : (
                  filteredExercises.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => addExerciseToDay(ex)}
                      className="w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{ex.name_it}</p>
                        <p className="text-xs text-muted-foreground">
                          {MUSCLE_LABELS[ex.muscle_group] ?? ex.muscle_group} · {ex.default_sets}×{ex.default_reps}
                        </p>
                      </div>
                      <Plus className="h-4 w-4 text-primary-500 flex-shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
