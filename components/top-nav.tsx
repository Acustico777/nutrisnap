'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Camera, PieChart, Dumbbell, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopNavProps {
  pathPreference?: 'nutrition' | 'workout' | 'both' | null;
}

export function TopNav({ pathPreference }: TopNavProps = {}) {
  const pathname = usePathname();

  const showInsights = pathPreference !== 'workout';
  const showScan = pathPreference !== 'workout';
  const showWorkout = pathPreference !== 'nutrition';

  const links = [
    { href: '/dashboard', label: 'Home', icon: Home, active: pathname === '/dashboard', show: true },
    { href: '/insights', label: 'Insights', icon: PieChart, active: !!pathname?.startsWith('/insights'), show: showInsights },
    { href: '/scan', label: 'Scansiona', icon: Camera, active: pathname === '/scan', show: showScan, primary: true },
    { href: '/workout', label: 'Workout', icon: Dumbbell, active: !!pathname?.startsWith('/workout'), show: showWorkout },
    { href: '/settings', label: 'Profilo', icon: User, active: !!(pathname?.startsWith('/settings') || pathname?.startsWith('/profile')), show: true },
  ];

  return (
    <nav className="sticky top-0 z-40 hidden border-b border-border bg-card/80 backdrop-blur-xl md:block">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-white shadow-sm shadow-primary-500/30">
            <Camera className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">NutriSnap</span>
        </Link>

        <div className="flex items-center gap-1">
          {links.filter((l) => l.show).map((l) => {
            const Icon = l.icon;
            if (l.primary) {
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    'mx-1 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-primary-500/30 transition-colors',
                    l.active ? 'bg-primary-600' : 'bg-primary-500 hover:bg-primary-600'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{l.label}</span>
                </Link>
              );
            }
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  l.active
                    ? 'bg-muted/40 text-primary-500'
                    : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{l.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
