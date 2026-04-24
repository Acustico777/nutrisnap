'use client';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { GLOSSARY } from '@/lib/glossary';
import { cn } from '@/lib/utils';

interface Props {
  term: string;
  className?: string;
  iconSize?: number;
}

export function TermInfo({ term, className, iconSize = 14 }: Props) {
  const [open, setOpen] = useState(false);
  const entry = GLOSSARY[term];
  if (!entry) return null;
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true); }}
        aria-label={`Info ${entry.label}`}
        className={cn('inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors', className)}
      >
        <Info width={iconSize} height={iconSize} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-50 w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h3 className="text-base font-bold text-foreground mb-1">{entry.label}</h3>
            <p className="text-sm text-primary-500 font-medium mb-3">{entry.short}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{entry.full}</p>
            <button
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-xl bg-primary-500 py-2 text-sm font-medium text-white hover:bg-primary-600"
            >
              Capito
            </button>
          </div>
        </div>
      )}
    </>
  );
}
