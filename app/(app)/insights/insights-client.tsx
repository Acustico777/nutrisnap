'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, Lightbulb, Lock, Check, BarChart2 } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { CATEGORY_COLORS } from '@/lib/categories';
import { CATEGORIES } from '@/lib/categories';
import { MACRO_COLORS } from '@/lib/constants';
import type { CategoryBreakdown, FoodSuggestion } from '@/lib/types';
import { StreakBadge } from '@/components/streak-badge';

type Range = 'day' | 'week' | 'month';

interface BadgeData {
  id: string;
  label: string;
  description: string;
  unlocked: boolean;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_log_date: string | null;
  badges: BadgeData[];
}

const BADGE_ICONS: Record<string, string> = {
  first_flame: '🔥',
  full_week: '🌟',
  two_weeks: '💎',
  champion_month: '🏆',
  '100_days': '🥇',
  first_meal: '🍽️',
  ten_meals: '🍱',
  hundred_meals: '🍴',
  first_workout: '💪',
  ten_workouts: '🏋️',
  first_weight: '⚖️',
  weight_tracker: '📈',
  hydrated: '💧',
};

interface SeriesEntry {
  date: string;
  label: string;
  categories: Record<string, number>;
  total: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

interface InsightsData {
  range: Range;
  breakdown: CategoryBreakdown[];
  series: SeriesEntry[];
  totalCalories: number;
  totalItems: number;
}

interface FlatSeriesEntry {
  label: string;
  vegetables: number;
  meat: number;
  fish: number;
  fruit: number;
  other: number;
}

const RANGE_LABELS: Record<Range, string> = {
  day: 'Giorno',
  week: 'Settimana',
  month: 'Mese',
};

export function InsightsClient() {
  const [range, setRange] = useState<Range>('week');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InsightsData | null>(null);
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);
  const [streak, setStreak] = useState<StreakData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const [insRes, sugRes, streakRes] = await Promise.all([
          fetch(`/api/insights?range=${range}`),
          fetch('/api/suggestions?range=week'),
          fetch('/api/streak'),
        ]);
        const [insData, sugData, streakData] = await Promise.all([
          insRes.json() as Promise<InsightsData & { error?: string }>,
          sugRes.json() as Promise<{ suggestions: FoodSuggestion[]; error?: string }>,
          streakRes.json() as Promise<StreakData & { error?: string }>,
        ]);
        if (!cancelled) {
          if (insRes.ok && !insData.error) setData(insData);
          if (sugRes.ok && !sugData.error) setSuggestions(sugData.suggestions ?? []);
          if (streakRes.ok && !streakData.error) setStreak(streakData);
        }
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [range]);

  // Flatten series for stacked bar chart
  const flatSeries: FlatSeriesEntry[] = (data?.series ?? []).map((s) => ({
    label: s.label,
    vegetables: s.categories.vegetables ?? 0,
    meat: s.categories.meat ?? 0,
    fish: s.categories.fish ?? 0,
    fruit: s.categories.fruit ?? 0,
    other: s.categories.other ?? 0,
  }));

  const activePieData = (data?.breakdown ?? []).filter((b) => b.calories > 0);

  return (
    <div className="mx-auto max-w-md md:max-w-3xl px-4 pt-8 space-y-6 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Insights</h1>
        <p className="text-sm text-muted-foreground">Analisi nutrizionale</p>
      </motion.div>

      {/* Weekly report link */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Link
          href="/insights/weekly"
          className="flex items-center justify-between rounded-2xl border border-primary-500/30 bg-primary-500/10 px-4 py-3 hover:bg-primary-500/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary-500" />
            <span className="text-sm font-semibold text-foreground">Report settimanale</span>
          </div>
          <span className="text-xs text-primary-500 font-medium">Vedi →</span>
        </Link>
      </motion.div>

      {/* Streak */}
      {streak !== null && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <StreakBadge current={streak.current_streak} longest={streak.longest_streak} />
        </motion.div>
      )}

      {/* Range toggle */}
      <div className="flex rounded-xl border border-border p-1 w-fit gap-1">
        {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              range === r
                ? 'bg-primary-500 text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <p className="text-sm text-muted-foreground">Caricamento insights…</p>
        </div>
      ) : (
        <>
          {/* Pie chart section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <h2 className="text-sm font-semibold text-foreground mb-3">Distribuzione categorie</h2>

            {activePieData.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nessun pasto in questo periodo
              </p>
            ) : (
              <>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={activePieData}
                        dataKey="calories"
                        nameKey="label"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {activePieData.map((b) => (
                          <Cell key={b.category} fill={CATEGORY_COLORS[b.category]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [`${Math.round(value)} kcal`]}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          fontSize: 12,
                          color: 'hsl(var(--foreground))',
                        }}
                      />
                      <Legend
                        formatter={(value: string) => (
                          <span style={{ fontSize: 11, color: 'hsl(var(--foreground))' }}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">
                        {Math.round(data?.totalCalories ?? 0)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">kcal</p>
                    </div>
                  </div>
                </div>

                {/* Category list */}
                <div className="mt-3 space-y-2">
                  {activePieData.map((b) => (
                    <div key={b.category} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: CATEGORY_COLORS[b.category] }}
                        />
                        <span className="text-foreground">{b.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>{b.percent}%</span>
                        <span>{Math.round(b.calories)} kcal</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>

          {/* Stacked bar chart */}
          {flatSeries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <h2 className="text-sm font-semibold text-foreground mb-4">Distribuzione per giorno</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={flatSeries} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    interval={range === 'month' ? 4 : 0}
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
                  {CATEGORIES.map((cat) => (
                    <Bar
                      key={cat}
                      dataKey={cat}
                      stackId="a"
                      fill={CATEGORY_COLORS[cat]}
                      radius={cat === 'other' ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Trend macronutrienti */}
          {flatSeries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <h2 className="text-sm font-semibold text-foreground mb-4">Trend macronutrienti</h2>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart
                  data={(data?.series ?? []).map((s) => ({
                    label: s.label,
                    protein_g: s.protein_g ?? 0,
                    carbs_g: s.carbs_g ?? 0,
                    fat_g: s.fat_g ?? 0,
                  }))}
                  margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                >
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    interval={range === 'month' ? 4 : 0}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v}g`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: 12,
                      color: 'hsl(var(--foreground))',
                    }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        protein_g: 'Proteine',
                        carbs_g: 'Carboidrati',
                        fat_g: 'Grassi',
                      };
                      return [`${value}g`, labels[name] ?? name];
                    }}
                  />
                  <Legend
                    formatter={(value: string) => {
                      const labels: Record<string, string> = {
                        protein_g: 'Proteine',
                        carbs_g: 'Carboidrati',
                        fat_g: 'Grassi',
                      };
                      return <span style={{ fontSize: 10, color: 'hsl(var(--foreground))' }}>{labels[value] ?? value}</span>;
                    }}
                  />
                  <Line type="monotone" dataKey="protein_g" stroke={MACRO_COLORS.protein} strokeWidth={2} dot={false} name="protein_g" connectNulls />
                  <Line type="monotone" dataKey="carbs_g" stroke={MACRO_COLORS.carbs} strokeWidth={2} dot={false} name="carbs_g" connectNulls />
                  <Line type="monotone" dataKey="fat_g" stroke={MACRO_COLORS.fat} strokeWidth={2} dot={false} name="fat_g" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Smart suggestions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-primary-500" />
              <h2 className="text-sm font-semibold text-foreground">Suggerimenti smart</h2>
            </div>

            {suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                La tua dieta sembra bilanciata 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {suggestions.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="rounded-xl border border-border bg-muted/20 p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[s.category] }}
                      />
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                        {s.category}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mb-2">{s.reason}</p>
                    {s.examples.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-muted-foreground">Idee:</span>
                        {s.examples.map((ex) => (
                          <span
                            key={ex}
                            className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"
                          >
                            {ex}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Badges */}
          {streak && streak.badges.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <h2 className="text-sm font-semibold text-foreground mb-3">I tuoi traguardi</h2>
              <div className="grid grid-cols-3 gap-2">
                {streak.badges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`relative flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-colors ${
                      badge.unlocked
                        ? 'border-primary-500/40 bg-primary-500/10'
                        : 'border-border bg-muted/10 opacity-30'
                    }`}
                  >
                    <span className="text-2xl">{BADGE_ICONS[badge.id] ?? '🏅'}</span>
                    <p className="text-[10px] font-semibold text-foreground leading-tight">{badge.label}</p>
                    {badge.unlocked && (
                      <span className="absolute top-1 right-1">
                        <Check className="h-3 w-3 text-primary-500" />
                      </span>
                    )}
                    {!badge.unlocked && (
                      <span className="absolute top-1 right-1">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
