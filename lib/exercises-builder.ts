import type { Exercise, WorkoutDay, WorkoutExerciseEntry } from './types';
import type { Goal } from './nutrition';

type Split = { day_label: string; muscle_focus: string[] }[];

// Splits per number of training days
const SPLITS: Record<number, Split> = {
  1: [
    { day_label: 'Giorno 1 — Full Body', muscle_focus: ['chest', 'back', 'quadriceps', 'hamstrings', 'shoulders', 'abs'] },
  ],
  2: [
    { day_label: 'Giorno 1 — Upper', muscle_focus: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
    { day_label: 'Giorno 2 — Lower', muscle_focus: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'abs'] },
  ],
  3: [
    { day_label: 'Giorno 1 — Push', muscle_focus: ['chest', 'shoulders', 'triceps'] },
    { day_label: 'Giorno 2 — Pull', muscle_focus: ['back', 'biceps', 'traps'] },
    { day_label: 'Giorno 3 — Legs', muscle_focus: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'abs'] },
  ],
  4: [
    { day_label: 'Giorno 1 — Upper', muscle_focus: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
    { day_label: 'Giorno 2 — Lower', muscle_focus: ['quadriceps', 'hamstrings', 'glutes', 'calves'] },
    { day_label: 'Giorno 3 — Upper', muscle_focus: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
    { day_label: 'Giorno 4 — Lower + Abs', muscle_focus: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'abs'] },
  ],
  5: [
    { day_label: 'Giorno 1 — Petto + Tricipiti', muscle_focus: ['chest', 'triceps'] },
    { day_label: 'Giorno 2 — Schiena + Bicipiti', muscle_focus: ['back', 'biceps'] },
    { day_label: 'Giorno 3 — Gambe', muscle_focus: ['quadriceps', 'hamstrings', 'glutes', 'calves'] },
    { day_label: 'Giorno 4 — Spalle + Trapezi', muscle_focus: ['shoulders', 'traps'] },
    { day_label: 'Giorno 5 — Braccia + Addome', muscle_focus: ['biceps', 'triceps', 'forearms', 'abs'] },
  ],
  6: [
    { day_label: 'Giorno 1 — Push', muscle_focus: ['chest', 'shoulders', 'triceps'] },
    { day_label: 'Giorno 2 — Pull', muscle_focus: ['back', 'biceps', 'traps'] },
    { day_label: 'Giorno 3 — Legs', muscle_focus: ['quadriceps', 'hamstrings', 'glutes', 'calves'] },
    { day_label: 'Giorno 4 — Push', muscle_focus: ['chest', 'shoulders', 'triceps'] },
    { day_label: 'Giorno 5 — Pull', muscle_focus: ['back', 'biceps', 'traps'] },
    { day_label: 'Giorno 6 — Legs + Abs', muscle_focus: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'abs'] },
  ],
};

function adjustForGoal(
  ex: Exercise,
  goal: Goal,
): { sets: number; reps: string; rest_sec: number } {
  let sets = ex.default_sets;
  let reps = ex.default_reps;
  let rest = ex.default_rest_sec;

  if (goal === 'cut') {
    sets = Math.max(3, ex.default_sets);
    reps = '12-15';
    rest = 60;
  } else if (goal === 'lean_bulk') {
    sets = ex.default_sets + 1;
    reps = '6-10';
    rest = 90;
  } else {
    // maintain
    sets = ex.default_sets;
    reps = '8-12';
    rest = 75;
  }

  return { sets, reps, rest_sec: rest };
}

function pickExercises(
  allExercises: Exercise[],
  muscle: string,
  equipmentFilter: ('gym' | 'bodyweight')[],
  howMany: number,
): Exercise[] {
  const pool = allExercises.filter(
    (e) => e.muscle_group === muscle && equipmentFilter.includes(e.equipment),
  );
  // Shuffle with Math.random
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, howMany);
}

export function buildWorkoutPlan({
  goal,
  days_per_week,
  location,
  exercises,
}: {
  goal: Goal;
  days_per_week: number;
  location: 'gym' | 'home';
  exercises: Exercise[];
}): WorkoutDay[] {
  const clampedDays = Math.min(Math.max(days_per_week, 1), 6);
  const split = SPLITS[clampedDays] ?? SPLITS[3]!;
  const equipmentFilter: ('gym' | 'bodyweight')[] =
    location === 'home' ? ['bodyweight'] : ['gym', 'bodyweight'];

  return split.map((day) => {
    // Aim for ~5-6 exercises per day, distributed across muscle_focus
    const totalSlots = day.muscle_focus.length >= 4 ? 6 : 5;
    const perMuscle = Math.max(1, Math.floor(totalSlots / day.muscle_focus.length));
    const remainder = totalSlots - perMuscle * day.muscle_focus.length;

    const dayExercises: WorkoutExerciseEntry[] = [];

    day.muscle_focus.forEach((muscle, i) => {
      const count = perMuscle + (i < remainder ? 1 : 0);
      const picked = pickExercises(exercises, muscle, equipmentFilter, count);
      picked.forEach((ex) => {
        const { sets, reps, rest_sec } = adjustForGoal(ex, goal);
        dayExercises.push({
          exercise_id: ex.id,
          exercise_name: ex.name_it,
          muscle_group: ex.muscle_group,
          sets,
          reps,
          rest_sec,
        });
      });
    });

    return {
      day_label: day.day_label,
      muscle_focus: day.muscle_focus,
      exercises: dayExercises,
    };
  });
}
