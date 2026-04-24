'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronDown } from 'lucide-react';
import { PhotoCapture } from '@/components/photo-capture';
import { FoodItemEditor } from '@/components/food-item-editor';
import { Button } from '@/components/ui/button';
import { getMealTypeLabel } from '@/lib/utils';
import type { AnalyzedFoodItem, AnalyzeResponse } from '@/lib/types';
import { MEAL_TYPES } from '@/lib/constants';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

type Phase = 'capture' | 'analyzing' | 'confirm' | 'saving';

export default function ScanPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('capture');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [items, setItems] = useState<AnalyzedFoodItem[]>([]);
  const [confidence, setConfidence] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [mealType, setMealType] = useState<MealType>('lunch');

  async function handleCapture(file: File) {
    setCapturedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPhase('analyzing');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];

        const res = await fetch('/api/analyze-meal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 }),
        });

        const data = await res.json() as AnalyzeResponse & { error?: string };

        if (!res.ok || data.error) {
          toast.error(data.error ?? 'Analisi fallita. Riprova.');
          setPhase('capture');
          return;
        }

        setItems(data.items ?? []);
        setConfidence(data.confidence ?? '');
        setNotes(data.notes ?? '');
        setPhase('confirm');
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Errore durante l\'analisi. Riprova.');
      setPhase('capture');
    }
  }

  async function handleSave() {
    if (items.length === 0) {
      toast.error('Aggiungi almeno un alimento.');
      return;
    }

    setPhase('saving');

    try {
      let photoBase64: string | undefined;
      if (capturedFile) {
        const reader = new FileReader();
        photoBase64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(capturedFile);
        });
      }

      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          mealType,
          notes,
          photoBase64,
          photoMimeType: capturedFile?.type ?? 'image/jpeg',
        }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Salvataggio fallito');
      }

      toast.success('Pasto salvato!');
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore salvataggio');
      setPhase('confirm');
    }
  }

  const totalCalories = items.reduce((s, i) => s + i.calories * i.quantity, 0);

  return (
    <div className="mx-auto max-w-md px-4 pt-8 space-y-5">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Scansiona pasto</h1>
        <p className="text-sm text-muted-foreground">Foto → AI analizza → tu confermi</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {phase === 'capture' && (
          <motion.div
            key="capture"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <PhotoCapture onCapture={handleCapture} />
            <p className="text-center text-sm text-muted-foreground">
              Preferisci inserire manualmente?{' '}
              <Link href="/add" className="text-primary-500 hover:underline font-medium">
                → Aggiungi a mano
              </Link>
            </p>
          </motion.div>
        )}

        {phase === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-10"
          >
            {previewUrl && (
              <div className="relative h-48 w-full overflow-hidden rounded-2xl">
                <Image
                  src={previewUrl}
                  alt="Foto pasto"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm font-medium">Analisi con AI…</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {(phase === 'confirm' || phase === 'saving') && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Preview */}
            {previewUrl && (
              <div className="relative h-40 w-full overflow-hidden rounded-2xl">
                <Image src={previewUrl} alt="Foto pasto" fill className="object-cover" />
                {confidence && (
                  <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                    {confidence === 'high' ? '✓ Alta' : confidence === 'medium' ? '~ Media' : '? Bassa'} confidenza
                  </span>
                )}
              </div>
            )}

            {/* Meal type */}
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

            {/* Items editor */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2">
                Alimenti rilevati ({items.length})
              </h2>
              <FoodItemEditor items={items} onChange={setItems} />
            </div>

            {/* Totals */}
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="text-sm font-semibold text-foreground mb-1">Totale pasto</p>
              <div className="flex gap-4 text-sm">
                <span className="font-bold text-primary-500">{Math.round(totalCalories)} kcal</span>
                <span className="text-blue-400">P {Math.round(items.reduce((s, i) => s + i.protein_g * i.quantity, 0))}g</span>
                <span className="text-orange-400">C {Math.round(items.reduce((s, i) => s + i.carbs_g * i.quantity, 0))}g</span>
                <span className="text-pink-400">G {Math.round(items.reduce((s, i) => s + i.fat_g * i.quantity, 0))}g</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setPhase('capture'); setPreviewUrl(null); setItems([]); }}
                disabled={phase === 'saving'}
                className="flex-1"
              >
                Riprova
              </Button>
              <Button
                onClick={handleSave}
                disabled={phase === 'saving'}
                className="flex-1"
              >
                {phase === 'saving' ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…</>
                ) : (
                  'Salva pasto'
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
