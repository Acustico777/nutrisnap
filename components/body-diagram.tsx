'use client';
import { useState } from 'react';

type MuscleGroup =
  | 'chest' | 'abs' | 'shoulders' | 'biceps' | 'forearms'
  | 'quadriceps' | 'back' | 'traps' | 'triceps' | 'hamstrings'
  | 'glutes' | 'calves' | 'full_body';

interface Props {
  onSelect: (muscle: MuscleGroup) => void;
  selected?: MuscleGroup | null;
}

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Petto',
  abs: 'Addominali',
  shoulders: 'Spalle',
  biceps: 'Bicipiti',
  forearms: 'Avambracci',
  quadriceps: 'Quadricipiti',
  back: 'Schiena',
  traps: 'Trapezi',
  triceps: 'Tricipiti',
  hamstrings: 'Femorali',
  glutes: 'Glutei',
  calves: 'Polpacci',
  full_body: 'Corpo intero',
};

const PRIMARY = '#10b981';    // primary-500
const HOVER   = '#34d399';    // primary-400
const SEL     = '#059669';    // primary-600
const IDLE    = '#374151';    // gray-700
const BODY_FILL = '#1f2937';  // gray-800
const OUTLINE   = '#4b5563';  // gray-600

type Region = { id: MuscleGroup; d?: string; x?: number; y?: number; w?: number; h?: number; rx?: number; label: string };

const FRONT_REGIONS: Region[] = [
  // traps — small trapezoid on each side of neck
  { id: 'traps', label: 'Trapezi', x: 72, y: 72, w: 56, h: 14, rx: 6 },
  // shoulders
  { id: 'shoulders', label: 'Spalle', x: 56, y: 82, w: 22, h: 18, rx: 6 },
  // chest
  { id: 'chest', label: 'Petto', x: 74, y: 86, w: 52, h: 28, rx: 8 },
  // biceps L
  { id: 'biceps', label: 'Bicipiti', x: 38, y: 102, w: 18, h: 34, rx: 6 },
  // abs
  { id: 'abs', label: 'Addominali', x: 78, y: 114, w: 44, h: 36, rx: 8 },
  // forearms L
  { id: 'forearms', label: 'Avambracci', x: 34, y: 138, w: 16, h: 30, rx: 5 },
  // quadriceps L
  { id: 'quadriceps', label: 'Quadricipiti', x: 76, y: 156, w: 22, h: 56, rx: 8 },
  // quadriceps R
  { id: 'quadriceps', label: 'Quadricipiti', x: 102, y: 156, w: 22, h: 56, rx: 8 },
  // calves L front (small)
  { id: 'calves', label: 'Polpacci', x: 78, y: 216, w: 18, h: 26, rx: 5 },
  { id: 'calves', label: 'Polpacci', x: 104, y: 216, w: 18, h: 26, rx: 5 },
];

const BACK_REGIONS: Region[] = [
  // traps — wider at top of back
  { id: 'traps', label: 'Trapezi', x: 72, y: 72, w: 56, h: 20, rx: 6 },
  // shoulders back
  { id: 'shoulders', label: 'Spalle', x: 54, y: 80, w: 20, h: 20, rx: 6 },
  // back / lats
  { id: 'back', label: 'Schiena', x: 72, y: 88, w: 56, h: 50, rx: 8 },
  // triceps L
  { id: 'triceps', label: 'Tricipiti', x: 37, y: 100, w: 18, h: 34, rx: 6 },
  // forearms back L
  { id: 'forearms', label: 'Avambracci', x: 34, y: 136, w: 16, h: 30, rx: 5 },
  // glutes
  { id: 'glutes', label: 'Glutei', x: 76, y: 146, w: 48, h: 30, rx: 10 },
  // hamstrings L
  { id: 'hamstrings', label: 'Femorali', x: 76, y: 178, w: 22, h: 48, rx: 8 },
  // hamstrings R
  { id: 'hamstrings', label: 'Femorali', x: 102, y: 178, w: 22, h: 48, rx: 8 },
  // calves back
  { id: 'calves', label: 'Polpacci', x: 78, y: 228, w: 18, h: 24, rx: 5 },
  { id: 'calves', label: 'Polpacci', x: 104, y: 228, w: 18, h: 24, rx: 5 },
];

// Mirror rectangles for right side where applicable (shoulders, biceps, triceps, forearms)
function mirrorX(x: number, w: number, viewW = 200): number {
  return viewW - x - w;
}

