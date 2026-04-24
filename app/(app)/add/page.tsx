'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Sparkles, Save, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getMealTypeLabel } from '@/lib/utils';
import { MEAL_TYPES } from '@/lib/constants';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface EstimateResult {
  name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  category: string;
}

export default function AddPage() {
  const router = useRouter();
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [name, setName] = useState('');
  const [grams, setGrams] = useState(100);
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);

  const canEstimate = name.trim().length > 0 && grams >= 1;

  async function handleEstimate() {
    if (!canEstimate) return;
    setEstimating(true);
    try {
      const res = await fetch('/api/estimate-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), grams }),
      });
      const data = await res.json() as EstimateResult & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? 'Errore stima');
      setEstimate(data);
      setCalories(String(data.calories));
      toast.success('Stima completata');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante la stima');
    } finally {
      setEstimating(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Inserisci il nome dell\'alimento');
      return;
    }
    if (grams < 1) {
      toast.error('La quantità deve essere almeno 1g');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        grams,
        mealType,
      };
      if (calories !== '') body.calories = Number(calories);
      if (notes.trim()) body.notes = notes.trim();

      const res = await fetch('/api/meals/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { meal?: unknown; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? 'Salvataggio fallito');
      toast.success('Pasto salvato!');
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-8 space-y-5 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Aggiungi pasto manualmente</h1>
        <p className="text-sm text-muted-foreground">Inserisci i dettagli del tuo pasto</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-5 space-y-4"
      >
        {/* Meal type */}
        <div className="space-y-2">
          <Label>Tipo pasto</Label>
          <div className="relative">
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
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {/* Food name */}
        <div className="space-y-2">
          <Label htmlFor="food-name">Nome alimento</Label>
          <Input
            id="food-name"
            type="text"
            placeholder="es. Pasta al pomodoro"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Grams */}
        <div className="space-y-2">
          <Label htmlFor="food-grams">Quantità (g)</Label>
          <Input
            id="food-grams"
            type="number"
            min={1}
            value={grams}
            onChange={(e) => setGrams(Number(e.target.value))}
          />
        </div>

        {/* Calories */}
        <div className="space-y-2">
          <Label htmlFor="food-calories">Calorie (opzionale)</Label>
          <Input
            id="food-calories"
            type="number"
            min={0}
            placeholder="Lascia vuoto per stimare con AI"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="food-notes">Note (opzionale)</Label>
          <textarea
            id="food-notes"
            placeholder="Aggiungi una nota…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Estimate button */}
        <Button
          variant="outline"
          onClick={handleEstimate}
          disabled={!canEstimate || estimating}
          className="w-full"
        >
          {estimating ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Stima in corso…</>
          ) : (
            <><Sparkles className="mr-2 h-4 w-4" /> Stima nutrienti</>
          )}
        </Button>

        {/* Estimate result */}
        {estimate && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-muted/30 p-3"
          >
            <p className="text-xs font-semibold text-muted-foreground mb-2">Stima AI per {estimate.grams}g</p>
            <div className="flex gap-4 text-sm flex-wrap">
              <span className="font-bold text-primary-500">{estimate.calories} kcal</span>
              <span className="text-blue-400">P {estimate.protein_g}g</span>
              <span className="text-orange-400">C {estimate.carbs_g}g</span>
              <span className="text-pink-400">G {estimate.fat_g}g</span>
            </div>
          </motion.div>
        )}

        {/* Save button */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvataggio…</>
          ) : (
            <><Save className="mr-2 h-4 w-4" /> Salva pasto</>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
