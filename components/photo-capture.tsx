'use client';

import { useRef } from 'react';
import { Camera, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoCaptureProps {
  onCapture: (file: File) => void;
  disabled?: boolean;
}

export function PhotoCapture({ onCapture, disabled }: PhotoCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onCapture(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />

      <button
        onClick={() => cameraRef.current?.click()}
        disabled={disabled}
        className="flex h-40 w-full max-w-sm flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary-500/50 bg-primary-500/5 text-primary-500 transition-colors hover:bg-primary-500/10 disabled:opacity-50"
      >
        <Camera className="h-10 w-10" />
        <span className="text-sm font-medium">Scatta foto</span>
      </button>

      <Button
        variant="outline"
        onClick={() => uploadRef.current?.click()}
        disabled={disabled}
        className="w-full max-w-sm"
      >
        <Upload className="mr-2 h-4 w-4" />
        Carica dalla galleria
      </Button>
    </div>
  );
}
