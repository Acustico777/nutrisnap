'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Leaf, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/validate-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, inviteCode }),
      });

      const result = await res.json() as { valid?: boolean; skipInvite?: boolean; error?: string };

      if (!res.ok || (!result.valid && !result.skipInvite)) {
        toast.error(result.error ?? 'Codice invito non valido.');
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { invite_code: inviteCode },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      // Mark invite code as used
      if (!result.skipInvite && inviteCode) {
        await fetch('/api/auth/use-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, inviteCode }),
        });
      }

      toast.success('Account creato! Controlla la tua email per confermare.');
      router.push('/login');
    } catch {
      toast.error('Errore imprevisto. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10 ring-1 ring-primary-500/30">
            <Leaf className="h-8 w-8 text-primary-500" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Crea account</h1>
            <p className="text-sm text-muted-foreground">Hai bisogno di un codice invito</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Almeno 8 caratteri"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite">Codice invito</Label>
            <Input
              id="invite"
              type="text"
              placeholder="XXXXXXXX"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={8}
              autoComplete="off"
              className="font-mono tracking-widest uppercase"
            />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Registrazione…' : 'Crea account'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Hai già un account?{' '}
          <Link href="/login" className="font-medium text-primary-500 hover:underline">
            Accedi
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
