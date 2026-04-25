'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { History, Dumbbell, CheckCircle2, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { WorkoutSession, WorkoutSessionSet } from '@/lib/types';

type SessionWithSets = WorkoutSession & { workout_session_sets: WorkoutSessionSet[] };

interface Props {
  sessions: SessionWithSets[];
}

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const monday = new Date(d);
  const day = d.getDay() || 7;
  monday.setDate(d.getDate() - day + 1);
  return monday.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

function sessionStats(session: SessionWithSets) {
  const sets = session.workout_session_sets;
  const completedSets = sets.filter((s) => s.completed).length;
  const totalVolume = sets.reduce((sum, s) => {
    if (s.reps_done && s.weight_kg) return sum + s.reps_done * s.weight_kg;
    return sum;
  }, 0);
  const durationMin = session.completed_at
    ? Math.round((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000)
    : null;
  return { completedSets, totalSets: sets.length, totalVolume, durationMin };
}

interface WeeklyVolume {
  week: string;
  volume: number;
}

export function HistoryClient({ sessions }: Props) {
  // Group by week
  const grouped = useMemo(() => {
    const map = new Map<string, SessionWithSets[]>();
    for (const s of sessions) {
      const w = getWeekLabel(s.started_at);
      const ex = map.get(w) ?? [];
      ex.push(s);
      map.set(w, ex);
    }
    return map;
  }, [sessions]);

  // Weekly volume chart data
  const chartData = useMemo<WeeklyVolume[]>(() => {
    const weekVolume = new Map<string, number>();
    for (const s of sessions) {
      const w = getWeekLabel(s.started_at);
      const { totalVolume } = sessionStats(s);
      weekVolume.set(w, (weekVolume.get(w) ?? 0) + totalVolume);
    }
    return Array.from(weekVolume.entries())
      .map(([week, volume]) => ({ week, volume }))
      .reverse();
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <div className="mx-auto max-w-md md:max-w-3xl px-4 pt-8 pb-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2">
            <History className="h-6 w-6 text-primary-500" />
            <h1 className="text-2xl font-bold text-foreground">Storico</h1>
          </div>
        </motion.div>
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <Dumbbell className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nessun allenamento completato</p>
          <Link
            href="/workout"
            className="text-sm font-medium text-primary-500 hover:underline"
          >
            Vai al workout →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md md:max-w-3xl px-4 pt-8 pb-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2">
          <History className="h-6 w-6 text-primary-500" />
          <h1 className="text-2xl font-bold text-foreground">Storico allenamenti</h1>
        </div>
        <p className="text-sm text-muted-foreground">{sessions.length} sessioni completate</p>
      </motion.div>

      {/* Progressive overload chart */}
      {chartData.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-2xl border border-border bg-card p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary-500" />
            <h2 className="text-sm font-semibold text-foreground">Volume settimanale (kg × rip)</h2>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
                formatter={(v: number) => [`${v.toLocaleString('it-IT')} kg`, 'Volume']}
              />
              <Line
                type="monotone"
                dataKey="volume"
                stroke="var(--primary-500, #6366f1)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--primary-500, #6366f1)' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Sessions grouped by week */}
      {Array.from(grouped.entries()).map(([week, weekSessions], wi) => (
        <motion.div
          key={week}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + wi * 0.06 }}
          className="space-y-3"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Settimana del {week}
          </h3>
          {weekSessions.map((s) => {
            const { completedSets, totalSets, totalVolume, durationMin } = sessionStats(s);
            return (
              <Link
                key={s.id}
                href={`/workout/session/${s.id}`}
                className="block rounded-2xl border border-border bg-card p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {s.day_label ?? 'Allenamento'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(s.started_at).toLocaleDateString('it-IT', {
                        weekday: 'long', day: '2-digit', month: 'long',
                      })}
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-lg border border-border bg-muted/30 px-2 py-1 text-[10px] font-medium text-foreground">
                    {completedSets}/{totalSets} set
                  </span>
                  {totalVolume > 0 && (
                    <span className="rounded-lg border border-border bg-muted/30 px-2 py-1 text-[10px] font-medium text-foreground">
                      {totalVolume.toLocaleString('it-IT')} kg volume
                    </span>
                  )}
                  {durationMin !== null && durationMin > 0 && (
                    <span className="rounded-lg border border-border bg-muted/30 px-2 py-1 text-[10px] font-medium text-foreground">
                      {durationMin} min
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </motion.div>
      ))}
    </div>
  );
}
