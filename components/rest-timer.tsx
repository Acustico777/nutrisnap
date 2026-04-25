'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, SkipForward, Timer } from 'lucide-react';

interface Props {
  defaultSec?: number;
  onClose: () => void;
  onDone?: () => void;
}

const PRESETS = [60, 90, 120];

export function RestTimer({ defaultSec = 90, onClose, onDone }: Props) {
  const [selectedSec, setSelectedSec] = useState(defaultSec);
  const [remaining, setRemaining] = useState(defaultSec);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio not available
    }
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            setRunning(false);
            playBeep();
            onDone?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, playBeep, onDone]);

  function handlePreset(sec: number) {
    setSelectedSec(sec);
    setRemaining(sec);
    setRunning(true);
  }

  function handleSkip() {
    setRunning(false);
    playBeep();
    onDone?.();
    onClose();
  }

  const pct = remaining / selectedSec;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="fixed bottom-24 right-4 z-50 w-56 rounded-2xl border border-border bg-card shadow-xl p-4 space-y-3"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Timer className="h-4 w-4 text-primary-500" />
            <span className="text-sm font-semibold text-foreground">Riposo</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-muted/40 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Timer display */}
        <div className="flex flex-col items-center gap-2">
          {/* Progress ring */}
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40" cy="40" r="34"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-muted/30"
              />
              <circle
                cx="40" cy="40" r="34"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct)}`}
                strokeLinecap="round"
                className="text-primary-500 transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold tabular-nums text-foreground">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Preset pills */}
          <div className="flex gap-1.5">
            {PRESETS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handlePreset(s)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium border transition-colors ${
                  selectedSec === s
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'border-border text-muted-foreground hover:border-primary-500/50'
                }`}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/30 py-2 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors"
          >
            {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {running ? 'Pausa' : 'Riprendi'}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="flex items-center justify-center rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors"
            title="Salta"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
