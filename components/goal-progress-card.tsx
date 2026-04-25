'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Profile } from '@/lib/types';

const GOAL_LABELS: Record<string, string> = {
  cut: 'Definizione',
  maintain: 'Mantenimento',
  lean_bulk: 'Massa magra',
};

const GOAL_ICONS: Record<string, string> = {
  cut: '🔻',
  maintain: '🟢',
  lean_bulk: '🔺',
};

interface Props {
  profile: Profile;
  latestWeightKg?: number | null;
  initialWeightKg?: number | null;
}

function calcWeeklyRate(current: number, start: number, daysElapsed: number): number | null {
  if (daysElapsed <= 0) return null;
  const weeksElapsed = daysElapsed / 7;
  if (weeksElapsed < 0.5) return null;
  return Math.round(((current - start) / weeksElapsed) * 100) / 100;
}

export function GoalProgressCard({ profile, latestWeightKg, initialWeightKg }: Props) {
  const targetWeight = profile.target_weight_kg;
  const targetDate = profile.goal_target_date;
  const currentWeight = latestWeightKg ?? profile.weight_kg;
  const startWeight = initialWeightKg ?? profile.weight_kg;

  if (!targetWeight) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Il tuo obiettivo</h3>
        <p className="text-xs text-muted-foreground">Nessun obiettivo impostato.</p>
        <Link
          href="/profile/goal"
          className="text-xs font-medium text-primary-500 hover:underline"
        >
          Imposta obiettivo →
        </Link>
      </div>
    );
  }

  const goal = profile.goal ?? 'maintain';
  const goalLabel = GOAL_LABELS[goal] ?? goal;
  const goalIcon = GOAL_ICONS[goal] ?? '🎯';

  // Progress percentage
  let progressPct = 0;
  if (startWeight && currentWeight) {
    const total = targetWeight - startWeight;
    const done = currentWeight - startWeight;
    if (total !== 0) {
      progressPct = Math.min(100, Math.max(0, Math.round((done / total) * 100)));
    } else {
      progressPct = 100;
    }
  }

  // Days remaining
  const daysRemaining = targetDate
    ? Math.max(0, Math.round((new Date(targetDate).getTime() - Date.now()) / 86400000))
    : null;

  // Required rate
  const kgRemaining = currentWeight ? Math.round((targetWeight - currentWeight) * 10) / 10 : null;
  const weeksRemaining = daysRemaining !== null ? daysRemaining / 7 : null;
  const requiredRate =
    kgRemaining !== null && weeksRemaining !== null && weeksRemaining > 0
      ? Math.round((Math.abs(kgRemaining) / weeksRemaining) * 100) / 100
      : null;

  // Current rate (last 14 days simulation using start/current)
  const daysElapsed = profile.goal_target_date && startWeight && currentWeight
    ? null // will show only required rate
    : null;

  // Status evaluation
  let status: 'on_track' | 'slow' | 'fast' | null = null;
  if (requiredRate !== null && kgRemaining !== null) {
    // Healthy weekly rate for cut/bulk: 0.25-0.75 kg/week
    if (Math.abs(requiredRate) <= 0.75) status = 'on_track';
    else if (Math.abs(requiredRate) > 1.0) status = 'fast';
    else status = 'slow';
  }

  const statusLabel = status === 'on_track' ? '✅ On track' : status === 'slow' ? '⚠️ Lento' : status === 'fast' ? '🚀 Veloce' : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Il tuo obiettivo</h3>
        <Link href="/profile/goal" className="text-xs text-primary-500 hover:underline">
          Modifica →
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-lg">{goalIcon}</span>
        <span className="text-sm font-medium text-foreground">{goalLabel}</span>
        {statusLabel && (
          <span className="ml-auto text-xs font-medium text-muted-foreground">{statusLabel}</span>
        )}
      </div>

      {/* Peso corrente → target */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-bold text-foreground">{currentWeight ?? '—'} kg</span>
        <span className="text-muted-foreground">→</span>
        <span className="font-bold text-primary-500">{targetWeight} kg</span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-primary-500 rounded-full"
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{progressPct}% completato</span>
          {daysRemaining !== null && <span>{daysRemaining} giorni rimanenti</span>}
        </div>
      </div>

      {/* Rate info */}
      {requiredRate !== null && kgRemaining !== null && (
        <p className="text-xs text-muted-foreground">
          Necessari {Math.abs(kgRemaining)} kg in {daysRemaining} giorni → {requiredRate} kg/settimana
        </p>
      )}
    </div>
  );
}
