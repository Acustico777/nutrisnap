'use client';
import { useState } from 'react';
import type { Exercise } from '@/lib/types';

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Petto',
  back: 'Schiena',
  shoulders: 'Spalle',
  biceps: 'Bicipiti',
  triceps: 'Tricipiti',
  forearms: 'Avambracci',
  abs: 'Addominali',
  quadriceps: 'Quadricipiti',
  hamstrings: 'Femorali',
  glutes: 'Glutei',
  calves: 'Polpacci',
  traps: 'Trapezi',
  full_body: 'Corpo intero',
};

const EQUIPMENT_LABELS: Record<string, string> = {
  gym: 'Palestra',
  bodyweight: 'A corpo libero',
};

interface Props {
  exercise: Exercise;
}

export function ExerciseCard({ exercise }: Props) {
  const [imgSrc, setImgSrc] = useState<string>(
    exercise.gif_url ?? '/exercises/placeholder.svg'
  );

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative aspect-square w-full bg-muted/30 overflow-hidden">
        <img
          src={imgSrc}
          alt={exercise.name_it}
          loading="lazy"
          onError={() => setImgSrc('/exercises/placeholder.svg')}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <h3 className="text-sm font-bold text-foreground leading-tight">{exercise.name_it}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {exercise.description_it}
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-auto">
          <span className="inline-flex items-center rounded-full bg-primary-500/10 px-2 py-0.5 text-[10px] font-medium text-primary-500">
            {MUSCLE_LABELS[exercise.muscle_group] ?? exercise.muscle_group}
          </span>
          <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {EQUIPMENT_LABELS[exercise.equipment] ?? exercise.equipment}
          </span>
        </div>

        {/* Stats chips */}
        <div className="flex gap-1.5 flex-wrap">
          <span className="rounded-lg border border-border bg-muted/30 px-2 py-1 text-[10px] text-foreground font-medium">
            {exercise.default_sets} serie
          </span>
          <span className="rounded-lg border border-border bg-muted/30 px-2 py-1 text-[10px] text-foreground font-medium">
            {exercise.default_reps} rip.
          </span>
          <span className="rounded-lg border border-border bg-muted/30 px-2 py-1 text-[10px] text-foreground font-medium">
            {exercise.default_rest_sec}s riposo
          </span>
        </div>
      </div>
    </div>
  );
}
