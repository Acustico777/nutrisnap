'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Apple, Dumbbell, Target, ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  ACTIVITY_LABELS,
  DIET_LABELS,
  DIET_PREFERENCES,
  GOAL_LABELS,
  calculateBMR,
  calculateBMRKatch,
  calculateTDEE,
  calorieTargetForGoal,
  macroSplitForGoal,
} from '@/lib/nutrition';
import type { ActivityLevel, Goal, DietPreference } from '@/lib/nutrition';
import type { Profile } from '@/lib/types';

interface Props {
  profile: Profile | null;
}

interface WizardState {
  // Step 2
  sex: 'male' | 'female' | null;
  age: string;
  height_cm: string;
  weight_kg: string;
  activity_level: ActivityLevel;
  // Step 3
  body_fat_percent: string;
  lean_mass_kg: string;
  fat_mass_kg: string;
  // Step 4
  goal: Goal;
  target_weight_kg: string;
  goal_target_date: string;
  // Step 5
  path_preference: 'nutrition' | 'workout' | 'both' | null;
  // Step 5b
  diet_preference: DietPreference;
  excluded_foods: string[];
  excluded_input: string;
  // Step 5c
  days_per_week: number | null;
  workout_location: 'gym' | 'home' | null;
}

const TOTAL_STEPS = 6;

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

function computePreview(state: WizardState) {
  const weight = parseFloat(state.weight_kg);
  const height = parseFloat(state.height_cm);
  const age    = parseInt(state.age);
  const bf     = parseFloat(state.body_fat_percent);
  const lean   = parseFloat(state.lean_mass_kg);

  if (!weight || !height || !age || !state.sex) return null;

  const leanMass = !isNaN(lean) ? lean : (!isNaN(bf) ? weight * (1 - bf / 100) : null);

  const bmr = leanMass != null
    ? calculateBMRKatch(leanMass)
    : calculateBMR({ sex: state.sex, weight_kg: weight, height_cm: height, age });

  const tdee = calculateTDEE(bmr, state.activity_level);
  const calories = calorieTargetForGoal(tdee, state.goal);
  const macros = macroSplitForGoal(calories, state.goal);

  return { bmr, tdee, calories, macros };
}

