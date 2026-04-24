export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
  created_at: string;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  sex: 'male' | 'female' | null;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  diet_preference: string;
  excluded_foods: string[];
  bmr: number | null;
  tdee: number | null;
}

export interface Meal {
  id: string;
  user_id: string;
  photo_url: string | null;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  notes: string | null;
  consumed_at: string;
  created_at: string;
  meal_items?: MealItem[];
}

export interface MealItem {
  id: string;
  meal_id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  category?: 'vegetables' | 'meat' | 'fish' | 'fruit' | 'other';
}

export interface InviteCode {
  code: string;
  created_by: string | null;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface AnalyzedFoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  category?: 'vegetables' | 'meat' | 'fish' | 'fruit' | 'other';
}

export interface AnalyzeResponse {
  items: AnalyzedFoodItem[];
  confidence: 'high' | 'medium' | 'low';
  notes: string;
}

export interface DailyGoals {
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
}

export interface DailyTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealPlanMeal {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ingredients: string[];
}

export interface MealPlanDay {
  day_label: string;
  meals: MealPlanMeal[];
}

export interface MealPlan {
  id: string;
  user_id: string;
  plan_type: 'daily' | 'weekly';
  diet_preference: string | null;
  target_calories: number | null;
  plan_data: { days: MealPlanDay[] };
  created_at: string;
}

export interface CategoryBreakdown {
  category: 'vegetables' | 'meat' | 'fish' | 'fruit' | 'other';
  label: string;
  calories: number;
  count: number;
  percent: number;
}

export interface FoodSuggestion {
  category: 'vegetables' | 'meat' | 'fish' | 'fruit' | 'other';
  reason: string;
  examples: string[];
}
