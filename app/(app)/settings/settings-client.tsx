'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Copy, Check, LogOut, Plus, Shield, Calculator, Save, X, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import {
  calculateBMR,
  calculateTDEE,
  suggestMacroSplit,
  ACTIVITY_LABELS,
  DIET_LABELS,
  DIET_PREFERENCES,
} from '@/lib/nutrition';
import type { Profile, InviteCode } from '@/lib/types';
import type { ActivityLevel, Sex } from '@/lib/nutrition';

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
    <div className="mx-auto max-w-md px-4 pt-8 pb-8 space-y-6">
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
            <Label htmlFor="calories">Calorie (kcal)</Label>
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
              <Label htmlFor="protein" className="text-blue-400">Proteine (g)</Label>
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
              <Label htmlFor="carbs" className="text-orange-400">Carb (g)</Label>
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
              <Label htmlFor="fat" className="text-pink-400">Grassi (g)</Label>
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
                <span className="text-muted-foreground">BMR:</span>
                <span className="font-semibold text-foreground">{bioComputed.bmr} kcal/giorno</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">TDEE:</span>
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
