'use client';

import { Trash2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { AnalyzedFoodItem } from '@/lib/types';

interface FoodItemEditorProps {
  items: AnalyzedFoodItem[];
  onChange: (items: AnalyzedFoodItem[]) => void;
}

const GRAM_PRESETS = [50, 100, 150, 200, 250, 300];

function isGramUnit(unit: string): boolean {
  return unit === 'g' || unit === 'grams' || unit === 'gr' || unit === 'grammi';
}

/** Derive the current grams from an item */
function getItemGrams(item: AnalyzedFoodItem): number {
  if (isGramUnit(item.unit)) return item.quantity;
  // Fallback: treat quantity as multiplier of 100g portion
  return Math.round(item.quantity * 100);
}

const emptyItem = (): AnalyzedFoodItem => ({
  name: '',
  quantity: 100,
  unit: 'g',
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
});

export function FoodItemEditor({ items, onChange }: FoodItemEditorProps) {
  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...items, emptyItem()]);
  };

  const updateField = (index: number, field: keyof AnalyzedFoodItem, value: string | number) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  const updateGrams = (index: number, newGrams: number) => {
    const item = items[index];
    const oldGrams = getItemGrams(item);
    if (oldGrams <= 0 || newGrams <= 0) {
      // Just update quantity/unit
      onChange(items.map((it, i) => i === index ? { ...it, quantity: newGrams, unit: 'g' } : it));
      return;
    }
    const factor = newGrams / oldGrams;
    onChange(items.map((it, i) =>
      i === index
        ? {
            ...it,
            quantity: newGrams,
            unit: 'g',
            calories: Math.round(it.calories * factor * 10) / 10,
            protein_g: Math.round(it.protein_g * factor * 10) / 10,
            carbs_g: Math.round(it.carbs_g * factor * 10) / 10,
            fat_g: Math.round(it.fat_g * factor * 10) / 10,
            fiber_g: it.fiber_g != null ? Math.round(it.fiber_g * factor * 10) / 10 : undefined,
            sugar_g: it.sugar_g != null ? Math.round(it.sugar_g * factor * 10) / 10 : undefined,
            sodium_mg: it.sodium_mg != null ? Math.round(it.sodium_mg * factor) : undefined,
          }
        : it
    ));
  };

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const grams = getItemGrams(item);
        return (
          <div key={i} className="rounded-2xl border border-border bg-card p-3 space-y-2">
            {/* Name + delete */}
            <div className="flex items-center gap-2">
              <Input
                value={item.name}
                onChange={(e) => updateField(i, 'name', e.target.value)}
                placeholder="Nome alimento"
                className="flex-1"
              />
              <button
                onClick={() => remove(i)}
                className="flex-shrink-0 rounded-xl p-2 text-muted-foreground hover:text-red-400 hover:bg-red-950/30 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Grams row */}
            <div>
              <label className="text-xs text-muted-foreground">Grammi</label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={grams}
                  onChange={(e) => updateGrams(i, parseFloat(e.target.value) || 0)}
                  className="w-20 text-center"
                />
                <div className="flex gap-1 flex-wrap">
                  {GRAM_PRESETS.map((p) => (
                    <button
                      key={p}
                      onClick={() => updateGrams(i, p)}
                      className={`rounded-lg px-2 py-0.5 text-xs font-medium border transition-colors ${
                        grams === p
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                      }`}
                    >
                      {p}g
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Macros */}
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Kcal</label>
                <Input
                  type="number"
                  min={0}
                  value={item.calories}
                  onChange={(e) => updateField(i, 'calories', parseFloat(e.target.value) || 0)}
                  className="text-center"
                />
              </div>
              <div>
                <label className="text-xs text-blue-400">Prot (g)</label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={item.protein_g}
                  onChange={(e) => updateField(i, 'protein_g', parseFloat(e.target.value) || 0)}
                  className="text-center"
                />
              </div>
              <div>
                <label className="text-xs text-orange-400">Carb (g)</label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={item.carbs_g}
                  onChange={(e) => updateField(i, 'carbs_g', parseFloat(e.target.value) || 0)}
                  className="text-center"
                />
              </div>
              <div>
                <label className="text-xs text-pink-400">Gras (g)</label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={item.fat_g}
                  onChange={(e) => updateField(i, 'fat_g', parseFloat(e.target.value) || 0)}
                  className="text-center"
                />
              </div>
            </div>

            <p className="text-right text-xs font-semibold text-primary-500">
              {Math.round(item.calories)} kcal
            </p>
          </div>
        );
      })}

      <Button variant="outline" onClick={add} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Aggiungi alimento
      </Button>
    </div>
  );
}