export function OnboardingClient({ profile }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState<WizardState>({
    sex: (profile?.sex as 'male' | 'female' | null) ?? null,
    age: profile?.age?.toString() ?? '',
    height_cm: profile?.height_cm?.toString() ?? '',
    weight_kg: profile?.weight_kg?.toString() ?? '',
    activity_level: profile?.activity_level ?? 'moderate',
    body_fat_percent: profile?.body_fat_percent?.toString() ?? '',
    lean_mass_kg: profile?.lean_mass_kg?.toString() ?? '',
    fat_mass_kg: profile?.fat_mass_kg?.toString() ?? '',
    goal: profile?.goal ?? 'maintain',
    target_weight_kg: profile?.target_weight_kg?.toString() ?? '',
    goal_target_date: profile?.goal_target_date ?? '',
    path_preference: profile?.path_preference ?? null,
    diet_preference: (profile?.diet_preference as DietPreference) ?? 'none',
    excluded_foods: profile?.excluded_foods ?? [],
    excluded_input: '',
    days_per_week: profile?.days_per_week ?? null,
    workout_location: profile?.workout_location ?? null,
  });

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState(prev => {
      const next = { ...prev, [key]: value };
      // Auto-calcola lean/fat quando BF% cambia
      if (key === 'body_fat_percent') {
        const w = parseFloat(next.weight_kg);
        const bf = parseFloat(value as string);
        if (!isNaN(w) && !isNaN(bf) && bf > 0) {
          next.lean_mass_kg = (w * (1 - bf / 100)).toFixed(1);
          next.fat_mass_kg  = (w * (bf / 100)).toFixed(1);
        }
      }
      return next;
    });
  }

  // Calcola indice dello step effettivo tenendo conto degli step condizionali
  // Steps: 0=welcome, 1=dati, 2=composizione, 3=obiettivo, 4=percorso, 5=riepilogo
  // Tra 4 e 5 ci sono 5b e 5c (indici interni 4a, 4b)
  const [subStep, setSubStep] = useState<'main' | '5b' | '5c'>('main');

  function getStepLabel() {
    if (step === 4 && subStep === '5b') return 'Preferenze alimentari';
    if (step === 4 && subStep === '5c') return 'Setup allenamento';
    const labels = ['Benvenuto', 'Dati fisici', 'Composizione corporea', 'Obiettivo', 'Percorso', 'Riepilogo'];
    return labels[step] ?? '';
  }

  function progressPercent() {
    // Stima progresso basata su step + substep
    const base = (step / (TOTAL_STEPS - 1)) * 100;
    return Math.min(100, Math.round(base));
  }

  function validateStep(): string | null {
    if (step === 1) {
      if (!state.sex) return 'Seleziona il sesso';
      if (!state.age || parseInt(state.age) < 10 || parseInt(state.age) > 120) return 'Inserisci un\'età valida (10-120)';
      if (!state.height_cm || parseFloat(state.height_cm) < 100 || parseFloat(state.height_cm) > 250) return 'Inserisci un\'altezza valida (100-250 cm)';
      if (!state.weight_kg || parseFloat(state.weight_kg) < 30 || parseFloat(state.weight_kg) > 300) return 'Inserisci un peso valido (30-300 kg)';
    }
    if (step === 4 && subStep === 'main') {
      if (!state.path_preference) return 'Seleziona un percorso';
    }
    return null;
  }

  function goNext() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);

    if (step === 4 && subStep === 'main') {
      const path = state.path_preference;
      if (path === 'nutrition' || path === 'both') {
        setDir(1); setSubStep('5b'); return;
      }
      if (path === 'workout') {
        setDir(1); setSubStep('5c'); return;
      }
    }
    if (step === 4 && subStep === '5b') {
      if (state.path_preference === 'both') {
        setDir(1); setSubStep('5c'); return;
      }
      setDir(1); setStep(5); setSubStep('main'); return;
    }
    if (step === 4 && subStep === '5c') {
      setDir(1); setStep(5); setSubStep('main'); return;
    }

    setDir(1);
    setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function goBack() {
    setError(null);
    if (step === 5 && subStep === 'main') {
      const path = state.path_preference;
      if (path === 'workout') { setDir(-1); setSubStep('5c'); setStep(4); return; }
      if (path === 'nutrition') { setDir(-1); setSubStep('5b'); setStep(4); return; }
      if (path === 'both') { setDir(-1); setSubStep('5c'); setStep(4); return; }
    }
    if (step === 4 && subStep === '5c') {
      if (state.path_preference === 'both') { setDir(-1); setSubStep('5b'); return; }
      setDir(-1); setSubStep('main'); return;
    }
    if (step === 4 && subStep === '5b') {
      setDir(-1); setSubStep('main'); return;
    }
    setDir(-1);
    setStep(s => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sex: state.sex,
          age: parseInt(state.age),
          height_cm: parseFloat(state.height_cm),
          weight_kg: parseFloat(state.weight_kg),
          activity_level: state.activity_level,
          body_fat_percent: state.body_fat_percent ? parseFloat(state.body_fat_percent) : null,
          lean_mass_kg: state.lean_mass_kg ? parseFloat(state.lean_mass_kg) : null,
          fat_mass_kg: state.fat_mass_kg ? parseFloat(state.fat_mass_kg) : null,
          goal: state.goal,
          target_weight_kg: state.target_weight_kg ? parseFloat(state.target_weight_kg) : null,
          goal_target_date: state.goal_target_date || null,
          path_preference: state.path_preference,
          diet_preference: state.diet_preference,
          excluded_foods: state.excluded_foods,
          days_per_week: state.days_per_week,
          workout_location: state.workout_location,
        }),
      });
      const data = await res.json() as { error?: string; profile?: unknown };
      if (!res.ok) {
        setError((data.error as string) ?? 'Errore durante il salvataggio');
        return;
      }
      // Redirect in base al path_preference
      if (state.path_preference === 'workout') {
        router.push('/workout');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  const preview = computePreview(state);

  const isFirstStep = step === 0;
  const isLastStep  = step === TOTAL_STEPS - 1 && subStep === 'main';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start px-4 py-8">
      {/* Progress bar */}
      {step > 0 && (
        <div className="w-full max-w-md mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">{getStepLabel()}</span>
            <span className="text-xs text-muted-foreground">{progressPercent()}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent()}%` }}
            />
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={`${step}-${subStep}`}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: 'easeInOut' }}
          >
            {/* STEP 0 — Benvenuto */}
            {step === 0 && (
              <div className="flex flex-col items-center gap-6 pt-12 text-center">
                <div className="w-20 h-20 rounded-3xl bg-primary-500/10 flex items-center justify-center">
                  <Leaf className="w-10 h-10 text-primary-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">Ciao! Benvenuto in NutriSnap</h1>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Configuriamo il tuo profilo in pochi minuti per personalizzare la tua esperienza.
                  </p>
                </div>
                <Button size="lg" className="w-full mt-4" onClick={() => { setDir(1); setStep(1); }}>
                  Iniziamo
                </Button>
              </div>
            )}

            {/* STEP 1 — Dati fisici */}
            {step === 1 && (
              <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-5">
                <h2 className="text-xl font-bold text-foreground">Dati fisici di base</h2>

                {/* Sesso */}
                <div>
                  <Label className="mb-2 block">Sesso</Label>
                  <div className="flex gap-3">
                    {(['male', 'female'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => update('sex', s)}
                        className={cn(
                          'flex-1 h-11 rounded-xl border text-sm font-medium transition-colors',
                          state.sex === s
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'border-border text-foreground hover:bg-muted'
                        )}
                      >
                        {s === 'male' ? 'Maschio' : 'Femmina'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Eta */}
                <div>
                  <Label htmlFor="age" className="mb-1.5 block">Eta (anni)</Label>
                  <Input
                    id="age"
                    type="number"
                    min={10}
                    max={120}
                    placeholder="es. 30"
                    value={state.age}
                    onChange={e => update('age', e.target.value)}
                  />
                </div>

                {/* Altezza */}
                <div>
                  <Label htmlFor="height" className="mb-1.5 block">Altezza (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    min={100}
                    max={250}
                    placeholder="es. 175"
                    value={state.height_cm}
                    onChange={e => update('height_cm', e.target.value)}
                  />
                </div>

                {/* Peso */}
                <div>
                  <Label htmlFor="weight" className="mb-1.5 block">Peso (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min={30}
                    max={300}
                    step={0.1}
                    placeholder="es. 75"
                    value={state.weight_kg}
                    onChange={e => update('weight_kg', e.target.value)}
                  />
                </div>

                {/* Livello attivita */}
                <div>
                  <Label htmlFor="activity" className="mb-1.5 block">Livello di attivita</Label>
                  <select
                    id="activity"
                    value={state.activity_level}
                    onChange={e => update('activity_level', e.target.value as ActivityLevel)}
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {(Object.entries(ACTIVITY_LABELS) as [ActivityLevel, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* STEP 2 — Composizione corporea */}
            {step === 2 && (
              <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-5">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Composizione corporea</h2>
                  <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2.5">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-primary-500" />
                    <span>Tutti i campi sono opzionali. Se non li conosci, salta — useremo la formula standard (Mifflin-St Jeor).</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="bf" className="mb-1.5 block">% massa grassa (3-60)</Label>
                  <Input
                    id="bf"
                    type="number"
                    min={3}
                    max={60}
                    step={0.1}
                    placeholder="es. 18"
                    value={state.body_fat_percent}
                    onChange={e => update('body_fat_percent', e.target.value)}
                  />
                  {state.body_fat_percent && state.lean_mass_kg && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Calcolato: massa magra {state.lean_mass_kg} kg · massa grassa {state.fat_mass_kg} kg
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lean" className="mb-1.5 block">Massa magra (kg)</Label>
                  <Input
                    id="lean"
                    type="number"
                    min={20}
                    max={200}
                    step={0.1}
                    placeholder="es. 61.5"
                    value={state.lean_mass_kg}
                    onChange={e => update('lean_mass_kg', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="fat" className="mb-1.5 block">Massa grassa (kg)</Label>
                  <Input
                    id="fat"
                    type="number"
                    min={1}
                    max={200}
                    step={0.1}
                    placeholder="es. 13.5"
                    value={state.fat_mass_kg}
                    onChange={e => update('fat_mass_kg', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* STEP 3 — Obiettivo */}
            {step === 3 && (
              <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-5">
                <h2 className="text-xl font-bold text-foreground">Qual e il tuo obiettivo?</h2>

                <div className="flex flex-col gap-3">
                  {(Object.entries(GOAL_LABELS) as [Goal, string][]).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => update('goal', k)}
                      className={cn(
                        'h-12 rounded-xl border text-sm font-medium transition-colors text-left px-4',
                        state.goal === k
                          ? 'bg-primary-500 border-primary-500 text-white'
                          : 'border-border text-foreground hover:bg-muted'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {(state.goal === 'cut' || state.goal === 'lean_bulk') && (
                  <div className="flex flex-col gap-4 mt-1">
                    <div>
                      <Label htmlFor="target_w" className="mb-1.5 block">Peso obiettivo (kg) — opzionale</Label>
                      <Input
                        id="target_w"
                        type="number"
                        min={30}
                        max={300}
                        step={0.1}
                        placeholder="es. 70"
                        value={state.target_weight_kg}
                        onChange={e => update('target_weight_kg', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="target_d" className="mb-1.5 block">Data target — opzionale</Label>
                      <Input
                        id="target_d"
                        type="date"
                        value={state.goal_target_date}
                        onChange={e => update('goal_target_date', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Anteprima TDEE */}
                {preview && (
                  <div className="mt-2 bg-primary-500/8 border border-primary-500/20 rounded-xl p-4 text-sm">
                    <p className="font-medium text-foreground mb-2">Anteprima calcoli</p>
                    <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                      <span>BMR:</span><span className="text-foreground font-medium">{preview.bmr} kcal</span>
                      <span>TDEE:</span><span className="text-foreground font-medium">{preview.tdee} kcal</span>
                      <span>Target:</span><span className="text-foreground font-medium">{preview.calories} kcal</span>
                      <span>Proteine:</span><span className="text-foreground font-medium">{preview.macros.protein_g} g</span>
                      <span>Carboidrati:</span><span className="text-foreground font-medium">{preview.macros.carbs_g} g</span>
                      <span>Grassi:</span><span className="text-foreground font-medium">{preview.macros.fat_g} g</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4 — Percorso */}
            {step === 4 && subStep === 'main' && (
              <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-5">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Su cosa vuoi concentrarti?</h2>
                  <p className="text-sm text-muted-foreground mt-1">Puoi cambiarlo in qualsiasi momento dalle impostazioni.</p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => update('path_preference', 'nutrition')}
                    className={cn(
                      'rounded-2xl border p-4 text-left transition-colors',
                      state.path_preference === 'nutrition'
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'border-border hover:bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Apple className="w-6 h-6" />
                      <div>
                        <p className="font-semibold text-sm">Solo Alimentazione</p>
                        <p className={cn('text-xs mt-0.5', state.path_preference === 'nutrition' ? 'text-white/70' : 'text-muted-foreground')}>
                          Traccia pasti, calorie e macros
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => update('path_preference', 'workout')}
                    className={cn(
                      'rounded-2xl border p-4 text-left transition-colors',
                      state.path_preference === 'workout'
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'border-border hover:bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Dumbbell className="w-6 h-6" />
                      <div>
                        <p className="font-semibold text-sm">Solo Allenamento</p>
                        <p className={cn('text-xs mt-0.5', state.path_preference === 'workout' ? 'text-white/70' : 'text-muted-foreground')}>
                          Piani e sessioni di allenamento
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => update('path_preference', 'both')}
                    className={cn(
                      'rounded-2xl border p-4 text-left transition-colors',
                      state.path_preference === 'both'
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'border-border hover:bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Target className="w-6 h-6" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">Entrambi</p>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', state.path_preference === 'both' ? 'bg-white/20 text-white' : 'bg-primary-500/10 text-primary-500')}>
                            Consigliato
                          </span>
                        </div>
                        <p className={cn('text-xs mt-0.5', state.path_preference === 'both' ? 'text-white/70' : 'text-muted-foreground')}>
                          Approccio completo: cibo + allenamento
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5b — Preferenze alimentari */}
            {step === 4 && subStep === '5b' && (
              <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-5">
                <h2 className="text-xl font-bold text-foreground">Preferenze alimentari</h2>

                <div>
                  <Label htmlFor="diet" className="mb-1.5 block">Tipo di dieta</Label>
                  <select
                    id="diet"
                    value={state.diet_preference}
                    onChange={e => update('diet_preference', e.target.value as DietPreference)}
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {DIET_PREFERENCES.map(d => (
                      <option key={d} value={d}>{DIET_LABELS[d]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="mb-1.5 block">Alimenti da escludere</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="es. latticini"
                      value={state.excluded_input}
                      onChange={e => update('excluded_input', e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const v = state.excluded_input.trim().toLowerCase();
                          if (v && !state.excluded_foods.includes(v)) {
                            setState(prev => ({
                              ...prev,
                              excluded_foods: [...prev.excluded_foods, v],
                              excluded_input: '',
                            }));
                          }
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => {
                        const v = state.excluded_input.trim().toLowerCase();
                        if (v && !state.excluded_foods.includes(v)) {
                          setState(prev => ({
                            ...prev,
                            excluded_foods: [...prev.excluded_foods, v],
                            excluded_input: '',
                          }));
                        }
                      }}
                    >
                      Aggiungi
                    </Button>
                  </div>

                  {state.excluded_foods.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {state.excluded_foods.map(food => (
                        <span
                          key={food}
                          className="inline-flex items-center gap-1 bg-muted text-foreground text-xs px-2.5 py-1 rounded-full"
                        >
                          {food}
                          <button
                            type="button"
                            onClick={() => setState(prev => ({ ...prev, excluded_foods: prev.excluded_foods.filter(f => f !== food) }))}
                            className="text-muted-foreground hover:text-foreground ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5c — Setup allenamento */}
            {step === 4 && subStep === '5c' && (
              <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-5">
                <h2 className="text-xl font-bold text-foreground">Setup allenamento</h2>

                <div>
                  <Label className="mb-2 block">Giorni di allenamento a settimana</Label>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4, 5, 6].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => update('days_per_week', d)}
                        className={cn(
                          'w-11 h-11 rounded-xl border text-sm font-semibold transition-colors',
                          state.days_per_week === d
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'border-border text-foreground hover:bg-muted'
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Dove ti alleni?</Label>
                  <div className="flex gap-3">
                    {(['gym', 'home'] as const).map(loc => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => update('workout_location', loc)}
                        className={cn(
                          'flex-1 h-11 rounded-xl border text-sm font-medium transition-colors',
                          state.workout_location === loc
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'border-border text-foreground hover:bg-muted'
                        )}
                      >
                        {loc === 'gym' ? 'Palestra' : 'Casa'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5 — Riepilogo */}
            {step === 5 && subStep === 'main' && (
              <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-500" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Tutto pronto!</h2>
                </div>

                <p className="text-sm text-muted-foreground">
                  Ecco il riepilogo del tuo profilo. Potrai modificare tutto dalle impostazioni.
                </p>

                <div className="space-y-3 text-sm">
                  <SummaryRow label="Sesso" value={state.sex === 'male' ? 'Maschio' : state.sex === 'female' ? 'Femmina' : '—'} />
                  <SummaryRow label="Eta" value={state.age ? `${state.age} anni` : '—'} />
                  <SummaryRow label="Altezza / Peso" value={`${state.height_cm} cm / ${state.weight_kg} kg`} />
                  {state.body_fat_percent && <SummaryRow label="Grasso corporeo" value={`${state.body_fat_percent}%`} />}
                  <SummaryRow label="Attivita" value={ACTIVITY_LABELS[state.activity_level]} />
                  <SummaryRow label="Obiettivo" value={GOAL_LABELS[state.goal]} />
                  <SummaryRow label="Percorso" value={
                    state.path_preference === 'nutrition' ? 'Solo Alimentazione'
                      : state.path_preference === 'workout' ? 'Solo Allenamento'
                      : 'Entrambi'
                  } />
                  {state.diet_preference && state.diet_preference !== 'none' && (
                    <SummaryRow label="Dieta" value={DIET_LABELS[state.diet_preference]} />
                  )}
                  {state.days_per_week && (
                    <SummaryRow label="Giorni/settimana" value={`${state.days_per_week} giorni`} />
                  )}
                  {state.workout_location && (
                    <SummaryRow label="Luogo allenamento" value={state.workout_location === 'gym' ? 'Palestra' : 'Casa'} />
                  )}
                </div>

                {preview && (
                  <div className="bg-primary-500/8 border border-primary-500/20 rounded-xl p-4 text-sm mt-2">
                    <p className="font-semibold text-foreground mb-2">Obiettivi calcolati</p>
                    <div className="grid grid-cols-2 gap-1.5 text-muted-foreground">
                      <span>BMR:</span><span className="text-foreground font-medium">{preview.bmr} kcal</span>
                      <span>TDEE:</span><span className="text-foreground font-medium">{preview.tdee} kcal</span>
                      <span>Target kcal:</span><span className="text-foreground font-medium">{preview.calories} kcal</span>
                      <span>Proteine:</span><span className="text-foreground font-medium">{preview.macros.protein_g} g</span>
                      <span>Carbs:</span><span className="text-foreground font-medium">{preview.macros.carbs_g} g</span>
                      <span>Grassi:</span><span className="text-foreground font-medium">{preview.macros.fat_g} g</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Errore */}
      {error && (
        <p className="mt-4 text-sm text-red-500 text-center max-w-md">{error}</p>
      )}

      {/* Navigation buttons */}
      {step > 0 && (
        <div className="w-full max-w-md mt-6 flex gap-3">
          <Button
            variant="outline"
            onClick={goBack}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Indietro
          </Button>

          {isLastStep ? (
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Salvataggio...' : 'Completa setup'}
            </Button>
          ) : (
            <Button
              className="flex-1 flex items-center justify-center gap-1"
              onClick={goNext}
            >
              Avanti
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Skip composizione corporea */}
      {step === 2 && (
        <button
          type="button"
          onClick={goNext}
          className="mt-3 text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          Salta questo passaggio
        </button>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
