'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Camera, PieChart, Dumbbell, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  pathPreference?: 'nutrition' | 'workout' | 'both' | null;
}

export function BottomNav({ pathPreference }: BottomNavProps = {}) {
  const pathname = usePathname();

  // Nutrition path: hide Workout
  // Workout path: hide Insights & Scan
  // Both / null: show all
  const showInsights = pathPreference !== 'workout';
  const showScan = pathPreference !== 'workout';
  const showWorkout = pathPreference !== 'nutrition';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/80 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {/* Home */}
        <Link
          href="/dashboard"
          className={cn(
            'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors',
            pathname === '/dashboard'
              ? 'text-primary-500'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        {/* Insights */}
        {showInsights && (
          <Link
            href="/insights"
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors',
              pathname?.startsWith('/insights')
                ? 'text-primary-500'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <PieChart className="h-5 w-5" />
            <span className="text-[10px] font-medium">Insights</span>
          </Link>
        )}

        {/* Scan — center prominent button */}
        {showScan && (
          <Link
            href="/scan"
            className="relative -mt-6 flex flex-col items-center"
            aria-label="Scansiona pasto"
          >
            <span
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-primary-500/40 transition-transform active:scale-95',
                pathname === '/scan' ? 'bg-primary-600' : 'bg-primary-500'
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
        )}

        {/* Workout */}
        {showWorkout && (
          <Link
            href="/workout"
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors',
              pathname?.startsWith('/workout')
                ? 'text-primary-500'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Dumbbell className="h-5 w-5" />
            <span className="text-[10px] font-medium">Workout</span>
          </Link>
        )}

        {/* Profilo */}
        <Link
          href="/settings"
          className={cn(
            'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors',
            pathname?.startsWith('/settings') || pathname?.startsWith('/profile')
              ? 'text-primary-500'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <User className="h-5 w-5" />
          <span className="text-[10px] font-medium">Profilo</span>
        </Link>
      </div>
    </nav>
  );
}
