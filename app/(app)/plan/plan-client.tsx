'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, CalendarDays, ChevronDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getMealTypeLabel } from '@/lib/utils';
import { DIET_LABELS, DIET_PREFERENCES } from '@/lib/nutrition';
import type { MealPlan } from '@/lib/types';

type PlanType = 'daily' | 'weekly';

export function PlanClient() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [planType, setPlanType] = useState<PlanType>('weekly');
  const [dietPref, setDietPref] = useState<string>('');
  const [targetCalories, setTargetCalories] = useState('');

  useEffect(() => {
    async function loadPlan() {
      try {
        const res = await fetch('/api/meal-plan');
        const data = await res.json() as { plan: MealPlan | null; error?: string };
        if (res.ok && !data.error) setPlan(data.plan);
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    }
    loadPlan();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const body: Record<string, unknown> = { plan_type: planType };
      if (dietPref) body.diet_preference = dietPref;
      if (targetCalories) body.target_calories = Number(targetCalories);

      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { plan: MealPlan; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? 'Errore generazione piano');
      setPlan(data.plan);
      toast.success('Piano generato!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante la generazione del piano');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-8 space-y-6 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary-500" />
          <h1 className="text-2xl font-bold text-foreground">Meal Prep</h1>
        </div>
        <p className="text-sm text-muted-foreground">Piano pasti personalizzato</p>
      </motion.div>

      {/* Generation form */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-5 space-y-4"
      >
        <h2 className="text-base font-semibold text-foreground">Genera piano</h2>

        {/* Plan type */}
        <div className="space-y-2">
          <Label>Tipo piano</Label>
          <div className="flex rounded-xl border border-border p-1 gap-1">
            {(['daily', 'weekly'] as PlanType[]).map((t) => (
              <button
                key={t}
                onClick={() => setPlanType(t)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  planType === t
                    ? 'bg-primary-500 text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'daily' ? 'Giornaliero' : 'Settimanale'}
              </button>
            ))}
          </div>
        </div>

        {/* Diet preference */}
        <div className="space-y-2">
          <Label>Preferenza dieta</Label>
          <div className="relative">
            <select
              value={dietPref}
              onChange={(e) => setDietPref(e.target.value)}
              className="w-full appearance-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Auto (dal profilo)</option>
              {DIET_PREFERENCES.map((d) => (
                <option key={d} value={d}>
                  {DIET_LABELS[d]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {/* Target calories */}
        <div className="space-y-2">
          <Label htmlFor="target-cal">Target calorie</Label>
          <Input
            id="target-cal"
            type="number"
            min={500}
            placeholder="Auto (dal profilo)"
            value={targetCalories}
            onChange={(e) => setTargetCalories(e.target.value)}
          />
        </div>

        <Button onClick={handleGenerate} disabled={generating} className="w-full">
          {generating ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generazione in corso…</>
          ) : (
            <><Sparkles className="mr-2 h-4 w-4" /> Genera piano</>
          )}
        </Button>
      </motion.div>

      {/* Plan display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <p className="text-sm text-muted-foreground">Caricamento piano…</p>
        </div>
      ) : plan ? (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            Piano {plan.plan_type === 'daily' ? 'giornaliero' : 'settimanale'}
          </h2>
          {plan.plan_data.days.map((day, di) => (
            <motion.div
              key={day.day_label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: di * 0.07 }}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <div className="bg-muted/30 px-4 py-2.5 border-b border-border">
                <h3 className="text-sm font-bold text-foreground">{day.day_label}</h3>
              </div>
              <div className="p-3 space-y-2">
                {day.meals.map((meal, mi) => (
                  <details key={mi} className="group">
                    <summary className="cursor-pointer list-none rounded-xl border border-border bg-background p-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {getMealTypeLabel(meal.meal_type)}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-foreground truncate">{meal.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{meal.description}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm font-bold text-primary-500">{meal.calories} kcal</p>
                          <div className="flex gap-1.5 text-[10px] mt-0.5">
                            <span className="text-blue-400">P{meal.protein_g}g</span>
                            <span className="text-orange-400">C{meal.carbs_g}g</span>
                            <span className="text-pink-400">G{meal.fat_g}g</span>
                          </div>
                        </div>
                      </div>
                    </summary>
                    <div className="px-3 pb-3 pt-1">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Ingredienti:</p>
                      <ul className="space-y-1">
                        {meal.ingredients.map((ing, ii) => (
                          <li key={ii} className="text-xs text-foreground flex items-start gap-1.5">
                            <span className="text-muted-foreground mt-0.5">•</span>
                            {ing}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center"
        >
          <CalendarDays className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Nessun piano ancora</p>
            <p className="text-xs text-muted-foreground/70">Genera il tuo primo piano pasti!</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
