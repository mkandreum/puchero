export type Category = 'verdura' | 'proteina' | 'base';

export interface Ingredient {
  id: string;
  name: string;
  cat: Category;
  /** kcal por ración aproximada */
  kcal: number;
  /** gramos de proteína por ración aproximada */
  protein: number;
  green?: boolean;
}

export const INGREDIENTS: Ingredient[] = [
  { id: 'brocoli', name: 'Brócoli', cat: 'verdura', kcal: 35, protein: 3, green: true },
  { id: 'espinaca', name: 'Espinacas', cat: 'verdura', kcal: 25, protein: 3, green: true },
  { id: 'tomate', name: 'Tomate', cat: 'verdura', kcal: 20, protein: 1 },
  { id: 'zanahoria', name: 'Zanahoria', cat: 'verdura', kcal: 30, protein: 1 },
  { id: 'pimiento', name: 'Pimiento', cat: 'verdura', kcal: 25, protein: 1 },
  { id: 'berenjena', name: 'Berenjena', cat: 'verdura', kcal: 30, protein: 1 },
  { id: 'pepino', name: 'Pepino', cat: 'verdura', kcal: 15, protein: 1, green: true },
  { id: 'cebolla', name: 'Cebolla', cat: 'verdura', kcal: 30, protein: 1 },
  { id: 'ajo', name: 'Ajo', cat: 'verdura', kcal: 10, protein: 0 },
  { id: 'champinon', name: 'Champiñón', cat: 'verdura', kcal: 20, protein: 3 },
  { id: 'maiz', name: 'Maíz', cat: 'verdura', kcal: 90, protein: 3 },
  { id: 'aguacate', name: 'Aguacate', cat: 'verdura', kcal: 160, protein: 2, green: true },
  { id: 'pollo', name: 'Pollo', cat: 'proteina', kcal: 165, protein: 31 },
  { id: 'huevo', name: 'Huevo', cat: 'proteina', kcal: 140, protein: 12 },
  { id: 'pescado', name: 'Pescado', cat: 'proteina', kcal: 120, protein: 22 },
  { id: 'gambas', name: 'Gambas', cat: 'proteina', kcal: 100, protein: 20 },
  { id: 'ternera', name: 'Ternera', cat: 'proteina', kcal: 220, protein: 26 },
  { id: 'alubias', name: 'Alubias', cat: 'proteina', kcal: 140, protein: 9 },
  { id: 'bacon', name: 'Bacon', cat: 'proteina', kcal: 160, protein: 10 },
  { id: 'arroz', name: 'Arroz', cat: 'base', kcal: 200, protein: 4 },
  { id: 'pasta', name: 'Pasta', cat: 'base', kcal: 220, protein: 8 },
  { id: 'patata', name: 'Patata', cat: 'base', kcal: 130, protein: 3 },
  { id: 'pan', name: 'Pan', cat: 'base', kcal: 160, protein: 5 },
  { id: 'queso', name: 'Queso', cat: 'base', kcal: 110, protein: 7 },
  { id: 'limon', name: 'Limón', cat: 'base', kcal: 5, protein: 0 },
  { id: 'aceitunas', name: 'Aceitunas', cat: 'base', kcal: 60, protein: 0 }
];

export const BY_ID: Record<string, Ingredient> = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'verdura', label: 'Verdura' },
  { id: 'proteina', label: 'Proteína' },
  { id: 'base', label: 'Base y extras' }
];

export const MAX_IN_POT = 8;

export function isValidIngredient(id: unknown): id is string {
  return typeof id === 'string' && id in BY_ID;
}

export function foodImg(id: string): string {
  return `/food/${id}.webp`;
}
