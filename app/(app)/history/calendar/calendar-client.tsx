'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowLeft, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DayData {
  date: string;
  meals_count: number;
  calories_total: number;
  workouts_count: number;
  weight_logged: boolean;
  water_ml: number;
}

const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

function mealsIntensityClass(count: number): string {
  if (count === 0) return 'bg-muted/20 border-border';
  if (count === 1) return 'bg-primary-500/10 border-primary-500/20';
  if (count === 2) return 'bg-primary-500/25 border-primary-500/40';
  return 'bg-primary-500/50 border-primary-500/70';
}

function getFirstDayOfWeek(year: number, month: number): number {
  // Returns 0=Mon,...,6=Sun
  const d = new Date(year, month, 1);
  const dow = d.getDay(); // 0=Sun,1=Mon,...
  return dow === 0 ? 6 : dow - 1;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function CalendarClient() {
  const router = useRouter();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  const load = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
      const res = await fetch(`/api/calendar?month=${monthStr}`);
      if (!res.ok) throw new Error();
      const data = await res.json() as { days: DayData[] };
      setDays(data.days ?? []);
    } catch {
      toast.error('Impossibile caricare il calendario');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(viewYear, viewMonth);
  }, [viewYear, viewMonth, load]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    const today = new Date();
    if (viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth >= today.getMonth())) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const isCurrentOrFuture = viewYear > now.getFullYear() ||
    (viewYear === now.getFullYear() && viewMonth >= now.getMonth());
  const canGoNext = !isCurrentOrFuture;

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDow = getFirstDayOfWeek(viewYear, viewMonth); // 0=Mon

  const dayMap = new Map<string, DayData>();
  days.forEach((d) => dayMap.set(d.date, d));

  // Build grid cells: null = empty, string = date
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push(ds);
  }

  // Stats
  const daysLogged = days.filter((d) => d.meals_count > 0).length;
  const totalMeals = days.reduce((s, d) => s + d.meals_count, 0);
  const totalWorkouts = days.reduce((s, d) => s + d.workouts_count, 0);

  function formatDayModalDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-8 pb-24 space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Link href="/history" className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendario</h1>
          <p className="text-xs text-muted-foreground">Storico attività mensile</p>
        </div>
      </motion.div>

      {/* Month selector */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
        <button
          onClick={prevMonth}
          className="p-1 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          disabled={!canGoNext}
          className="p-1 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5 text-foreground" />
        </button>
      </div>

      {/* Calendar grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-3"
      >
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {cells.map((ds, idx) => {
              if (!ds) {
                return <div key={`empty-${idx}`} />;
              }
              const dayData = dayMap.get(ds);
              const dayNum = parseInt(ds.split('-')[2]!, 10);
              const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
              const isToday = ds === todayStr;

              return (
                <button
                  key={ds}
                  onClick={() => dayData && setSelectedDay(dayData)}
                  className={`relative flex flex-col items-center justify-start rounded-lg border p-1 min-h-[52px] transition-colors ${
                    mealsIntensityClass(dayData?.meals_count ?? 0)
                  } ${isToday ? 'ring-2 ring-primary-500' : ''}`}
                >
                  <span className={`text-[11px] font-semibold ${isToday ? 'text-primary-500' : 'text-foreground'}`}>
                    {dayNum}
                  </span>
                  <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                    {(dayData?.meals_count ?? 0) > 0 && <span className="text-[8px]">🍽</span>}
                    {(dayData?.workouts_count ?? 0) > 0 && <span className="text-[8px]">💪</span>}
                    {dayData?.weight_logged && <span className="text-[8px]">⚖️</span>}
                    {(dayData?.water_ml ?? 0) > 0 && <span className="text-[8px]">💧</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold text-foreground">{daysLogged}/{daysInMonth}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Giorni loggati</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold text-foreground">{totalMeals}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Pasti totali</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold text-foreground">{totalWorkouts}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Allenamenti</p>
        </div>
      </motion.div>

      {/* Day detail modal */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedDay(null); }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="w-full max-w-md rounded-t-3xl bg-card border-t border-border px-5 pt-4 pb-10 space-y-4"
            >
              <div className="mx-auto h-1 w-10 rounded-full bg-border" />

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground capitalize">
                  {formatDayModalDate(selectedDay.date)}
                </h3>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-1.5 rounded-lg hover:bg-muted/50"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/10 px-3 py-2">
                  <span className="text-sm text-muted-foreground">Calorie totali</span>
                  <span className="text-sm font-semibold text-foreground">
                    {selectedDay.calories_total > 0 ? `${selectedDay.calories_total} kcal` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/10 px-3 py-2">
                  <span className="text-sm text-muted-foreground">Pasti</span>
                  <span className="text-sm font-semibold text-foreground">
                    {selectedDay.meals_count > 0 ? `${selectedDay.meals_count} pasti` : 'Nessuno'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/10 px-3 py-2">
                  <span className="text-sm text-muted-foreground">Allenamenti</span>
                  <span className="text-sm font-semibold text-foreground">
                    {selectedDay.workouts_count > 0 ? `${selectedDay.workouts_count}` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/10 px-3 py-2">
                  <span className="text-sm text-muted-foreground">Peso loggato</span>
                  <span className="text-sm font-semibold text-foreground">
                    {selectedDay.weight_logged ? 'Sì' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/10 px-3 py-2">
                  <span className="text-sm text-muted-foreground">Acqua</span>
                  <span className="text-sm font-semibold text-foreground">
                    {selectedDay.water_ml > 0 ? `${selectedDay.water_ml} ml` : '—'}
                  </span>
                </div>
              </div>

              {selectedDay.meals_count > 0 && (
                <Link
                  href={`/history?date=${selectedDay.date}`}
                  className="flex items-center justify-center w-full rounded-xl bg-primary-500 py-2.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
                  onClick={() => setSelectedDay(null)}
                >
                  Vedi pasti del giorno →
                </Link>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
