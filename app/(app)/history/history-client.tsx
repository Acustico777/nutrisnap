'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CalendarDays } from 'lucide-react';
import { MealCard } from '@/components/meal-card';
import { formatDate, formatShortDate } from '@/lib/utils';
import { MACRO_COLORS } from '@/lib/constants';
import type { Meal } from '@/lib/types';

type Range = 'week' | 'month';

interface Props {
  meals: Meal[];
}

export function HistoryClient({ meals: initialMeals }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateFilter = searchParams.get('date'); // YYYY-MM-DD or null
  const [range, setRange] = useState<Range>('week');
  const [meals, setMeals] = useState<Meal[]>(initialMeals);

  // Filter meals by date or range
  let filtered: Meal[];
  if (dateFilter) {
    filtered = meals.filter((m) => {
      const d = new Date(m.consumed_at);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return ds === dateFilter;
    });
  } else {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (range === 'week' ? 7 : 30));
    filtered = meals.filter((m) => new Date(m.consumed_at) >= cutoff);
  }

  // Build chart data
  const days = range === 'week' ? 7 : 30;
  const chartData = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);

    const dayMeals = filtered.filter((m) => {
      const t = new Date(m.consumed_at);
      return t >= d && t < next;
    });

    return {
      date: formatShortDate(d.toISOString()),
      calories: Math.round(dayMeals.reduce((s, m) => s + m.total_calories, 0)),
    };
  });

  // Group meals by date label
  const grouped = filtered.reduce<Record<string, Meal[]>>((acc, meal) => {
    const label = formatDate(meal.consumed_at);
    if (!acc[label]) acc[label] = [];
    acc[label].push(meal);
    return acc;
  }, {});

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

  return (
    <div className="mx-auto max-w-md px-4 pt-8 space-y-5">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Storico</h1>
            <p className="text-sm text-muted-foreground">Analisi dei tuoi pasti</p>
          </div>
          <Link
            href="/history/calendar"
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
          >
            <CalendarDays className="h-4 w-4 text-primary-500" />
            Calendario
          </Link>
        </div>
      </motion.div>

      {/* Date filter active indicator */}
      {dateFilter && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-xl border border-primary-500/30 bg-primary-500/10 px-3 py-2"
        >
          <span className="text-xs text-foreground">
            Filtrato per: <strong>{new Date(dateFilter + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
          </span>
          <button
            onClick={() => router.push('/history')}
            className="text-xs text-primary-500 hover:underline"
          >
            Rimuovi
          </button>
        </motion.div>
      )}

      {/* Range toggle (hidden when date filter active) */}
      {!dateFilter && (
        <div className="flex rounded-xl border border-border p-1 w-fit gap-1">
          {(['week', 'month'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                range === r
                  ? 'bg-primary-500 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r === 'week' ? 'Settimana' : 'Mese'}
            </button>
          ))}
        </div>
      )}

      {/* Chart (hidden when date filter active) */}
      {!dateFilter && <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-4"
      >
        <h2 className="text-sm font-semibold text-foreground mb-4">Calorie giornaliere</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              interval={range === 'week' ? 0 : 4}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                fontSize: 12,
                color: 'hsl(var(--foreground))',
              }}
              cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
            />
            <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={MACRO_COLORS.calories} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>}

      {/* Grouped meal list */}
      <div className="space-y-5">
        {Object.keys(grouped).length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nessun pasto in questo periodo
          </p>
        )}

        {Object.entries(grouped).map(([dateLabel, dayMeals], gi) => (
          <motion.div
            key={dateLabel}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.05 }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">{dateLabel}</h3>
              <span className="text-xs text-muted-foreground">
                {Math.round(dayMeals.reduce((s, m) => s + m.total_calories, 0))} kcal
              </span>
            </div>
            <AnimatePresence>
              <div className="space-y-2">
                {dayMeals.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onFavorite={handleFavorite}
                    onDuplicate={handleDuplicate}
                  />
                ))}
              </div>
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
