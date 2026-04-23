'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Camera, History, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/history', label: 'Storico', icon: History },
  { href: '/settings', label: 'Impostazioni', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-2">
        {/* Home */}
        <Link
          href="/dashboard"
          className={cn(
            'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors',
            pathname === '/dashboard'
              ? 'text-primary-500'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        {/* Scan — center prominent button */}
        <Link
          href="/scan"
          className="relative -mt-6 flex flex-col items-center"
          aria-label="Scansiona pasto"
        >
          <span
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-primary-500/40 transition-transform active:scale-95',
              pathname === '/scan'
                ? 'bg-primary-600'
                : 'bg-primary-500'
            )}
          >
            <Camera className="h-6 w-6 text-white" />
          </span>
          <span
            className={cn(
              'mt-1 text-[10px] font-medium',
              pathname === '/scan' ? 'text-primary-500' : 'text-muted-foreground'
            )}
          >
            Scansiona
          </span>
        </Link>

        {/* History */}
        <Link
          href="/history"
          className={cn(
            'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors',
            pathname === '/history'
              ? 'text-primary-500'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <History className="h-5 w-5" />
          <span className="text-[10px] font-medium">Storico</span>
        </Link>

        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors',
            pathname === '/settings'
              ? 'text-primary-500'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Settings className="h-5 w-5" />
          <span className="text-[10px] font-medium">Impost.</span>
        </Link>
      </div>
    </nav>
  );
}
