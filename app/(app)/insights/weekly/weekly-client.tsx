'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell,
} from 'recharts';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Loader2, Lightbulb,
  TrendingUp, TrendingDown, Minus, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { generateWeeklyReportPDF } from '@/lib/pdf';
import type { Profile } from '@/lib/types';

interface WeekTotals {
  days_logged: number;
  meals_count: number;
  calories_avg: number;
  protein_avg: number;
  carbs_avg: number;
  fat_avg: number;
  water_avg_ml: number;
  workouts_count: number;
  workout_volume_total: number;
  weight_change_kg: number | null;
  weight_start: number | null;
  weight_end: number | null;
}

interface WeeklyReport {
  week_start: string;
  week_end: string;
  totals: WeekTotals;
  previous: WeekTotals | null;
  adherence: {
    calories_target: number;
    calories_avg: number;
    calories_pct: number;
    protein_target: number;
    protein_avg: number;
    protein_pct: number;
  };
  daily: { date: string; calories: number; protein_g: number; workouts: number }[];
  best_calorie_day: { date: string; calories: number } | null;
  insights: string[];
}

const DAY_SHORT: Record<number, string> = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Gio', 5: 'Ven', 6: 'Sab' };

function dateToISOWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function addWeeks(isoWeek: string, n: number): string {
  const [yearStr, weekStr] = isoWeek.split('-W');
  const year = parseInt(yearStr!, 10);
  const week = parseInt(weekStr!, 10);
  const jan4 = new Date(year, 0, 4);
  const jan4Dow = jan4.getDay() === 0 ? 7 : jan4.getDay();
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - (jan4Dow - 1) + (week - 1) * 7 + n * 7);
  return dateToISOWeek(monday);
}

function formatWeekRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${s.toLocaleDateString('it-IT', opts)} — ${e.toLocaleDateString('it-IT', opts)}`;
}

function DeltaBadge({ current, prev }: { current: number; prev: number }) {
  const diff = current - prev;
  if (Math.abs(diff) < 1) return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (diff > 0) return <TrendingUp className="h-3 w-3 text-green-400" />;
  return <TrendingDown className="h-3 w-3 text-red-400" />;
}

interface Props {
  profile: Profile;
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '12px',
  fontSize: 11,
  color: 'hsl(var(--foreground))',
};

export function WeeklyClient({ profile }: Props) {
  const currentWeek = dateToISOWeek(new Date());
  const [week, setWeek] = useState(currentWeek);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (w: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/weekly-report?week=${w}`);
      if (!res.ok) throw new Error();
      const data = await res.json() as WeeklyReport;
      setReport(data);
    } catch {
      toast.error('Impossibile caricare il report settimanale');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(week);
  }, [week, load]);

  function prevWeek() {
    setWeek((w) => addWeeks(w, -1));
  }

  function nextWeek() {
    if (week >= currentWeek) return;
    setWeek((w) => addWeeks(w, 1));
  }

  function handleExportPDF() {
    if (!report) return;
    try {
      generateWeeklyReportPDF(report, profile);
    } catch {
      toast.error('Errore nella generazione del PDF');
    }
  }

  // Chart data: format day label
  const chartData = (report?.daily ?? []).map((d) => {
    const date = new Date(d.date + 'T00:00:00');
    return {
      ...d,
      label: DAY_SHORT[date.getDay()] ?? d.date,
    };
  });

  const prevTotals = report?.previous;

  return (
    <div className="mx-auto max-w-md md:max-w-3xl px-4 pt-8 pb-24 space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Link href="/insights" className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Report settimanale</h1>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={!report}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          PDF
        </button>
      </motion.div>

      {/* Week selector */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
        <button onClick={prevWeek} className="p-1 rounded-lg hover:bg-muted/50 transition-colors">
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {report ? formatWeekRange(report.week_start, report.week_end) : '…'}
          </p>
          <p className="text-xs font-medium text-primary-500">{week === currentWeek ? 'Questa settimana' : week}</p>
        </div>
        <button
          onClick={nextWeek}
          disabled={week >= currentWeek}
          className="p-1 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5 text-foreground" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      ) : report ? (
        <>
          {/* Hero card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-border bg-card p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Giorni loggati</p>
              <p className="text-sm font-bold text-primary-500">{report.totals.days_logged}/7</p>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(report.totals.days_logged / 7) * 100}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="h-full bg-primary-500 rounded-full"
              />
            </div>
          </motion.div>

          {/* Stat grid */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-3"
          >
            {[
              { label: 'Calorie medie', value: `${report.totals.calories_avg} kcal`, prev: prevTotals?.calories_avg ?? 0, cur: report.totals.calories_avg },
              { label: 'Proteine medie', value: `${report.totals.protein_avg} g`, prev: prevTotals?.protein_avg ?? 0, cur: report.totals.protein_avg },
              { label: 'Pasti totali', value: `${report.totals.meals_count}`, prev: prevTotals?.meals_count ?? 0, cur: report.totals.meals_count },
              { label: 'Allenamenti', value: `${report.totals.workouts_count}`, prev: prevTotals?.workouts_count ?? 0, cur: report.totals.workouts_count },
              { label: 'Acqua media', value: report.totals.water_avg_ml > 0 ? `${Math.round(report.totals.water_avg_ml / 100) / 10}L` : '—', prev: prevTotals?.water_avg_ml ?? 0, cur: report.totals.water_avg_ml },
              {
                label: 'Peso (delta)',
                value: report.totals.weight_change_kg !== null
                  ? `${report.totals.weight_change_kg > 0 ? '+' : ''}${report.totals.weight_change_kg} kg`
                  : '—',
                prev: 0,
                cur: 0,
                weightColor: report.totals.weight_change_kg === null
                  ? 'text-foreground'
                  : profile.goal === 'cut' && (report.totals.weight_change_kg ?? 0) < 0
                    ? 'text-green-400'
                    : profile.goal === 'lean_bulk' && (report.totals.weight_change_kg ?? 0) > 0
                      ? 'text-green-400'
                      : 'text-amber-400',
              },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border bg-card p-3">
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <p className={`text-lg font-bold ${stat.weightColor ?? 'text-foreground'}`}>{stat.value}</p>
                  {!stat.weightColor && <DeltaBadge current={stat.cur} prev={stat.prev} />}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Adherence */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border bg-card p-4 space-y-3"
          >
            <h2 className="text-sm font-semibold text-foreground">Aderenza agli obiettivi</h2>
            {[
              { label: 'Calorie', pct: report.adherence.calories_pct, avg: report.adherence.calories_avg, target: report.adherence.calories_target, unit: 'kcal' },
              { label: 'Proteine', pct: report.adherence.protein_pct, avg: report.adherence.protein_avg, target: report.adherence.protein_target, unit: 'g' },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-foreground">{item.avg} / {item.target} {item.unit} ({item.pct}%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className={`h-full rounded-full ${item.pct >= 90 ? 'bg-green-400' : item.pct >= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
                  />
                </div>
              </div>
            ))}
          </motion.div>

          {/* Line chart — calorie */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <h2 className="text-sm font-semibold text-foreground mb-4">Calorie giornaliere</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} kcal`, 'Calorie']} />
                {report.adherence.calories_target > 0 && (
                  <ReferenceLine
                    y={report.adherence.calories_target}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{ value: 'Target', position: 'insideTopRight', fontSize: 9, fill: '#10b981' }}
                  />
                )}
                <Line type="monotone" dataKey="calories" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Bar chart — allenamenti */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <h2 className="text-sm font-semibold text-foreground mb-4">Allenamenti per giorno</h2>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, 'Allenamenti']} />
                <Bar dataKey="workouts" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="#3b82f6" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Previous week comparison */}
          {prevTotals && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-border bg-card p-4 space-y-3"
            >
              <h2 className="text-sm font-semibold text-foreground">Confronto settimana precedente</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Calorie', cur: report.totals.calories_avg, prev: prevTotals.calories_avg, unit: 'kcal' },
                  { label: 'Proteine', cur: report.totals.protein_avg, prev: prevTotals.protein_avg, unit: 'g' },
                  { label: 'Allenamenti', cur: report.totals.workouts_count, prev: prevTotals.workouts_count, unit: '' },
                  { label: 'Pasti', cur: report.totals.meals_count, prev: prevTotals.meals_count, unit: '' },
                ].map((item) => {
                  const diff = item.cur - item.prev;
                  const color = diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-muted-foreground';
                  return (
                    <div key={item.label} className="rounded-xl border border-border bg-muted/10 p-3">
                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{item.cur}{item.unit}</p>
                      <p className={`text-[10px] font-medium ${color}`}>
                        {diff > 0 ? '+' : ''}{Math.round(diff)}{item.unit} vs sett. prec.
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Insights */}
          {report.insights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-2xl border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary-500" />
                <h2 className="text-sm font-semibold text-foreground">Insights</h2>
              </div>
              <ul className="space-y-2">
                {report.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                    {insight}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-sm text-muted-foreground">Nessun dato disponibile</div>
      )}
    </div>
  );
}
