'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            'bg-card border border-border text-foreground rounded-2xl shadow-lg',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary-500 text-white',
          cancelButton: 'bg-muted text-muted-foreground',
          error: 'bg-red-950 border-red-800 text-red-100',
          success: 'bg-emerald-950 border-emerald-800 text-emerald-100',
        },
      }}
    />
  );
}
