'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  TrendingUp,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { calculateBMI, bmiCategory } from '@/lib/nutrition';
import type { Profile, WeightLog } from '@/lib/types';
import { GoalProgressCard } from '@/components/goal-progress-card';

type Range = 'week' | 'month' | '3months' | 'year' | 'all';

const RANGE_LABELS: Record<Range, string> = {
  week: '7g',
  month: '30g',
  '3months': '3m',
  year: '1a',
  all: 'Tutti',
};

function getRangeDays(range: Range): number | null {
  if (range === 'week') return 7;
  if (range === 'month') return 30;
  if (range === '3months') return 90;
  if (range === 'year') return 365;
  return null;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  return `${day} ${months[d.getMonth()]}`;
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface Props {
  profile: Profile;
  initialLogs: WeightLog[];
}

interface FormState {
  weight_kg: string;
  body_fat_percent: string;
  lean_mass_kg: string;
  fat_mass_kg: string;
  logged_at: string;
  notes: string;
}

const DEFAULT_FORM: FormState = {
  weight_kg: '',
  body_fat_percent: '',
  lean_mass_kg: '',
  fat_mass_kg: '',
  logged_at: new Date().toISOString().split('T')[0]!,
  notes: '',
};

export function ProgressClient({ profile, initialLogs }: Props) {
  const [logs, setLogs] = useState<WeightLog[]>(initialLogs);
  const [range, setRange] = useState<Range>('month');
  const [showModal, setShowModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  // Filter logs by range
  const filteredLogs = useMemo(() => {
    const days = getRangeDays(range);
    if (!days) return logs;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return logs.filter((l) => new Date(l.logged_at) >= cutoff);
  }, [logs, range]);

  // Chart data — sorted ascending
  const chartData = useMemo(() =>
    [...filteredLogs]
      .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
      .map((l) => ({
        label: formatDateLabel(l.logged_at),
        weight_kg: l.weight_kg,
        lean_mass_kg: l.lean_mass_kg ?? undefined,
        fat_mass_kg: l.fat_mass_kg ?? undefined,
        body_fat_percent: l.body_fat_percent ?? undefined,
      })),
    [filteredLogs]
  );

  const hasLeanFat = filteredLogs.some((l) => l.lean_mass_kg !== null || l.fat_mass_kg !== null);
  const hasBf = filteredLogs.some((l) => l.body_fat_percent !== null);

  // Current weight: most recent log or profile
  const sortedDesc = useMemo(() =>
    [...logs].sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()),
    [logs]
  );
  const latestLog = sortedDesc[0];
  const currentWeight = latestLog?.weight_kg ?? profile.weight_kg;

  // Stats
  const now = Date.now();
  const last7 = logs.filter((l) => new Date(l.logged_at).getTime() >= now - 7 * 86400000);
  const prev7 = logs.filter((l) => {
    const t = new Date(l.logged_at).getTime();
    return t >= now - 14 * 86400000 && t < now - 7 * 86400000;
  });
  const last30 = logs.filter((l) => new Date(l.logged_at).getTime() >= now - 30 * 86400000);

  const avg7 = last7.length > 0
    ? Math.round((last7.reduce((s, l) => s + l.weight_kg, 0) / last7.length) * 10) / 10
    : null;
  const avgPrev7 = prev7.length > 0
    ? Math.round((prev7.reduce((s, l) => s + l.weight_kg, 0) / prev7.length) * 10) / 10
    : null;
  const delta7 = avg7 !== null && avgPrev7 !== null ? Math.round((avg7 - avgPrev7) * 10) / 10 : null;

  const bf30Values = last30.filter((l) => l.body_fat_percent !== null).map((l) => l.body_fat_percent!);
  const avgBf30 = bf30Values.length > 0
    ? Math.round((bf30Values.reduce((s, v) => s + v, 0) / bf30Values.length) * 10) / 10
    : null;

  // Target / BMI
  const targetWeight = profile.target_weight_kg;
  const deltaTarget = currentWeight && targetWeight
    ? Math.round((currentWeight - targetWeight) * 10) / 10
    : null;

  const bmiValue = profile.weight_kg && profile.height_cm
    ? calculateBMI(profile.weight_kg, profile.height_cm)
    : null;
  const bmiCat = bmiValue ? bmiCategory(bmiValue) : null;

  const weeksLeft = profile.goal_target_date
    ? Math.max(0, Math.round((new Date(profile.goal_target_date).getTime() - Date.now()) / (7 * 86400000)))
    : null;
  const kgPerWeek =
    deltaTarget !== null && weeksLeft !== null && weeksLeft > 0
      ? Math.round((Math.abs(deltaTarget) / weeksLeft) * 100) / 100
      : null;

  // Form helpers
  function updateForm(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.weight_kg || isNaN(Number(form.weight_kg))) {
      toast.error('Inserisci un peso valido');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        weight_kg: Number(form.weight_kg),
        logged_at: form.logged_at ? new Date(form.logged_at).toISOString() : undefined,
        notes: form.notes || null,
      };
      if (form.body_fat_percent) body.body_fat_percent = Number(form.body_fat_percent);
      if (form.lean_mass_kg) body.lean_mass_kg = Number(form.lean_mass_kg);
      if (form.fat_mass_kg) body.fat_mass_kg = Number(form.fat_mass_kg);

      const res = await fetch('/api/weight-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { log?: WeightLog; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? 'Errore');

      if (json.log) {
        setLogs((prev) => [...prev, json.log!]);
      }
      toast.success('Misurazione salvata');
      setShowModal(false);
      setForm(DEFAULT_FORM);
      setShowAdvanced(false);
    } catch (err) {
      toast.error('Impossibile salvare la misurazione');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/weight-logs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setLogs((prev) => prev.filter((l) => l.id !== id));
      toast.success('Log eliminato');
    } catch {
      toast.error('Impossibile eliminare il log');
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i * 0.06 } }),
  };

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '12px',
    fontSize: 12,
    color: 'hsl(var(--foreground))',
  };

  const recentLogs = sortedDesc.slice(0, 10);

  return (
    <div className="mx-auto max-w-md px-4 pt-8 space-y-6 pb-32">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary-500" />
          <h1 className="text-2xl font-bold text-foreground">Progressi</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">Monitora peso e composizione corporea</p>
      </motion.div>

      {/* Goal progress */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <GoalProgressCard
          profile={profile}
          latestWeightKg={currentWeight}
          initialWeightKg={sortedDesc[sortedDesc.length - 1]?.weight_kg ?? null}
        />
      </motion.div>

      {/* Hero card */}
      <motion.div
        custom={0}
        variants={itemVariants}
        initial="hidden"
        animate="show"
        className="rounded-2xl border border-border bg-card p-5"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Peso attuale</p>
            <p className="text-4xl font-bold text-foreground mt-1">
              {currentWeight != null ? `${currentWeight} kg` : '—'}
            </p>
            {deltaTarget !== null && (
              <p className={`text-sm font-medium mt-1 ${
                Math.abs(deltaTarget) < 0.5
                  ? 'text-green-400'
                  : deltaTarget > 0
                  ? 'text-amber-400'
                  : 'text-sky-400'
              }`}>
                {deltaTarget > 0 ? '+' : ''}{deltaTarget} kg dal target ({targetWeight} kg)
              </p>
            )}
            {weeksLeft !== null && kgPerWeek !== null && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {weeksLeft} settimane · {kgPerWeek} kg/sett. necessari
              </p>
            )}
          </div>
          {bmiValue && bmiCat && (
            <div
              className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
              style={{ backgroundColor: bmiCat.color }}
            >
              BMI {bmiValue}
              <br />
              <span className="font-normal">{bmiCat.label}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Range toggle */}
      <motion.div custom={1} variants={itemVariants} initial="hidden" animate="show">
        <div className="flex rounded-xl border border-border p-1 gap-1 w-full">
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                range === r
                  ? 'bg-primary-500 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Grafico peso */}
      <motion.div
        custom={2}
        variants={itemVariants}
        initial="hidden"
        animate="show"
        className="rounded-2xl border border-border bg-card p-4"
      >
        <h2 className="text-sm font-semibold text-foreground mb-4">Peso nel tempo</h2>
        {chartData.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Nessun dato in questo periodo</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                tickFormatter={(v: number) => `${v}`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    weight_kg: 'Peso',
                    lean_mass_kg: 'Massa magra',
                    fat_mass_kg: 'Massa grassa',
                  };
                  return [`${value} kg`, labels[name] ?? name];
                }}
              />
              {targetWeight && (
                <ReferenceLine
                  y={targetWeight}
                  stroke="#22c55e"
                  strokeDasharray="4 4"
                  label={{ value: `Target ${targetWeight}kg`, position: 'insideTopRight', fontSize: 9, fill: '#22c55e' }}
                />
              )}
              {hasLeanFat && <Legend wrapperStyle={{ fontSize: 10 }} />}
              <Line
                type="monotone"
                dataKey="weight_kg"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10b981' }}
                name="weight_kg"
                connectNulls
              />
              {hasLeanFat && (
                <Line
                  type="monotone"
                  dataKey="lean_mass_kg"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#3b82f6' }}
                  name="lean_mass_kg"
                  connectNulls
                />
              )}
              {hasLeanFat && (
                <Line
                  type="monotone"
                  dataKey="fat_mass_kg"
                  stroke="#ec4899"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#ec4899' }}
                  name="fat_mass_kg"
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Grafico BF% */}
      {hasBf && (
        <motion.div
          custom={3}
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="rounded-2xl border border-border bg-card p-4"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">Body fat % nel tempo</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                domain={[0, 'auto']}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => [`${value}%`, 'BF%']}
              />
              {/* Guideline categories */}
              {[15, 20, 25, 30].map((v) => (
                <ReferenceLine
                  key={v}
                  y={v}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="2 4"
                  strokeOpacity={0.4}
                  label={{ value: `${v}%`, position: 'insideTopRight', fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                />
              ))}
              <Line
                type="monotone"
                dataKey="body_fat_percent"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 3, fill: '#f97316' }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Stat cards */}
      <motion.div
        custom={4}
        variants={itemVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3"
      >
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Media 7 giorni</p>
          <p className="text-xl font-bold text-foreground mt-1">{avg7 != null ? `${avg7} kg` : '—'}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Δ settimana prec.</p>
          <p className={`text-xl font-bold mt-1 ${
            delta7 === null ? 'text-foreground' : delta7 < 0 ? 'text-sky-400' : delta7 > 0 ? 'text-amber-400' : 'text-green-400'
          }`}>
            {delta7 !== null ? `${delta7 > 0 ? '+' : ''}${delta7} kg` : '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">BF% medio 30g</p>
          <p className="text-xl font-bold text-foreground mt-1">{avgBf30 != null ? `${avgBf30}%` : '—'}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Totale misurazioni</p>
          <p className="text-xl font-bold text-foreground mt-1">{logs.length}</p>
        </div>
      </motion.div>

      {/* Lista log recenti */}
      <motion.div
        custom={5}
        variants={itemVariants}
        initial="hidden"
        animate="show"
        className="space-y-3"
      >
        <h2 className="text-base font-semibold text-foreground">Log recenti</h2>
        {recentLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center">
            <p className="text-sm text-muted-foreground">Nessun log ancora</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Premi + per aggiungere la prima misurazione</p>
          </div>
        ) : (
          <AnimatePresence>
            {recentLogs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{formatDateFull(log.logged_at)}</p>
                  <div className="flex flex-wrap gap-2 mt-0.5">
                    <span className="text-xs text-foreground font-medium">{log.weight_kg} kg</span>
                    {log.body_fat_percent !== null && (
                      <span className="text-xs text-muted-foreground">BF: {log.body_fat_percent}%</span>
                    )}
                    {log.notes && (
                      <span className="text-xs text-muted-foreground truncate">{log.notes}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(log.id)}
                  className="ml-3 p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  aria-label="Elimina log"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </motion.div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 shadow-lg shadow-primary-500/40 transition-transform active:scale-95 hover:bg-primary-600"
        aria-label="Aggiungi misurazione"
      >
        <Plus className="h-6 w-6 text-white" />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setForm(DEFAULT_FORM); setShowAdvanced(false); } }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="w-full max-w-md rounded-t-3xl bg-card border-t border-border px-6 pt-4 pb-10 space-y-4"
            >
              {/* Handle */}
              <div className="mx-auto h-1 w-10 rounded-full bg-border" />

              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Aggiungi misurazione</h3>
                <button
                  onClick={() => { setShowModal(false); setForm(DEFAULT_FORM); setShowAdvanced(false); }}
                  className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Peso */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Peso (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="es. 75.5"
                  value={form.weight_kg}
                  onChange={(e) => updateForm('weight_kg', e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* BF% */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Body fat % (opzionale)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="es. 18.5"
                  value={form.body_fat_percent}
                  onChange={(e) => updateForm('body_fat_percent', e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Avanzato toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-400 transition-colors"
              >
                {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showAdvanced ? 'Nascondi dettagli avanzati' : 'Mostra dettagli avanzati'}
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Massa magra kg
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="es. 60.0"
                        value={form.lean_mass_kg}
                        onChange={(e) => updateForm('lean_mass_kg', e.target.value)}
                        className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Massa grassa kg
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="es. 15.5"
                        value={form.fat_mass_kg}
                        onChange={(e) => updateForm('fat_mass_kg', e.target.value)}
                        className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Data */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Data
                </label>
                <input
                  type="date"
                  value={form.logged_at}
                  onChange={(e) => updateForm('logged_at', e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Note (opzionale)
                </label>
                <input
                  type="text"
                  placeholder="es. mattina a digiuno"
                  value={form.notes}
                  onChange={(e) => updateForm('notes', e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setShowModal(false); setForm(DEFAULT_FORM); setShowAdvanced(false); }}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-primary-500 py-2.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors disabled:opacity-60"
                >
                  {saving ? 'Salvataggio…' : 'Salva'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
