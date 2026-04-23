'use client';

import { Trash2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { AnalyzedFoodItem } from '@/lib/types';

interface FoodItemEditorProps {
  items: AnalyzedFoodItem[];
  onChange: (items: AnalyzedFoodItem[]) => void;
}

const emptyItem = (): AnalyzedFoodItem => ({
  name: '',
  quantity: 1,
  unit: 'porzione',
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
});

export function FoodItemEditor({ items, onChange }: FoodItemEditorProps) {
  const update = (index: number, field: keyof AnalyzedFoodItem, value: string | number) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...items, emptyItem()]);
  };

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              value={item.name}
              onChange={(e) => update(i, 'name', e.target.value)}
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

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Quantità</label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={item.quantity}
                onChange={(e) => update(i, 'quantity', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Unità</label>
              <Input
                value={item.unit}
                onChange={(e) => update(i, 'unit', e.target.value)}
                placeholder="porzione"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Kcal</label>
              <Input
                type="number"
                min={0}
                value={item.calories}
                onChange={(e) => update(i, 'calories', parseFloat(e.target.value) || 0)}
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
                onChange={(e) => update(i, 'protein_g', parseFloat(e.target.value) || 0)}
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
                onChange={(e) => update(i, 'carbs_g', parseFloat(e.target.value) || 0)}
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
                onChange={(e) => update(i, 'fat_g', parseFloat(e.target.value) || 0)}
                className="text-center"
              />
            </div>
          </div>

          <p className="text-right text-xs font-semibold text-primary-500">
            Totale: {Math.round(item.calories * item.quantity)} kcal
          </p>
        </div>
      ))}

      <Button variant="outline" onClick={add} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Aggiungi alimento
      </Button>
    </div>
  );
}
