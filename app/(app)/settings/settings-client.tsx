'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Copy, Check, LogOut, Plus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import type { Profile, InviteCode } from '@/lib/types';

interface Props {
  profile: Profile;
  inviteCodes: InviteCode[];
}

export function SettingsClient({ profile, inviteCodes: initialCodes }: Props) {
  const router = useRouter();
  const [goals, setGoals] = useState({
    daily_calories: profile?.daily_calories ?? 2000,
    daily_protein_g: profile?.daily_protein_g ?? 150,
    daily_carbs_g: profile?.daily_carbs_g ?? 250,
    daily_fat_g: profile?.daily_fat_g ?? 65,
  });
  const [savingGoals, setSavingGoals] = useState(false);
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

      {/* Admin: Invite codes */}
      {profile?.is_admin && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
        transition={{ delay: 0.3 }}
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
