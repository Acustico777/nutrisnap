export const ADMIN_EMAILS: string[] = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);

export const DEFAULT_GOALS = {
  daily_calories: 2000,
  daily_protein_g: 150,
  daily_carbs_g: 250,
  daily_fat_g: 65,
} as const;

export const MACRO_COLORS = {
  protein: '#3b82f6',  // blue
  carbs: '#f97316',    // orange
  fat: '#ec4899',      // pink
  calories: '#10b981', // emerald
} as const;

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
