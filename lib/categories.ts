export const CATEGORIES = ['vegetables', 'meat', 'fish', 'fruit', 'other'] as const;
export type Category = typeof CATEGORIES[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  vegetables: 'Verdure',
  meat: 'Carne',
  fish: 'Pesce',
  fruit: 'Frutta',
  other: 'Altro',
};

export const CATEGORY_COLORS: Record<Category, string> = {
  vegetables: '#22c55e',
  meat: '#ef4444',
  fish: '#0ea5e9',
  fruit: '#f59e0b',
  other: '#a3a3a3',
};

const MEAT_KEYWORDS = [
  'pollo', 'manzo', 'maiale', 'vitello', 'agnello', 'tacchino', 'coniglio',
  'prosciutto', 'salame', 'mortadella', 'pancetta', 'bresaola', 'speck',
  'salsiccia', 'polpette', 'ragù', 'bistecca', 'braciola', 'costolette',
  'beef', 'chicken', 'pork', 'lamb', 'turkey', 'veal', 'bacon', 'ham',
  'sausage', 'meatball', 'steak',
];

const FISH_KEYWORDS = [
  'salmone', 'tonno', 'pesce', 'sgombro', 'merluzzo', 'branzino', 'orata',
  'gamberi', 'calamari', 'cozze', 'vongole', 'baccalà', 'acciughe', 'sardine',
  'spigola', 'dentice', 'rombo', 'trota', 'aringa', 'polpo',
  'salmon', 'tuna', 'fish', 'mackerel', 'cod', 'sea bass', 'shrimp',
  'squid', 'mussels', 'clams', 'anchovy', 'sardine', 'trout', 'herring', 'octopus',
];

const FRUIT_KEYWORDS = [
  'mela', 'pera', 'banana', 'arancia', 'fragola', 'uva', 'pesca', 'kiwi',
  'ananas', 'frutta', 'lampone', 'mirtillo', 'ciliegia', 'melone', 'cocomero',
  'limone', 'lime', 'mandarino', 'pompelmo', 'fico', 'dattero', 'mango',
  'papaya', 'avocado', 'melograno', 'cachi',
  'apple', 'pear', 'orange', 'strawberry', 'grape', 'peach', 'pineapple',
  'raspberry', 'blueberry', 'cherry', 'melon', 'watermelon', 'lemon',
  'mandarin', 'grapefruit', 'fig', 'date', 'pomegranate',
];

const VEGETABLE_KEYWORDS = [
  'broccoli', 'spinaci', 'insalata', 'carota', 'zucchina', 'melanzana',
  'peperone', 'pomodoro', 'verdura', 'cipolla', 'aglio', 'porro', 'sedano',
  'cetriolo', 'funghi', 'cavolo', 'cavolfiore', 'carciofo', 'asparago',
  'fagiolini', 'piselli', 'lenticchie', 'ceci', 'fagioli', 'bietola',
  'rucola', 'radicchio', 'finocchio', 'lattuga', 'rapa', 'barbabietola',
  'mais', 'patata', 'patate',
  'lettuce', 'cabbage', 'broccoli', 'spinach', 'carrot', 'zucchini',
  'eggplant', 'pepper', 'tomato', 'onion', 'garlic', 'leek', 'celery',
  'cucumber', 'mushroom', 'cauliflower', 'artichoke', 'asparagus',
  'green beans', 'peas', 'lentils', 'chickpeas', 'beans', 'chard',
  'arugula', 'fennel', 'turnip', 'beet', 'corn', 'potato',
];

export function inferCategory(name: string): Category {
  const lower = name.toLowerCase();

  for (const kw of FISH_KEYWORDS) {
    if (lower.includes(kw)) return 'fish';
  }
  for (const kw of MEAT_KEYWORDS) {
    if (lower.includes(kw)) return 'meat';
  }
  for (const kw of FRUIT_KEYWORDS) {
    if (lower.includes(kw)) return 'fruit';
  }
  for (const kw of VEGETABLE_KEYWORDS) {
    if (lower.includes(kw)) return 'vegetables';
  }

  return 'other';
}
