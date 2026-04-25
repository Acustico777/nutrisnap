'use client';

import { motion } from 'framer-motion';

interface Props {
  current: number;
  longest?: number;
  compact?: boolean;
}

export function StreakBadge({ current, longest, compact = false }: Props) {
  const active = current > 0;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <motion.span
          animate={active ? { scale: [1, 1.25, 1] } : {}}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          className="text-lg leading-none"
        >
          {active ? '🔥' : '❄️'}
        </motion.span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-foreground">{current}</span>
          <span className="text-[10px] text-muted-foreground">giorni</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Streak attuale</h3>
        {longest !== undefined && longest > 0 && (
          <span className="text-xs text-muted-foreground">Record: {longest} gg</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <motion.div
          animate={active ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="text-4xl"
        >
          {active ? '🔥' : '❄️'}
        </motion.div>
        <div>
          <p className="text-3xl font-bold text-foreground">{current}</p>
          <p className="text-xs text-muted-foreground">
            {current === 1 ? 'giorno consecutivo' : 'giorni consecutivi'}
          </p>
        </div>
      </div>

      {current === 0 && (
        <p className="text-xs text-muted-foreground">
          Registra almeno un pasto oggi per iniziare la tua streak!
        </p>
      )}
    </div>
  );
}
