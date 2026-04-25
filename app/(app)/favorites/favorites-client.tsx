'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Star, Trash2, Plus, UtensilsCrossed } from 'lucide-react';
import { MEAL_TYPES } from '@/lib/constants';
import { getMealTypeLabel } from '@/lib/utils';
import type { FavoriteMeal } from '@/lib/types';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface Props {
  favorites: FavoriteMeal[];
}

export function FavoritesClient({ favorites: initialFavorites }: Props) {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteMeal[]>(initialFavorites);
  const [adding, setAdding] = useState<string | null>(null);

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/favorite-meals/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setFavorites((prev) => prev.filter((f) => f.id !== id));
      toast.success('Preferito eliminato');
    } catch {
      toast.error('Errore eliminazione preferito');
    }
  }

  async function handleAddToday(favId: string, mealType: MealType) {
    setAdding(favId);
    try {
      const res = await fetch('/api/meals/from-favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite_id: favId, meal_type: mealType }),
      });
      if (!res.ok) throw new Error();
      toast.success('Pasto aggiunto per oggi!');
      router.push('/dashboard');
      router.refresh();
    } catch {
      toast.error('Errore aggiunta pasto');
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="mx-auto max-w-md md:max-w-3xl px-4 pt-8 space-y-5 pb-8">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2">
          <Star className="h-6 w-6 text-yellow-400" />
          <h1 className="text-2xl font-bold text-foreground">Pasti preferiti</h1>
        </div>
        <p className="text-sm text-muted-foreground">I tuoi pasti salvati per riutilizzarli</p>
      </motion.div>

      {favorites.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center"
        >
          <UtensilsCrossed className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Nessun preferito ancora</p>
            <p className="text-xs text-muted-foreground/70">
              Premi la stella su un pasto per salvarlo
            </p>
          </div>
        </motion.div>
      ) : (
        <AnimatePresence>
          {favorites.map((fav, i) => (
            <FavoriteCard
              key={fav.id}
              fav={fav}
              index={i}
              adding={adding === fav.id}
              onDelete={handleDelete}
              onAddToday={handleAddToday}
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}

function FavoriteCard({
  fav,
  index,
  adding,
  onDelete,
  onAddToday,
}: {
  fav: FavoriteMeal;
  index: number;
  adding: boolean;
  onDelete: (id: string) => void;
  onAddToday: (id: string, mealType: MealType) => void;
}) {
  const [mealType, setMealType] = useState<MealType>('lunch');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-border bg-card p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{fav.name}</p>
          <div className="mt-1 flex gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="font-bold text-foreground">{Math.round(fav.total_calories ?? 0)} kcal</span>
            <span className="text-blue-400">P {Math.round(fav.total_protein_g ?? 0)}g</span>
            <span className="text-orange-400">C {Math.round(fav.total_carbs_g ?? 0)}g</span>
            <span className="text-pink-400">G {Math.round(fav.total_fat_g ?? 0)}g</span>
          </div>
        </div>
        <button
          onClick={() => onDelete(fav.id)}
          className="rounded-xl p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-950/30 transition-colors flex-shrink-0"
          aria-label="Elimina preferito"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2 items-center">
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value as MealType)}
          className="flex-1 appearance-none rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {MEAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {getMealTypeLabel(t)}
            </option>
          ))}
        </select>
        <button
          onClick={() => onAddToday(fav.id, mealType)}
          disabled={adding}
          className="flex items-center gap-1.5 rounded-xl bg-primary-500 px-3 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Aggiungi oggi
        </button>
      </div>
    </motion.div>
  );
}
