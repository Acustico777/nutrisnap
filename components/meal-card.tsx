'use client';

import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatTime, getMealTypeLabel } from '@/lib/utils';
import type { Meal } from '@/lib/types';

interface MealCardProps {
  meal: Meal;
  onDelete?: (id: string) => void;
}

export function MealCard({ meal, onDelete }: MealCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
    >
      {/* Thumbnail */}
      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
        {meal.photo_url ? (
          <Image
            src={meal.photo_url}
            alt={getMealTypeLabel(meal.meal_type)}
            width={56}
            height={56}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">
            🍽️
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-primary-500 uppercase tracking-wide">
            {getMealTypeLabel(meal.meal_type)}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(meal.consumed_at)}
          </span>
        </div>
        <p className="mt-0.5 text-sm font-semibold text-foreground truncate">
          {meal.notes ?? getMealTypeLabel(meal.meal_type)}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-bold text-foreground">{Math.round(meal.total_calories)} kcal</span>
          <span className="text-blue-400">P {Math.round(meal.total_protein_g)}g</span>
          <span className="text-orange-400">C {Math.round(meal.total_carbs_g)}g</span>
          <span className="text-pink-400">G {Math.round(meal.total_fat_g)}g</span>
        </div>
      </div>

      {/* Delete */}
      {onDelete && (
        <button
          onClick={() => onDelete(meal.id)}
          className="flex-shrink-0 rounded-xl p-2 text-muted-foreground hover:text-red-400 hover:bg-red-950/30 transition-colors"
          aria-label="Elimina pasto"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
}
