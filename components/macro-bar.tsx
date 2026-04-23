'use client';

import { cn } from '@/lib/utils';

interface MacroBarProps {
  label: string;
  value: number;
  max: number;
  unit?: string;
  color: string;
  className?: string;
}

export function MacroBar({ label, value, max, unit = 'g', color, className }: MacroBarProps) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const remaining = Math.max(max - value, 0);

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {Math.round(value)}{unit} / {max}{unit}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {Math.round(remaining)}{unit} rimanenti
      </p>
    </div>
  );
}
