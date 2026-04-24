export type Sex = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentario',
  light: 'Leggero',
  moderate: 'Moderato',
  active: 'Attivo',
  very_active: 'Molto attivo',
};

export function calculateBMR({
  sex,
  weight_kg,
  height_cm,
  age,
}: {
  sex: Sex;
  weight_kg: number;
  height_cm: number;
  age: number;
}): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  const bmr = sex === 'male' ? base + 5 : base - 161;
  return Math.round(bmr);
}

export function calculateTDEE(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);
}

export function suggestMacroSplit(tdee: number): {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
} {
  const proteinKcal = tdee * 0.3;
  const carbsKcal = tdee * 0.45;
  const fatKcal = tdee * 0.25;

  return {
    protein_g: Math.round(proteinKcal / 4),
    carbs_g: Math.round(carbsKcal / 4),
    fat_g: Math.round(fatKcal / 9),
  };
}

export const DIET_PREFERENCES = [
  'none',
  'vegetarian',
  'vegan',
  'keto',
  'mediterranean',
  'paleo',
  'low_carb',
  'celiac',
] as const;

export type DietPreference = typeof DIET_PREFERENCES[number];

export const DIET_LABELS: Record<DietPreference, string> = {
  none: 'Nessuna',
  vegetarian: 'Vegetariana',
  vegan: 'Vegana',
  keto: 'Keto',
  mediterranean: 'Mediterranea',
  paleo: 'Paleo',
  low_carb: 'Low carb',
  celiac: 'Celiaca (senza glutine)',
};

export const GLUTEN_FOODS = [
  'pasta',
  'pane',
  'pizza',
  'grano',
  'frumento',
  'farro',
  'orzo',
  'segale',
  'couscous',
  'bulgur',
  'seitan',
  'crackers',
  'grissini',
  'biscotti',
  'muffin',
  'pancake',
  'waffle',
  'tortilla di grano',
  'cereali',
  'muesli',
  'birra',
  'soia (salsa)',
  'panko',
];

// ─── Goal types ───────────────────────────────────────────────────────────────

export type Goal = 'cut' | 'lean_bulk' | 'maintain';

export const GOAL_LABELS: Record<Goal, string> = {
  cut: 'Cut (dimagrimento)',
  lean_bulk: 'Lean bulk (massa pulita)',
  maintain: 'Mantenimento',
};

export function calorieTargetForGoal(tdee: number, goal: Goal): number {
  if (goal === 'cut') return Math.round(tdee * 0.8);       // -20%
  if (goal === 'lean_bulk') return Math.round(tdee * 1.10); // +10%
  return Math.round(tdee);
}

export function macroSplitForGoal(
  calories: number,
  goal: Goal,
): { protein_g: number; carbs_g: number; fat_g: number } {
  let p = 0.30, c = 0.45, f = 0.25; // maintain default
  if (goal === 'cut')        { p = 0.40; c = 0.35; f = 0.25; }
  if (goal === 'lean_bulk')  { p = 0.30; c = 0.50; f = 0.20; }
  return {
    protein_g: Math.round((calories * p) / 4),
    carbs_g:   Math.round((calories * c) / 4),
    fat_g:     Math.round((calories * f) / 9),
  };
}

// ─── Body metrics ─────────────────────────────────────────────────────────────

export function calculateIdealWeight(height_cm: number): {
  min_kg: number;
  max_kg: number;
  target_kg: number;
} {
  const h = height_cm / 100;
  return {
    min_kg:    Math.round(18.5 * h * h),
    max_kg:    Math.round(24.9 * h * h),
    target_kg: Math.round(22 * h * h), // mid healthy BMI
  };
}

export function calculateBMI(weight_kg: number, height_cm: number): number {
  const h = height_cm / 100;
  return Math.round((weight_kg / (h * h)) * 10) / 10;
}

export function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Sottopeso',  color: '#0ea5e9' };
  if (bmi < 25)   return { label: 'Normopeso',  color: '#22c55e' };
  if (bmi < 30)   return { label: 'Sovrappeso', color: '#f59e0b' };
  return            { label: 'Obesità',          color: '#ef4444' };
}
