'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, CalendarDays, ChevronDown, Sparkles, ShoppingCart, FileDown, X, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getMealTypeLabel } from '@/lib/utils';
import { DIET_LABELS, DIET_PREFERENCES } from '@/lib/nutrition';
import { generateMealPlanPDF } from '@/lib/pdf';
import type { MealPlan, Profile } from '@/lib/types';

interface ShoppingItem {
  ingredient: string;
  count: number;
}

type PlanType = 'daily' | 'weekly';

interface Props {
  profile?: Profile | null;
}

export function PlanClient({ profile }: Props = {}) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [planType, setPlanType] = useState<PlanType>('weekly');
  const [dietPref, setDietPref] = useState<string>('');
  const [targetCalories, setTargetCalories] = useState('');
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [loadingShoppingList, setLoadingShoppingList] = useState(false);
  const [copied, setCopied] = useState(false);

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

  async function handleShoppingList() {
    if (!plan) return;
    setLoadingShoppingList(true);
    try {
      const res = await fetch(`/api/meal-plan/${plan.id}/shopping-list`);
      const data = await res.json() as { items: ShoppingItem[]; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? 'Errore');
      setShoppingItems(data.items);
      setCheckedItems(new Set());
      setShowShoppingList(true);
    } catch {
      toast.error('Errore caricamento lista spesa');
    } finally {
      setLoadingShoppingList(false);
    }
  }

  function toggleCheck(ingredient: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(ingredient)) next.delete(ingredient);
      else next.add(ingredient);
      return next;
    });
  }

  async function handleCopyList() {
    const text = shoppingItems
      .map((item) => `- ${item.ingredient}${item.count > 1 ? ` x${item.count}` : ''}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossibile copiare');
    }
  }

  function handlePDF() {
    if (!plan) return;
    generateMealPlanPDF(plan, profile ?? null);
  }

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
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Piano {plan.plan_type === 'daily' ? 'giornaliero' : 'settimanale'}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleShoppingList}
                disabled={loadingShoppingList}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
              >
                {loadingShoppingList ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShoppingCart className="h-3.5 w-3.5 text-primary-500" />
                )}
                Lista spesa
              </button>
              <button
                onClick={handlePDF}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
              >
                <FileDown className="h-3.5 w-3.5 text-primary-500" />
                PDF
              </button>
            </div>
          </div>
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
                    <div className="px-3 pb-3 pt-1 space-y-2">
                      <div>
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
                      {meal.steps && meal.steps.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Preparazione:</p>
                          <ol className="space-y-1">
                            {meal.steps.map((step, si) => (
                              <li key={si} className="text-xs text-foreground flex items-start gap-1.5">
                                <span className="font-bold text-primary-500 flex-shrink-0">{si + 1}.</span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
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

      {/* Shopping list modal */}
      <AnimatePresence>
        {showShoppingList && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60"
              onClick={() => setShowShoppingList(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed inset-x-4 bottom-4 z-50 max-w-md mx-auto rounded-2xl border border-border bg-card p-5 space-y-4 max-h-[70vh] flex flex-col"
            >
              <div className="flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary-500" />
                  <h3 className="text-base font-semibold text-foreground">Lista della spesa</h3>
                </div>
                <button
                  onClick={() => setShowShoppingList(false)}
                  className="rounded-xl p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 space-y-1">
                {shoppingItems.map((item) => (
                  <label
                    key={item.ingredient}
                    className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted/20 cursor-pointer transition-colors"
                  >
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        checkedItems.has(item.ingredient)
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-border'
                      }`}
                      onClick={() => toggleCheck(item.ingredient)}
                    >
                      {checkedItems.has(item.ingredient) && (
                        <Check className="h-2.5 w-2.5 text-white" />
                      )}
                    </div>
                    <span
                      className={`text-sm flex-1 capitalize transition-colors ${
                        checkedItems.has(item.ingredient)
                          ? 'line-through text-muted-foreground'
                          : 'text-foreground'
                      }`}
                    >
                      {item.ingredient}
                      {item.count > 1 && (
                        <span className="ml-2 text-xs text-muted-foreground">x{item.count}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>

              <button
                onClick={handleCopyList}
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors flex-shrink-0"
              >
                {copied ? (
                  <><Check className="h-4 w-4 text-green-400" /> Copiato!</>
                ) : (
                  <><Copy className="h-4 w-4" /> Copia testo</>
                )}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
