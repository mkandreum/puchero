import type { Slot } from './types';

export type Category = 'verdura' | 'proteina' | 'base' | 'fruta' | 'cereal' | 'lacteo';

export interface Ingredient {
  id: string;
  name: string;
  cat: Category;
  /** kcal por ración aproximada */
  kcal: number;
  /** gramos de proteína por ración aproximada */
  protein: number;
  green?: boolean;
  /** Alérgenos que contiene (ver ALLERGIES) */
  allergens?: string[];
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
  { id: 'huevo', name: 'Huevo', cat: 'proteina', kcal: 140, protein: 12, allergens: ['huevo'] },
  { id: 'pescado', name: 'Pescado', cat: 'proteina', kcal: 120, protein: 22, allergens: ['pescado'] },
  { id: 'gambas', name: 'Gambas', cat: 'proteina', kcal: 100, protein: 20, allergens: ['marisco'] },
  { id: 'ternera', name: 'Ternera', cat: 'proteina', kcal: 220, protein: 26 },
  { id: 'alubias', name: 'Alubias', cat: 'proteina', kcal: 140, protein: 9 },
  { id: 'bacon', name: 'Bacon', cat: 'proteina', kcal: 160, protein: 10 },
  { id: 'arroz', name: 'Arroz', cat: 'base', kcal: 200, protein: 4 },
  { id: 'pasta', name: 'Pasta', cat: 'base', kcal: 220, protein: 8, allergens: ['gluten'] },
  { id: 'patata', name: 'Patata', cat: 'base', kcal: 130, protein: 3 },
  { id: 'pan', name: 'Pan', cat: 'base', kcal: 160, protein: 5, allergens: ['gluten'] },
  { id: 'queso', name: 'Queso', cat: 'base', kcal: 110, protein: 7, allergens: ['lactosa'] },
  { id: 'limon', name: 'Limón', cat: 'base', kcal: 5, protein: 0 },
  { id: 'aceitunas', name: 'Aceitunas', cat: 'base', kcal: 60, protein: 0 },
  // Desayunos y meriendas
  { id: 'platano', name: 'Plátano', cat: 'fruta', kcal: 105, protein: 1 },
  { id: 'manzana', name: 'Manzana', cat: 'fruta', kcal: 80, protein: 0 },
  { id: 'fresa', name: 'Fresas', cat: 'fruta', kcal: 35, protein: 1 },
  { id: 'arandanos', name: 'Arándanos', cat: 'fruta', kcal: 45, protein: 1 },
  { id: 'kiwi', name: 'Kiwi', cat: 'fruta', kcal: 45, protein: 1, green: true },
  { id: 'naranja', name: 'Naranja', cat: 'fruta', kcal: 60, protein: 1 },
  { id: 'mango', name: 'Mango', cat: 'fruta', kcal: 100, protein: 1 },
  { id: 'pina', name: 'Piña', cat: 'fruta', kcal: 50, protein: 1 },
  { id: 'avena', name: 'Avena', cat: 'cereal', kcal: 150, protein: 5, allergens: ['gluten'] },
  { id: 'tortitas', name: 'Tortitas', cat: 'cereal', kcal: 180, protein: 6, allergens: ['gluten', 'huevo', 'lactosa'] },
  { id: 'frutos', name: 'Frutos secos', cat: 'cereal', kcal: 170, protein: 7, allergens: ['frutos'] },
  { id: 'miel', name: 'Miel', cat: 'cereal', kcal: 60, protein: 0 },
  { id: 'chocolate', name: 'Choco negro', cat: 'cereal', kcal: 110, protein: 2, allergens: ['lactosa'] },
  { id: 'yogur', name: 'Yogur', cat: 'lacteo', kcal: 100, protein: 9, allergens: ['lactosa'] },
  { id: 'leche', name: 'Leche', cat: 'lacteo', kcal: 120, protein: 8, allergens: ['lactosa'] }
];

export const BY_ID: Record<string, Ingredient> = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'verdura', label: 'Verdura' },
  { id: 'proteina', label: 'Proteína' },
  { id: 'base', label: 'Base y extras' },
  { id: 'fruta', label: 'Fruta' },
  { id: 'cereal', label: 'Cereales y dulce' },
  { id: 'lacteo', label: 'Lácteos' }
];

export interface Shelf {
  id: string;
  label: string;
  ids: string[];
}

/** Lo que se ve en el súper según la comida: el desayuno no es una cena pequeña. */
export const SHELVES: Record<Slot, Shelf[]> = {
  desayuno: [
    { id: 'cereal', label: 'Avena y pan', ids: ['avena', 'pan', 'tortitas', 'frutos', 'miel', 'chocolate'] },
    { id: 'fruta', label: 'Fruta', ids: ['platano', 'fresa', 'arandanos', 'manzana', 'kiwi', 'naranja', 'mango', 'pina'] },
    { id: 'proteina', label: 'Lácteos y huevo', ids: ['yogur', 'leche', 'huevo', 'queso', 'aguacate', 'tomate'] }
  ],
  comida: [
    { id: 'verdura', label: 'Verdura', ids: INGREDIENTS.filter((i) => i.cat === 'verdura').map((i) => i.id) },
    { id: 'proteina', label: 'Proteína', ids: INGREDIENTS.filter((i) => i.cat === 'proteina').map((i) => i.id) },
    { id: 'base', label: 'Base y extras', ids: INGREDIENTS.filter((i) => i.cat === 'base').map((i) => i.id) }
  ],
  merienda: [
    { id: 'fruta', label: 'Fruta', ids: ['manzana', 'platano', 'fresa', 'arandanos', 'kiwi', 'naranja', 'mango', 'pina'] },
    { id: 'lacteo', label: 'Yogur y queso', ids: ['yogur', 'leche', 'queso', 'huevo'] },
    { id: 'cereal', label: 'Para picar', ids: ['frutos', 'avena', 'pan', 'tortitas', 'chocolate', 'miel', 'aguacate', 'pepino', 'zanahoria'] }
  ],
  cena: [
    { id: 'verdura', label: 'Verdura', ids: INGREDIENTS.filter((i) => i.cat === 'verdura').map((i) => i.id) },
    { id: 'proteina', label: 'Proteína ligera', ids: ['pescado', 'huevo', 'pollo', 'gambas', 'alubias', 'ternera'] },
    { id: 'base', label: 'Acompaña', ids: ['patata', 'arroz', 'pan', 'queso', 'yogur', 'limon', 'aceitunas'] }
  ]
};

export const ALLERGIES: { id: string; label: string }[] = [
  { id: 'gluten', label: 'Gluten' },
  { id: 'lactosa', label: 'Lactosa' },
  { id: 'huevo', label: 'Huevo' },
  { id: 'frutos', label: 'Frutos secos' },
  { id: 'marisco', label: 'Marisco' },
  { id: 'pescado', label: 'Pescado' }
];

export const isAllergic = (id: string, allergies: string[]) =>
  (BY_ID[id]?.allergens ?? []).some((a) => allergies.includes(a));

export const MAX_IN_POT = 8;

export function isValidIngredient(id: unknown): id is string {
  return typeof id === 'string' && Object.hasOwn(BY_ID, id);
}

export function foodImg(id: string): string {
  return `/food/${id}.webp`;
}
