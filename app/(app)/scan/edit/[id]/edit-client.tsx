'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, ChevronDown, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FoodItemEditor } from '@/components/food-item-editor';
import { getMealTypeLabel } from '@/lib/utils';
import { MEAL_TYPES } from '@/lib/constants';
import type { Meal, AnalyzedFoodItem } from '@/lib/types';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface Props {
  meal: Meal;
}

export function EditMealClient({ meal }: Props) {
  const router = useRouter();
  const [mealType, setMealType] = useState<MealType>(meal.meal_type);
  const [notes, setNotes] = useState<string>(meal.notes ?? '');
  const [items, setItems] = useState<AnalyzedFoodItem[]>(
    (meal.meal_items ?? []).map((mi) => ({
      name: mi.name,
      quantity: mi.quantity,
      unit: mi.unit,
      calories: mi.calories,
      protein_g: mi.protein_g,
      carbs_g: mi.carbs_g,
      fat_g: mi.fat_g,
      category: mi.category,
      fiber_g: mi.fiber_g,
      sugar_g: mi.sugar_g,
      sodium_mg: mi.sodium_mg,
    }))
  );
  const [saving, setSaving] = useState(false);

  const totalCalories = items.reduce((s, i) => s + i.calories, 0);

  async function handleSave() {
    if (items.length === 0) {
      toast.error('Aggiungi almeno un alimento.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/meals/${meal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, mealType, notes: notes || null }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Salvataggio fallito');
      }
      toast.success('Pasto aggiornato!');
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore salvataggio');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md md:max-w-3xl px-4 pt-8 space-y-5 pb-8">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </button>
        <h1 className="text-2xl font-bold text-foreground">Modifica pasto</h1>
        <p className="text-sm text-muted-foreground">Aggiorna alimenti e tipo pasto</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        {/* Photo preview */}
        {meal.photo_url && (
          <div className="relative h-40 w-full overflow-hidden rounded-2xl">
            <Image src={meal.photo_url} alt="Foto pasto" fill className="object-cover" />
          </div>
        )}

        {/* Meal type */}
        <div className="relative">
          <label className="text-xs text-muted-foreground mb-1 block">Tipo pasto</label>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value as MealType)}
            className="w-full appearance-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {MEAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {getMealTypeLabel(t)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-[65%] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Note (opzionale)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Aggiungi una nota…"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Items editor */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2">
            Alimenti ({items.length})
          </h2>
          <FoodItemEditor items={items} onChange={setItems} />
        </div>

        {/* Totals */}
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-sm font-semibold text-foreground mb-1">Totale pasto</p>
          <div className="flex gap-4 text-sm">
            <span className="font-bold text-primary-500">{Math.round(totalCalories)} kcal</span>
            <span className="text-blue-400">P {Math.round(items.reduce((s, i) => s + i.protein_g, 0))}g</span>
            <span className="text-orange-400">C {Math.round(items.reduce((s, i) => s + i.carbs_g, 0))}g</span>
            <span className="text-pink-400">G {Math.round(items.reduce((s, i) => s + i.fat_g, 0))}g</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
            className="flex-1"
          >
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…</>
            ) : (
              'Salva modifiche'
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
