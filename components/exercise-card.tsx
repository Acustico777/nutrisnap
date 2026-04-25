'use client';
import { useState, useEffect, useMemo } from 'react';
import { Star } from 'lucide-react';
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
  isFavorite?: boolean;
  onToggleFavorite?: (exerciseId: string) => void;
}

export function ExerciseCard({ exercise, isFavorite, onToggleFavorite }: Props) {
  // free-exercise-db URLs end with "/0.jpg"; we alternate with "/1.jpg" to fake a GIF.
  const frames = useMemo<string[]>(() => {
    const url = exercise.gif_url;
    if (!url) return ['/exercises/placeholder.svg'];
    if (url.endsWith('/0.jpg')) {
      return [url, url.replace(/\/0\.jpg$/, '/1.jpg')];
    }
    return [url];
  }, [exercise.gif_url]);

  const [frameIdx, setFrameIdx] = useState(0);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (frames.length < 2) return;
    const id = setInterval(() => {
      setFrameIdx((i) => (i + 1) % frames.length);
    }, 700);
    return () => clearInterval(id);
  }, [frames.length]);

  const imgSrc = imgError ? '/exercises/placeholder.svg' : frames[frameIdx]!;

  const [localFavorite, setLocalFavorite] = useState<boolean>(isFavorite ?? false);

  // Keep in sync if parent prop changes
  const showStar = onToggleFavorite !== undefined;
  const starred = showStar ? (isFavorite ?? localFavorite) : false;

  function handleStarClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onToggleFavorite) return;
    setLocalFavorite((prev) => !prev);
    onToggleFavorite(exercise.id);
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative aspect-square w-full bg-muted/30 overflow-hidden">
        <img
          src={imgSrc}
          alt={exercise.name_it}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
        {showStar && (
          <button
            type="button"
            onClick={handleStarClick}
            aria-label={starred ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
            className="absolute top-2 right-2 flex items-center justify-center h-7 w-7 rounded-full bg-card/80 backdrop-blur-sm border border-border shadow-sm hover:bg-card transition-colors"
          >
            <Star
              className={`h-4 w-4 transition-colors ${
                starred ? 'text-primary-500 fill-current' : 'text-muted-foreground'
              }`}
            />
          </button>
        )}
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