function RegionRect({
  r,
  hovered,
  selected,
  onHover,
  onLeave,
  onClick,
}: {
  r: Region;
  hovered: boolean;
  selected: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const fill = selected ? SEL : hovered ? HOVER : PRIMARY;
  return (
    <rect
      x={r.x}
      y={r.y}
      width={r.w}
      height={r.h}
      rx={r.rx ?? 4}
      fill={fill}
      opacity={selected || hovered ? 0.9 : 0.55}
      style={{ cursor: 'pointer', transition: 'all 0.15s' }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    />
  );
}

export function BodyDiagram({ onSelect, selected }: Props) {
  const [view, setView] = useState<'front' | 'back'>('front');
  const [hovered, setHovered] = useState<MuscleGroup | null>(null);

  const regions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS;

  // Build mirrored versions for right-side muscles
  const allRegions: (Region & { mirrored?: boolean })[] = [];
  const mirrorIds: MuscleGroup[] = ['shoulders', 'biceps', 'triceps', 'forearms'];

  regions.forEach((r) => {
    allRegions.push(r);
    if (mirrorIds.includes(r.id) && r.x !== undefined && r.w !== undefined) {
      allRegions.push({ ...r, x: mirrorX(r.x, r.w), mirrored: true });
    }
  });

  const activeLabel = hovered ? MUSCLE_LABELS[hovered] : selected ? MUSCLE_LABELS[selected] : null;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Front / Back toggle */}
      <div className="flex rounded-xl border border-border p-1 gap-1">
        {(['front', 'back'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === v
                ? 'bg-primary-500 text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {v === 'front' ? 'Fronte' : 'Retro'}
          </button>
        ))}
      </div>

      {/* Hover label */}
      <div className="h-5 flex items-center justify-center">
        {activeLabel && (
          <span className="text-sm font-semibold text-primary-500">{activeLabel}</span>
        )}
      </div>

      {/* SVG body */}
      <svg
        viewBox="0 0 200 300"
        xmlns="http://www.w3.org/2000/svg"
        className="w-48 h-auto"
        aria-label="Seleziona gruppo muscolare"
      >
        {/* Body silhouette */}
        {/* Head */}
        <circle cx="100" cy="38" r="22" fill={BODY_FILL} stroke={OUTLINE} strokeWidth="1.5" />
        {/* Neck */}
        <rect x="92" y="58" width="16" height="16" fill={BODY_FILL} />
        {/* Torso */}
        <rect x="68" y="70" width="64" height="86" rx="10" fill={BODY_FILL} stroke={OUTLINE} strokeWidth="1.5" />
        {/* Left upper arm */}
        <rect x="36" y="74" width="20" height="72" rx="8" fill={BODY_FILL} stroke={OUTLINE} strokeWidth="1.5" />
        {/* Right upper arm */}
        <rect x="144" y="74" width="20" height="72" rx="8" fill={BODY_FILL} stroke={OUTLINE} strokeWidth="1.5" />
        {/* Left forearm */}
        <rect x="32" y="148" width="16" height="48" rx="6" fill={BODY_FILL} stroke={OUTLINE} strokeWidth="1.5" />
        {/* Right forearm */}
        <rect x="152" y="148" width="16" height="48" rx="6" fill={BODY_FILL} stroke={OUTLINE} strokeWidth="1.5" />
        {/* Hips */}
        <rect x="70" y="152" width="60" height="20" rx="8" fill={BODY_FILL} stroke={OUTLINE} strokeWidth="1.5" />
        {/* Left leg upper */}
        <rect x="72" y="168" width="26" height="72" rx="10" fill={BODY_FILL} stroke={OUTLINE} strokeWidth="1.5" />
        {/* Right leg upper */}
        <rect x="102" y="168" width="26" height="72" rx="10" fill={BODY_FILL} stroke={OUTLINE} strokeWidth="1.5" />
        {/* Left leg lower */}
        <rect x="74" y="242" width="22" height="50" rx="8" fill={BODY_FILL} stroke={OUTLINE} strokeWidth="1.5" />
        {/* Right leg lower */}
        <rect x="104" y="242" width="22" height="50" rx="8" fill={BODY_FILL} stroke={OUTLINE} strokeWidth="1.5" />

        {/* Clickable muscle regions */}
        {allRegions.map((r, i) => (
          <RegionRect
            key={`${r.id}-${i}`}
            r={r}
            hovered={hovered === r.id}
            selected={selected === r.id}
            onHover={() => setHovered(r.id)}
            onLeave={() => setHovered(null)}
            onClick={() => onSelect(r.id)}
          />
        ))}
      </svg>

      <p className="text-xs text-muted-foreground">Tocca un muscolo per filtrare</p>
    </div>
  );
}
