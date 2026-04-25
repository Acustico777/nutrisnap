'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Target, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile } from '@/lib/types';

interface Props {
  profile: Profile;
}

type Goal = 'cut' | 'maintain' | 'lean_bulk';

const GOAL_OPTIONS: { value: Goal; icon: typeof TrendingDown; label: string; description: string; color: string }[] = [
  {
    value: 'cut',
    icon: TrendingDown,
    label: 'Definizione',
    description: 'Perdita di grasso, mantenendo massa magra',
    color: 'text-blue-400',
  },
  {
    value: 'maintain',
    icon: Minus,
    label: 'Mantenimento',
    description: 'Stabilità del peso e composizione',
    color: 'text-green-400',
  },
  {
    value: 'lean_bulk',
    icon: TrendingUp,
    label: 'Massa magra',
    description: 'Aumento controllato di peso e muscoli',
    color: 'text-amber-400',
  },
];

function dateAfterDays(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function minDateISO(): string {
  // Min: today + 7 giorni
  return dateAfterDays(7);
}

export function GoalClient({ profile }: Props) {
  const router = useRouter();
  const [goal, setGoal] = useState<Goal>(profile.goal ?? 'maintain');
  const [targetWeight, setTargetWeight] = useState<string>(
    profile.target_weight_kg != null ? String(profile.target_weight_kg) : ''
  );
  const [targetDate, setTargetDate] = useState<string>(
    profile.goal_target_date ? profile.goal_target_date.slice(0, 10) : ''
  );
  const [saving, setSaving] = useState(false);

  // Suggerimento data: -0.5 kg/settimana (cut) o +0.25 kg/settimana (lean_bulk)
  const suggestion = useMemo(() => {
    if (!profile.weight_kg || !targetWeight) return null;
    const tw = parseFloat(targetWeight);
    if (Number.isNaN(tw)) return null;
    const delta = tw - profile.weight_kg;
    if (Math.abs(delta) < 0.1) return null;

    let weeklyRate = 0.5;
    if (goal === 'cut') weeklyRate = 0.5;
    else if (goal === 'lean_bulk') weeklyRate = 0.25;
    else weeklyRate = 0.2;

    const weeks = Math.ceil(Math.abs(delta) / weeklyRate);
    const days = weeks * 7;
    const suggestedDate = dateAfterDays(Math.max(7, days));
    return {
      weeks,
      rate: weeklyRate,
      date: suggestedDate,
      direction: delta < 0 ? 'perdita' : 'aumento',
      kg: Math.abs(delta),
    };
  }, [profile.weight_kg, targetWeight, goal]);

  function applySuggestion() {
    if (!suggestion) return;
    setTargetDate(suggestion.date);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const tw = targetWeight ? parseFloat(targetWeight) : null;
      if (tw !== null && (Number.isNaN(tw) || tw <= 20 || tw > 400)) {
        toast.error('Peso target non valido');
        setSaving(false);
        return;
      }
      const td = targetDate || null;
      if (td) {
        const tdDate = new Date(td);
        if (Number.isNaN(tdDate.getTime())) {
          toast.error('Data target non valida');
          setSaving(false);
          return;
        }
      }

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          target_weight_kg: tw,
          goal_target_date: td,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? 'Errore durante il salvataggio');
        setSaving(false);
        return;
      }

      toast.success('Obiettivo aggiornato!');
      router.back();
    } catch {
      toast.error('Errore di rete');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md md:max-w-3xl px-4 pt-8 pb-24 space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Link
          href="/settings"
          className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-primary-500" />
            Obiettivo
          </h1>
          <p className="text-xs text-muted-foreground">
            Definisci traguardo, peso e tempistiche
          </p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Goal selection */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-2"
        >
          <label className="text-sm font-semibold text-foreground">Tipo di obiettivo</label>
          <div className="space-y-2">
            {GOAL_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = goal === opt.value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setGoal(opt.value)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                    selected
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-border bg-card hover:bg-muted/30'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      selected ? 'bg-primary-500/20' : 'bg-muted/30'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${opt.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                  {selected && (
                    <span className="h-3 w-3 rounded-full bg-primary-500" />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Target weight */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <label htmlFor="target_weight" className="text-sm font-semibold text-foreground">
            Peso target (kg)
          </label>
          <input
            id="target_weight"
            type="number"
            step="0.1"
            min="20"
            max="400"
            placeholder={
              profile.weight_kg
                ? `Es. ${(profile.weight_kg + (goal === 'cut' ? -5 : goal === 'lean_bulk' ? 3 : 0)).toFixed(1)}`
                : 'Es. 75.0'
            }
            value={targetWeight}
            onChange={(e) => setTargetWeight(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none"
          />
          {profile.weight_kg && (
            <p className="text-xs text-muted-foreground">
              Peso attuale: <span className="font-medium text-foreground">{profile.weight_kg} kg</span>
            </p>
          )}
        </motion.div>

        {/* Target date */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-2"
        >
          <label htmlFor="target_date" className="text-sm font-semibold text-foreground">
            Data target
          </label>
          <input
            id="target_date"
            type="date"
            min={minDateISO()}
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground focus:border-primary-500 focus:outline-none"
          />

          {suggestion && (
            <div className="rounded-xl border border-primary-500/30 bg-primary-500/5 p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Suggerimento (rate sano ~{suggestion.rate} kg/settimana):
              </p>
              <p className="text-xs text-foreground">
                <span className="font-semibold">{suggestion.weeks} settiman{suggestion.weeks === 1 ? 'a' : 'e'}</span>{' '}
                per {suggestion.direction} di {suggestion.kg.toFixed(1)} kg →{' '}
                <span className="font-semibold">
                  {new Date(suggestion.date + 'T00:00:00').toLocaleDateString('it-IT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </p>
              <button
                type="button"
                onClick={applySuggestion}
                className="mt-2 text-xs font-medium text-primary-500 hover:underline"
              >
                Applica suggerimento →
              </button>
            </div>
          )}
        </motion.div>

        {/* Submit */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2 pt-2"
        >
          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Salvataggio…' : 'Salva obiettivo'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            disabled={saving}
            className="w-full rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            Annulla
          </button>
        </motion.div>
      </form>
    </div>
  );
}
