'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Copy, Check, LogOut, Plus, Shield, Calculator, Save, X, Trash2, ChevronDown, Target, Scale, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { TermInfo } from '@/components/term-info';
import {
  calculateBMR,
  calculateTDEE,
  suggestMacroSplit,
  calorieTargetForGoal,
  macroSplitForGoal,
  calculateIdealWeight,
  calculateBMI,
  bmiCategory,
  ACTIVITY_LABELS,
  DIET_LABELS,
  DIET_PREFERENCES,
  GOAL_LABELS,
} from '@/lib/nutrition';
import type { Profile, InviteCode } from '@/lib/types';
import type { ActivityLevel, Sex, Goal } from '@/lib/nutrition';

interface Props {
  profile: Profile;
  inviteCodes: InviteCode[];
}

export function SettingsClient({ profile, inviteCodes: initialCodes }: Props) {
  const router = useRouter();

  // ----- Goals -----
  const [goals, setGoals] = useState({
    daily_calories: profile?.daily_calories ?? 2000,
    daily_protein_g: profile?.daily_protein_g ?? 150,
    daily_carbs_g: profile?.daily_carbs_g ?? 250,
    daily_fat_g: profile?.daily_fat_g ?? 65,
  });
  const [savingGoals, setSavingGoals] = useState(false);

  // ----- Bio / Calorie Calculator -----
  const [bioAge, setBioAge] = useState<string>(profile?.age != null ? String(profile.age) : '');
  const [bioWeight, setBioWeight] = useState<string>(
    profile?.weight_kg != null ? String(profile.weight_kg) : ''
  );
  const [bioHeight, setBioHeight] = useState<string>(
    profile?.height_cm != null ? String(profile.height_cm) : ''
  );
  const [bioSex, setBioSex] = useState<Sex>(profile?.sex ?? 'male');
  const [bioActivity, setBioActivity] = useState<ActivityLevel>(
    profile?.activity_level ?? 'moderate'
  );
  const [savingBio, setSavingBio] = useState(false);
  const [applyingTDEE, setApplyingTDEE] = useState(false);

  const bioComputed = useMemo(() => {
    const age = Number(bioAge);
    const weight = Number(bioWeight);
    const height = Number(bioHeight);
    if (!age || !weight || !height) return null;
    const bmr = calculateBMR({ sex: bioSex, weight_kg: weight, height_cm: height, age });
    const tdee = calculateTDEE(bmr, bioActivity);
    return { bmr, tdee };
  }, [bioAge, bioWeight, bioHeight, bioSex, bioActivity]);

  async function handleSaveBio() {
    setSavingBio(true);
    try {
      const body: Record<string, unknown> = {
        sex: bioSex,
        activity_level: bioActivity,
      };
      if (bioAge) body.age = Number(bioAge);
      if (bioWeight) body.weight_kg = Number(bioWeight);
      if (bioHeight) body.height_cm = Number(bioHeight);

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success('Profilo salvato!');
      router.refresh();
    } catch {
      toast.error('Impossibile salvare il profilo');
    } finally {
      setSavingBio(false);
    }
  }

  async function handleApplyTDEE() {
    if (!bioComputed) return;
    setApplyingTDEE(true);
    try {
      const macros = suggestMacroSplit(bioComputed.tdee);
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daily_calories: bioComputed.tdee,
          daily_protein_g: macros.protein_g,
          daily_carbs_g: macros.carbs_g,
          daily_fat_g: macros.fat_g,
        }),
      });
      if (!res.ok) throw new Error();
      setGoals({
        daily_calories: bioComputed.tdee,
        daily_protein_g: macros.protein_g,
        daily_carbs_g: macros.carbs_g,
        daily_fat_g: macros.fat_g,
      });
      toast.success('Obiettivi aggiornati dal TDEE!');
      router.refresh();
    } catch {
      toast.error('Impossibile applicare gli obiettivi');
    } finally {
      setApplyingTDEE(false);
    }
  }

  // ----- Goal -----
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? 'maintain');
  const [savingGoal, setSavingGoal] = useState(false);
  const [applyingGoal, setApplyingGoal] = useState(false);

  const tdeeValue = bioComputed?.tdee ?? profile?.tdee ?? null;
  const goalTargetCal = tdeeValue ? calorieTargetForGoal(tdeeValue, goal) : null;
  const goalMacros = goalTargetCal ? macroSplitForGoal(goalTargetCal, goal) : null;

  async function handleSaveGoal(newGoal: Goal) {
    setGoal(newGoal);
    setSavingGoal(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: newGoal }),
      });
      if (!res.ok) throw new Error();
      toast.success('Obiettivo salvato!');
      router.refresh();
    } catch {
      toast.error('Impossibile salvare l\'obiettivo');
    } finally {
      setSavingGoal(false);
    }
  }

  async function handleApplyGoalToTargets() {
    if (!goalTargetCal || !goalMacros) return;
    setApplyingGoal(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daily_calories: goalTargetCal,
          daily_protein_g: goalMacros.protein_g,
          daily_carbs_g: goalMacros.carbs_g,
          daily_fat_g: goalMacros.fat_g,
        }),
      });
      if (!res.ok) throw new Error();
      setGoals({
        daily_calories: goalTargetCal,
        daily_protein_g: goalMacros.protein_g,
        daily_carbs_g: goalMacros.carbs_g,
        daily_fat_g: goalMacros.fat_g,
      });
      toast.success('Obiettivi giornalieri aggiornati!');
      router.refresh();
    } catch {
      toast.error('Impossibile applicare gli obiettivi');
    } finally {
      setApplyingGoal(false);
    }
  }

  // ----- Ideal weight / BMI -----
  const heightCm = profile?.height_cm ?? (bioHeight ? Number(bioHeight) : null);
  const weightKg = profile?.weight_kg ?? (bioWeight ? Number(bioWeight) : null);
  const idealWeight = heightCm ? calculateIdealWeight(heightCm) : null;
  const bmiValue = weightKg && heightCm ? calculateBMI(weightKg, heightCm) : null;
  const bmiCat = bmiValue ? bmiCategory(bmiValue) : null;
  const weightDiff = weightKg && idealWeight ? Math.round((weightKg - idealWeight.target_kg) * 10) / 10 : null;

  // ----- Diet preference -----
  const [dietPref, setDietPref] = useState<string>(profile?.diet_preference ?? 'none');
  const [savingDiet, setSavingDiet] = useState(false);

  async function handleSaveDiet() {
    setSavingDiet(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diet_preference: dietPref }),
      });
      if (!res.ok) throw new Error();
      toast.success('Preferenza dieta salvata!');
      router.refresh();
    } catch {
      toast.error('Impossibile salvare la preferenza dieta');
    } finally {
      setSavingDiet(false);
    }
  }

  // ----- Excluded foods -----
  const [excludedFoods, setExcludedFoods] = useState<string[]>(profile?.excluded_foods ?? []);
  const [newFood, setNewFood] = useState('');
  const [savingExclusions, setSavingExclusions] = useState(false);

  async function saveExclusions(foods: string[]) {
    setSavingExclusions(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excluded_foods: foods }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Impossibile aggiornare le esclusioni');
    } finally {
      setSavingExclusions(false);
    }
  }

  async function handleAddFood() {
    const trimmed = newFood.trim();
    if (!trimmed || excludedFoods.includes(trimmed)) return;
    const updated = [...excludedFoods, trimmed];
    setExcludedFoods(updated);
    setNewFood('');
    toast.success(`"${trimmed}" aggiunto alle esclusioni`);
    await saveExclusions(updated);
  }

  async function handleRemoveFood(food: string) {
    const updated = excludedFoods.filter((f) => f !== food);
    setExcludedFoods(updated);
    toast.success(`"${food}" rimosso`);
    await saveExclusions(updated);
  }

  // ----- Invite codes + logout (existing) -----
  const [codes, setCodes] = useState<InviteCode[]>(initialCodes);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  async function handleSaveGoals(e: React.FormEvent) {
    e.preventDefault();
    setSavingGoals(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goals),
      });
      if (!res.ok) throw new Error();
      toast.success('Obiettivi salvati!');
      router.refresh();
    } catch {
      toast.error('Impossibile salvare gli obiettivi');
    } finally {
      setSavingGoals(false);
    }
  }

  async function handleGenerateCode() {
    setGeneratingCode(true);
    try {
      const res = await fetch('/api/invite-codes', { method: 'POST' });
      const data = await res.json() as { code?: InviteCode; error?: string };
      if (!res.ok || !data.code) throw new Error(data.error ?? 'Errore');
      setCodes((prev) => [data.code!, ...prev]);
      toast.success('Codice generato!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore generazione codice');
    } finally {
      setGeneratingCode(false);
    }
  }

  async function handleCopy(code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success('Codice copiato!');
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const unusedCodes = codes.filter((c) => !c.used_by);

  return (
    <div className="mx-auto max-w-md md:max-w-3xl px-4 pt-8 pb-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Impostazioni</h1>
        <p className="text-sm text-muted-foreground">{profile?.email}</p>
      </motion.div>

      {/* Goals */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <h2 className="text-base font-semibold text-foreground mb-4">Obiettivi giornalieri</h2>
        <form onSubmit={handleSaveGoals} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="calories" className="flex items-center gap-1">
              Calorie (kcal)
              <TermInfo term="caloric_need" />
            </Label>
            <Input
              id="calories"
              type="number"
              min={500}
              max={10000}
              value={goals.daily_calories}
              onChange={(e) => setGoals({ ...goals, daily_calories: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="protein" className="flex items-center gap-1 text-blue-400">
                Proteine (g)
                <TermInfo term="protein" />
              </Label>
              <Input
                id="protein"
                type="number"
                min={0}
                max={500}
                value={goals.daily_protein_g}
                onChange={(e) => setGoals({ ...goals, daily_protein_g: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbs" className="flex items-center gap-1 text-orange-400">
                Carb (g)
                <TermInfo term="carbs" />
              </Label>
              <Input
                id="carbs"
                type="number"
                min={0}
                max={1000}
                value={goals.daily_carbs_g}
                onChange={(e) => setGoals({ ...goals, daily_carbs_g: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat" className="flex items-center gap-1 text-pink-400">
                Grassi (g)
                <TermInfo term="fat" />
              </Label>
              <Input
                id="fat"
                type="number"
                min={0}
                max={500}
                value={goals.daily_fat_g}
                onChange={(e) => setGoals({ ...goals, daily_fat_g: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={savingGoals}>
            {savingGoals ? 'Salvataggio…' : 'Salva obiettivi'}
          </Button>
        </form>
      </motion.div>

      {/* Bio / Calorie calculator */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-4 w-4 text-primary-500" />
          <h2 className="text-base font-semibold text-foreground">Calcolo fabbisogno calorico</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="bio-age">Età</Label>
              <Input
                id="bio-age"
                type="number"
                min={10}
                max={120}
                placeholder="anni"
                value={bioAge}
                onChange={(e) => setBioAge(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio-weight">Peso (kg)</Label>
              <Input
                id="bio-weight"
                type="number"
                min={20}
                max={300}
                placeholder="kg"
                value={bioWeight}
                onChange={(e) => setBioWeight(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio-height">Altezza (cm)</Label>
              <Input
                id="bio-height"
                type="number"
                min={100}
                max={250}
                placeholder="cm"
                value={bioHeight}
                onChange={(e) => setBioHeight(e.target.value)}
              />
            </div>
          </div>

          {/* Sex */}
          <div className="space-y-2">
            <Label>Sesso</Label>
            <div className="flex rounded-xl border border-border p-1 gap-1">
              {(['male', 'female'] as Sex[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setBioSex(s)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    bioSex === s
                      ? 'bg-primary-500 text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s === 'male' ? 'Maschio' : 'Femmina'}
                </button>
              ))}
            </div>
          </div>

          {/* Activity level */}
          <div className="space-y-2">
            <Label>Livello attività</Label>
            <div className="relative">
              <select
                value={bioActivity}
                onChange={(e) => setBioActivity(e.target.value as ActivityLevel)}
                className="w-full appearance-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
                  <option key={a} value={a}>
                    {ACTIVITY_LABELS[a]}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Computed BMR / TDEE */}
          {bioComputed && (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  BMR
                  <TermInfo term="bmr" />
                </span>
                <span className="font-semibold text-foreground">{bioComputed.bmr} kcal/giorno</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="flex items-center gap-1 text-muted-foreground">
                  TDEE
                  <TermInfo term="tdee" />
                </span>
                <span className="font-bold text-primary-500">{bioComputed.tdee} kcal/giorno</span>
              </div>
            </div>
          )}

          <Button onClick={handleSaveBio} disabled={savingBio} className="w-full">
            {savingBio ? (
              'Salvataggio…'
            ) : (
              <><Save className="mr-2 h-4 w-4" /> Calcola e salva fabbisogno</>
            )}
          </Button>

          {bioComputed && (
            <Button
              variant="outline"
              onClick={handleApplyTDEE}
              disabled={applyingTDEE}
              className="w-full"
            >
              {applyingTDEE ? 'Applicazione…' : `Applica TDEE come obiettivo (${bioComputed.tdee} kcal)`}
            </Button>
          )}
        </div>
      </motion.div>

      {/* Obiettivo (Goal) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-primary-500" />
          <h2 className="text-base font-semibold text-foreground">Obiettivo</h2>
        </div>

        {/* Goal pill buttons */}
        <div className="flex gap-2 flex-wrap mb-4">
          {(Object.entries(GOAL_LABELS) as [Goal, string][]).map(([g, label]) => (
            <button
              key={g}
              type="button"
              disabled={savingGoal}
              onClick={() => handleSaveGoal(g)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                goal === g
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'border-border text-foreground hover:border-primary-500/50'
              }`}
            >
              {label.split(' ')[0]}
              <TermInfo term={g === 'maintain' ? 'caloric_need' : g} iconSize={12} />
            </button>
          ))}
        </div>

        {/* Preview */}
        {goalTargetCal && goalMacros ? (
          <div className="rounded-xl border border-border bg-muted/30 p-3 mb-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Anteprima per {GOAL_LABELS[goal]}
            </p>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Calorie target:</span>
              <span className="font-bold text-primary-500">{goalTargetCal} kcal</span>
            </div>
            <div className="flex gap-3 text-xs mt-2">
              <span className="text-blue-400">P {goalMacros.protein_g}g</span>
              <span className="text-orange-400">C {goalMacros.carbs_g}g</span>
              <span className="text-pink-400">G {goalMacros.fat_g}g</span>
            </div>
            {!tdeeValue && (
              <p className="text-xs text-muted-foreground mt-2">
                Calcola il TDEE nella sezione sopra per vedere i valori.
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-3 mb-3 text-center">
            <p className="text-xs text-muted-foreground">
              Calcola il TDEE per vedere l&apos;anteprima dell&apos;obiettivo.
            </p>
          </div>
        )}

        {goalTargetCal && goalMacros && (
          <Button
            variant="outline"
            onClick={handleApplyGoalToTargets}
            disabled={applyingGoal}
            className="w-full"
          >
            {applyingGoal ? 'Applicazione…' : 'Applica come obiettivi giornalieri'}
          </Button>
        )}

        {/* Peso target + data */}
        <Link
          href="/profile/goal"
          className="mt-3 flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2.5 hover:border-primary-500/50 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary-500" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {profile.target_weight_kg
                  ? `Target: ${profile.target_weight_kg} kg`
                  : 'Imposta peso target'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {profile.goal_target_date
                  ? `Entro il ${new Date(profile.goal_target_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`
                  : 'Definisci una data obiettivo'}
              </p>
            </div>
          </div>
          <span className="text-xs text-primary-500">→</span>
        </Link>
      </motion.div>

      {/* Peso ideale / BMI */}
      {heightCm && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.19 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Scale className="h-4 w-4 text-primary-500" />
            <h2 className="text-base font-semibold text-foreground">Peso ideale</h2>
          </div>

          {idealWeight && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Range sano:</span>
                  <span className="font-semibold text-foreground">
                    {idealWeight.min_kg} – {idealWeight.max_kg} kg
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Target ideale:</span>
                  <span className="font-bold text-primary-500">{idealWeight.target_kg} kg</span>
                </div>
                {weightKg && weightDiff !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Differenza attuale:</span>
                    <span className={`font-semibold ${Math.abs(weightDiff) < 2 ? 'text-green-400' : weightDiff > 0 ? 'text-amber-400' : 'text-sky-400'}`}>
                      {weightDiff > 0 ? '+' : ''}{weightDiff} kg
                    </span>
                  </div>
                )}
                {bmiValue && bmiCat && (
                  <div className="flex justify-between text-sm pt-1 border-t border-border">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      BMI
                      <TermInfo term="bmi" />
                    </span>
                    <span className="font-bold" style={{ color: bmiCat.color }}>
                      {bmiValue} — {bmiCat.label}
                    </span>
                  </div>
                )}
              </div>
              <Link
                href="/progress"
                className="flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-400 transition-colors"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Vedi grafico progressi →
              </Link>
            </div>
          )}
        </motion.div>
      )}

      {/* Diet preference */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <h2 className="text-base font-semibold text-foreground mb-4">Preferenza dieta</h2>
        <div className="space-y-3">
          <div className="relative">
            <select
              value={dietPref}
              onChange={(e) => setDietPref(e.target.value)}
              className="w-full appearance-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {DIET_PREFERENCES.map((d) => (
                <option key={d} value={d}>
                  {DIET_LABELS[d]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Button onClick={handleSaveDiet} disabled={savingDiet} className="w-full">
            {savingDiet ? 'Salvataggio…' : 'Salva preferenza'}
          </Button>
        </div>
      </motion.div>

      {/* Excluded foods */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="h-4 w-4 text-primary-500" />
          <h2 className="text-base font-semibold text-foreground">Esclusioni alimentari</h2>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="es. noci, lattosio…"
              value={newFood}
              onChange={(e) => setNewFood(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFood(); } }}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={handleAddFood}
              disabled={!newFood.trim() || savingExclusions}
              className="flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {excludedFoods.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {excludedFoods.map((food) => (
                <span
                  key={food}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-3 py-1 text-sm"
                >
                  {food}
                  <button
                    onClick={() => handleRemoveFood(food)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    disabled={savingExclusions}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nessun alimento escluso</p>
          )}
        </div>
      </motion.div>

      {/* Admin: Invite codes */}
      {profile?.is_admin && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-primary-500" />
            <h2 className="text-base font-semibold text-foreground">Codici invito</h2>
          </div>

          <Button
            variant="outline"
            onClick={handleGenerateCode}
            disabled={generatingCode}
            className="w-full mb-4"
          >
            <Plus className="mr-2 h-4 w-4" />
            {generatingCode ? 'Generazione…' : 'Genera codice invito'}
          </Button>

          {unusedCodes.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">Codici disponibili ({unusedCodes.length})</p>
              {unusedCodes.map((c) => (
                <div
                  key={c.code}
                  className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2"
                >
                  <span className="font-mono text-sm font-bold tracking-widest text-foreground">
                    {c.code}
                  </span>
                  <button
                    onClick={() => handleCopy(c.code)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedCode === c.code ? (
                      <Check className="h-4 w-4 text-primary-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nessun codice disponibile
            </p>
          )}
        </motion.div>
      )}

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Button
          variant="destructive"
          onClick={handleLogout}
          className="w-full"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Esci
        </Button>
      </motion.div>
    </div>
  );
}
