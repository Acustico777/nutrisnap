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
};
