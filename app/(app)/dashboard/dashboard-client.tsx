'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { UtensilsCrossed, PieChart, CalendarDays, Dumbbell, TrendingUp, Star, Droplets } from 'lucide-react';
import { ProgressRing } from '@/components/progress-ring';
import { MacroBar } from '@/components/macro-bar';
import { MealCard } from '@/components/meal-card';
import { StreakBadge } from '@/components/streak-badge';
import { GoalProgressCard } from '@/components/goal-progress-card';
import { getGreeting, clampPercent } from '@/lib/utils';
import { MACRO_COLORS } from '@/lib/constants';
import type { Profile, Meal, WaterLog } from '@/lib/types';

const WATER_GOAL_ML = 2500;
const WATER_GLASS_ML = 250;
const WATER_GLASSES = 8;

interface Props {
  profile: Profile;
  meals: Meal[];
  waterLogs: WaterLog[];
}

export function DashboardClient({ profile, meals: initialMeals, waterLogs: initialWaterLogs }: Props) {
  const router = useRouter();
  const [meals, setMeals] = useState<Meal[]>(initialMeals);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>(initialWaterLogs);
  const [addingWater, setAddingWater] = useState(false);
  const [streakCurrent, setStreakCurrent] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/streak')
      .then((r) => r.json())
      .then((d: { current_streak?: number }) => {
        if (typeof d.current_streak === 'number') setStreakCurrent(d.current_streak);
      })
      .catch(() => {/* ignore */});
  }, []);

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.total_calories ?? 0),
      protein_g: acc.protein_g + (m.total_protein_g ?? 0),
      carbs_g: acc.carbs_g + (m.total_carbs_g ?? 0),
      fat_g: acc.fat_g + (m.total_fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  const goals = {
    calories: profile?.daily_calories ?? 2000,
    protein_g: profile?.daily_protein_g ?? 150,
    carbs_g: profile?.daily_carbs_g ?? 250,
    fat_g: profile?.daily_fat_g ?? 65,
  };

  const totalWaterMl = waterLogs.reduce((s, l) => s + l.amount_ml, 0);

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/meals/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setMeals((prev) => prev.filter((m) => m.id !== id));
      toast.success('Pasto eliminato');
      router.refresh();
    } catch {
      toast.error('Impossibile eliminare il pasto');
    }
  }

  function handleEdit(mealId: string) {
    router.push(`/scan/edit/${mealId}`);
  }

  async function handleFavorite(mealId: string) {
    const name = window.prompt('Nome del preferito:');
    if (!name?.trim()) return;
    const meal = meals.find((m) => m.id === mealId);
    if (!meal) return;
    try {
      const res = await fetch('/api/favorite-meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          items_json: meal.meal_items ?? [],
          total_calories: meal.total_calories,
          total_protein_g: meal.total_protein_g,
          total_carbs_g: meal.total_carbs_g,
          total_fat_g: meal.total_fat_g,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Salvato tra i preferiti!');
    } catch {
      toast.error('Errore salvataggio preferito');
    }
  }

  async function handleDuplicate(mealId: string) {
    try {
      const res = await fetch('/api/meals/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_meal_id: mealId }),
      });
      if (!res.ok) throw new Error();
      toast.success('Pasto duplicato per oggi!');
      router.refresh();
    } catch {
      toast.error('Errore duplicazione pasto');
    }
  }

  async function handleAddWater(amount: number) {
    setAddingWater(true);
    try {
      const res = await fetch('/api/water-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_ml: amount }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { log: WaterLog };
      setWaterLogs((prev) => [...prev, data.log]);
    } catch {
      toast.error('Errore aggiunta acqua');
    } finally {
      setAddingWater(false);
    }
  }

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <div className="mx-auto max-w-md md:max-w-3xl px-4 pt-8 space-y-6">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {getGreeting(profile?.display_name)}
            </h1>
            <p className="text-sm text-muted-foreground">Ecco il tuo riepilogo di oggi</p>
          </div>
          {streakCurrent !== null && (
            <Link href="/insights">
              <StreakBadge current={streakCurrent} compact />
            </Link>
          )}
        </div>
      </motion.div>

      {/* Goal progress (if target set) */}
      {profile?.target_weight_kg && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <GoalProgressCard profile={profile} />
        </motion.div>
      )}

      {/* Calorie ring */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex justify-center"
      >
        <div className="relative rounded-3xl border border-border bg-card p-6 w-full">
          <div className="flex flex-col items-center gap-2">
            <ProgressRing
              value={totals.calories}
              max={goals.calories}
              size={172}
              strokeWidth={14}
              color={MACRO_COLORS.calories}
              label={`${Math.round(totals.calories)}`}
              sublabel={`/ ${goals.calories} kcal`}
            />
            <p className="text-sm text-muted-foreground">
              {Math.max(goals.calories - Math.round(totals.calories), 0)} kcal rimanenti
            </p>
          </div>

          {/* Macro bars */}
          <div className="mt-6 space-y-4">
            <MacroBar
              label="Proteine"
              value={totals.protein_g}
              max={goals.protein_g}
              color={MACRO_COLORS.protein}
            />
            <MacroBar
              label="Carboidrati"
              value={totals.carbs_g}
              max={goals.carbs_g}
              color={MACRO_COLORS.carbs}
            />
            <MacroBar
              label="Grassi"
              value={totals.fat_g}
              max={goals.fat_g}
              color={MACRO_COLORS.fat}
            />
          </div>
        </div>
      </motion.div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="grid grid-cols-3 gap-2"
      >
        <Link
          href="/insights"
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
        >
          <PieChart className="h-5 w-5 text-primary-500" />
          Insights
        </Link>
        <Link
          href="/plan"
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
        >
          <CalendarDays className="h-5 w-5 text-primary-500" />
          Piano pasti
        </Link>
        <Link
          href="/workout"
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
        >
          <Dumbbell className="h-5 w-5 text-primary-500" />
          Workout
        </Link>
        <Link
          href="/progress"
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
        >
          <TrendingUp className="h-5 w-5 text-primary-500" />
          Progressi
        </Link>
        <Link
          href="/favorites"
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors col-span-2"
        >
          <Star className="h-5 w-5 text-primary-500" />
          Pasti preferiti
        </Link>
      </motion.div>

      {/* Water tracking */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-border bg-card p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-400" />
            <h2 className="text-sm font-semibold text-foreground">Acqua oggi</h2>
          </div>
          <span className="text-sm font-bold text-blue-400">
            {totalWaterMl} / {WATER_GOAL_ML} ml
          </span>
        </div>

        {/* Glasses visual */}
        <div className="flex gap-1.5">
          {Array.from({ length: WATER_GLASSES }, (_, i) => {
            const filled = totalWaterMl >= (i + 1) * WATER_GLASS_ML;
            const partial = !filled && totalWaterMl > i * WATER_GLASS_ML;
            return (
              <div
                key={i}
                className={`flex-1 h-6 rounded-md border transition-colors ${
                  filled
                    ? 'bg-blue-400 border-blue-400'
                    : partial
                    ? 'bg-blue-400/40 border-blue-400/40'
                    : 'border-border bg-muted/20'
                }`}
              />
            );
          })}
        </div>

        {/* Quick add buttons */}
        <div className="flex gap-2">
          {[250, 500, 750].map((ml) => (
            <button
              key={ml}
              onClick={() => handleAddWater(ml)}
              disabled={addingWater}
              className="flex-1 rounded-xl border border-blue-400/30 bg-blue-950/20 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-950/40 transition-colors disabled:opacity-50"
            >
              +{ml}ml
            </button>
          ))}
        </div>
      </motion.div>

      {/* Today's meals */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Pasti di oggi</h2>
          <Link href="/history" className="text-xs text-primary-500 hover:underline">
            Storico →
          </Link>
        </div>

        {meals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center"
          >
            <UtensilsCrossed className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nessun pasto ancora</p>
              <p className="text-xs text-muted-foreground/70">
                Tocca il pulsante della fotocamera in basso per registrare il tuo primo pasto
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            <AnimatePresence>
              {meals.map((meal) => (
                <motion.div key={meal.id} variants={itemVariants}>
                  <MealCard
                    meal={meal}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onFavorite={handleFavorite}
                    onDuplicate={handleDuplicate}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
