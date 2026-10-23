import type { Slot } from './types';

export type Category = 'verdura' | 'proteina' | 'base' | 'fruta' | 'cereal' | 'lacteo' | 'despensa';
export type Unit = 'g' | 'ud' | 'ml' | 'cda' | 'pizca' | 'diente';
/** Color de cocina: comer de muchos colores = comer variado (retos, logros y resumen). */
export type FoodColor = 'verde' | 'rojo' | 'naranja' | 'amarillo' | 'morado' | 'blanco' | 'marron';

export interface Ingredient {
  id: string;
  name: string;
  cat: Category;
  /** kcal por ración aproximada */
  kcal: number;
  /** gramos de proteína por ración aproximada */
  protein: number;
  /** ración por persona */
  qty: number;
  unit: Unit;
  color: FoodColor;
  green?: boolean;
  /** Alérgenos que contiene (ver ALLERGIES) */
  allergens?: string[];
}

const I = (
  id: string, name: string, cat: Category, kcal: number, protein: number,
  qty: number, unit: Unit, color: FoodColor, extra: Partial<Ingredient> = {}
): Ingredient => ({ id, name, cat, kcal, protein, qty, unit, color, ...extra });

export const INGREDIENTS: Ingredient[] = [
  // Verdura
  I('brocoli', 'Brócoli', 'verdura', 35, 3, 150, 'g', 'verde', { green: true }),
  I('espinaca', 'Espinacas', 'verdura', 25, 3, 80, 'g', 'verde', { green: true }),
  I('lechuga', 'Lechuga', 'verdura', 15, 1, 80, 'g', 'verde', { green: true }),
  I('guisantes', 'Guisantes', 'verdura', 80, 5, 80, 'g', 'verde', { green: true }),
  I('tomate', 'Tomate', 'verdura', 20, 1, 1, 'ud', 'rojo'),
  I('zanahoria', 'Zanahoria', 'verdura', 30, 1, 1, 'ud', 'naranja'),
  I('pimiento', 'Pimiento', 'verdura', 25, 1, 0.5, 'ud', 'verde', { green: true }),
  I('berenjena', 'Berenjena', 'verdura', 30, 1, 0.5, 'ud', 'morado'),
  I('pepino', 'Pepino', 'verdura', 15, 1, 0.5, 'ud', 'verde', { green: true }),
  I('cebolla', 'Cebolla', 'verdura', 30, 1, 0.5, 'ud', 'blanco'),
  I('ajo', 'Ajo', 'verdura', 10, 0, 1, 'diente', 'blanco'),
  I('champinon', 'Champiñón', 'verdura', 20, 3, 100, 'g', 'marron'),
  I('maiz', 'Maíz', 'verdura', 90, 3, 60, 'g', 'amarillo'),
  I('aguacate', 'Aguacate', 'verdura', 160, 2, 0.5, 'ud', 'verde', { green: true }),
  I('boniato', 'Boniato', 'verdura', 120, 2, 150, 'g', 'naranja'),
  I('castanas', 'Castañas', 'verdura', 130, 2, 60, 'g', 'marron'),
  // Proteína
  I('pollo', 'Pollo', 'proteina', 165, 31, 150, 'g', 'blanco'),
  I('huevo', 'Huevo', 'proteina', 140, 12, 2, 'ud', 'amarillo', { allergens: ['huevo'] }),
  I('pescado', 'Pescado', 'proteina', 120, 22, 150, 'g', 'blanco', { allergens: ['pescado'] }),
  I('salmon', 'Salmón', 'proteina', 210, 22, 130, 'g', 'naranja', { allergens: ['pescado'] }),
  I('atun', 'Atún en lata', 'proteina', 130, 25, 1, 'ud', 'rojo', { allergens: ['pescado'] }),
  I('gambas', 'Gambas', 'proteina', 100, 20, 120, 'g', 'naranja', { allergens: ['marisco'] }),
  I('calamar', 'Calamar', 'proteina', 90, 16, 120, 'g', 'blanco', { allergens: ['marisco'] }),
  I('cangrejo', 'Cangrejo', 'proteina', 85, 18, 100, 'g', 'rojo', { allergens: ['marisco'] }),
  I('ostras', 'Mejillones', 'proteina', 85, 12, 150, 'g', 'marron', { allergens: ['marisco'] }),
  I('ternera', 'Ternera', 'proteina', 220, 26, 150, 'g', 'rojo'),
  I('cerdo', 'Cerdo', 'proteina', 240, 25, 150, 'g', 'marron'),
  I('bacon', 'Bacon', 'proteina', 160, 10, 40, 'g', 'rojo'),
  I('alubias', 'Alubias', 'proteina', 140, 9, 120, 'g', 'marron'),
  I('lentejas', 'Lentejas', 'proteina', 150, 11, 70, 'g', 'marron'),
  I('falafel', 'Falafel', 'proteina', 180, 7, 4, 'ud', 'marron'),
  // Base
  I('arroz', 'Arroz', 'base', 200, 4, 80, 'g', 'blanco'),
  I('pasta', 'Pasta', 'base', 220, 8, 90, 'g', 'amarillo', { allergens: ['gluten'] }),
  I('patata', 'Patata', 'base', 130, 3, 200, 'g', 'marron'),
  I('pan', 'Pan', 'base', 160, 5, 60, 'g', 'marron', { allergens: ['gluten'] }),
  I('baguette', 'Barra de pan', 'base', 180, 6, 70, 'g', 'marron', { allergens: ['gluten'] }),
  I('tortilla', 'Tortilla de trigo', 'base', 150, 4, 2, 'ud', 'blanco', { allergens: ['gluten'] }),
  I('empanadillas', 'Empanadillas', 'base', 220, 7, 3, 'ud', 'amarillo', { allergens: ['gluten'] }),
  I('queso', 'Queso', 'base', 110, 7, 40, 'g', 'amarillo', { allergens: ['lactosa'] }),
  I('limon', 'Limón', 'base', 5, 0, 0.5, 'ud', 'amarillo'),
  I('aceitunas', 'Aceitunas', 'base', 60, 0, 30, 'g', 'verde'),
  // Fruta
  I('platano', 'Plátano', 'fruta', 105, 1, 1, 'ud', 'amarillo'),
  I('manzana', 'Manzana', 'fruta', 80, 0, 1, 'ud', 'rojo'),
  I('manzana_verde', 'Manzana verde', 'fruta', 80, 0, 1, 'ud', 'verde', { green: true }),
  I('pera', 'Pera', 'fruta', 85, 0, 1, 'ud', 'verde'),
  I('fresa', 'Fresas', 'fruta', 35, 1, 100, 'g', 'rojo'),
  I('cerezas', 'Cerezas', 'fruta', 60, 1, 100, 'g', 'rojo'),
  I('arandanos', 'Arándanos', 'fruta', 45, 1, 60, 'g', 'morado'),
  I('uvas', 'Uvas', 'fruta', 70, 1, 100, 'g', 'morado'),
  I('kiwi', 'Kiwi', 'fruta', 45, 1, 1, 'ud', 'verde', { green: true }),
  I('naranja', 'Naranja', 'fruta', 60, 1, 1, 'ud', 'naranja'),
  I('melocoton', 'Melocotón', 'fruta', 60, 1, 1, 'ud', 'naranja'),
  I('mango', 'Mango', 'fruta', 100, 1, 0.5, 'ud', 'naranja'),
  I('pina', 'Piña', 'fruta', 50, 1, 120, 'g', 'amarillo'),
  I('sandia', 'Sandía', 'fruta', 45, 1, 200, 'g', 'rojo'),
  I('melon', 'Melón', 'fruta', 50, 1, 200, 'g', 'verde'),
  I('coco', 'Coco', 'fruta', 150, 1, 40, 'g', 'blanco'),
  // Cereales y dulce
  I('avena', 'Avena', 'cereal', 150, 5, 40, 'g', 'marron', { allergens: ['gluten'] }),
  I('tortitas', 'Tortitas', 'cereal', 180, 6, 3, 'ud', 'amarillo', { allergens: ['gluten', 'huevo', 'lactosa'] }),
  I('gofre', 'Gofre', 'cereal', 200, 5, 1, 'ud', 'amarillo', { allergens: ['gluten', 'huevo', 'lactosa'] }),
  I('bagel', 'Bagel', 'cereal', 250, 10, 1, 'ud', 'marron', { allergens: ['gluten'] }),
  I('croissant', 'Croissant', 'cereal', 230, 5, 1, 'ud', 'amarillo', { allergens: ['gluten', 'lactosa'] }),
  I('galletas', 'Galletas', 'cereal', 140, 2, 3, 'ud', 'marron', { allergens: ['gluten'] }),
  I('palomitas', 'Palomitas', 'cereal', 110, 3, 25, 'g', 'blanco'),
  I('frutos', 'Frutos secos', 'cereal', 170, 7, 30, 'g', 'marron', { allergens: ['frutos'] }),
  I('miel', 'Miel', 'cereal', 60, 0, 1, 'cda', 'amarillo'),
  I('chocolate', 'Choco negro', 'cereal', 110, 2, 20, 'g', 'marron', { allergens: ['lactosa'] }),
  // Lácteos y bebidas
  I('yogur', 'Yogur', 'lacteo', 100, 9, 1, 'ud', 'blanco', { allergens: ['lactosa'] }),
  I('leche', 'Leche', 'lacteo', 120, 8, 200, 'ml', 'blanco', { allergens: ['lactosa'] }),
  I('helado', 'Helado', 'lacteo', 140, 3, 80, 'g', 'blanco', { allergens: ['lactosa'] }),
  I('cafe', 'Café', 'lacteo', 5, 0, 1, 'ud', 'marron'),
  I('te', 'Té', 'lacteo', 2, 0, 1, 'ud', 'verde'),
  I('zumo', 'Zumo', 'lacteo', 90, 1, 200, 'ml', 'naranja'),
  // Despensa: no cuentan como alimento principal, dan sabor
  I('mantequilla', 'Mantequilla', 'despensa', 70, 0, 10, 'g', 'amarillo', { allergens: ['lactosa'] }),
  I('sal', 'Sal y especias', 'despensa', 0, 0, 1, 'pizca', 'blanco'),
  I('jengibre', 'Jengibre', 'despensa', 5, 0, 5, 'g', 'amarillo'),
  I('guindilla', 'Guindilla', 'despensa', 5, 0, 1, 'ud', 'rojo')
];

export const BY_ID: Record<string, Ingredient> = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'verdura', label: 'Verdura' },
  { id: 'proteina', label: 'Proteína' },
  { id: 'base', label: 'Base y extras' },
  { id: 'fruta', label: 'Fruta' },
  { id: 'cereal', label: 'Cereales y dulce' },
  { id: 'lacteo', label: 'Lácteos y bebidas' },
  { id: 'despensa', label: 'Despensa' }
];

export interface Shelf {
  id: string;
  label: string;
  ids: string[];
}

const ofCat = (c: Category) => INGREDIENTS.filter((i) => i.cat === c).map((i) => i.id);

/** Lo que se ve en el súper según la comida: el desayuno no es una cena pequeña. */
export const SHELVES: Record<Slot, Shelf[]> = {
  desayuno: [
    { id: 'cereal', label: 'Avena y pan', ids: ['avena', 'pan', 'tortitas', 'gofre', 'bagel', 'croissant', 'frutos', 'miel', 'chocolate', 'mantequilla'] },
    { id: 'fruta', label: 'Fruta', ids: ['platano', 'fresa', 'arandanos', 'manzana', 'kiwi', 'naranja', 'mango', 'pina', 'pera', 'uvas', 'cerezas', 'melocoton'] },
    { id: 'proteina', label: 'Lácteos y huevo', ids: ['yogur', 'leche', 'huevo', 'queso', 'aguacate', 'tomate', 'salmon', 'bacon'] },
    { id: 'bebida', label: 'Para beber', ids: ['cafe', 'te', 'zumo', 'leche'] }
  ],
  comida: [
    { id: 'verdura', label: 'Verdura', ids: ofCat('verdura') },
    { id: 'proteina', label: 'Proteína', ids: ofCat('proteina') },
    { id: 'base', label: 'Base y extras', ids: ofCat('base') },
    { id: 'despensa', label: 'Despensa', ids: ofCat('despensa') }
  ],
  merienda: [
    { id: 'fruta', label: 'Fruta', ids: ['manzana', 'platano', 'fresa', 'arandanos', 'kiwi', 'naranja', 'mango', 'pina', 'uvas', 'sandia', 'melon', 'cerezas', 'melocoton', 'pera', 'coco'] },
    { id: 'lacteo', label: 'Yogur y queso', ids: ['yogur', 'leche', 'queso', 'huevo', 'helado'] },
    { id: 'cereal', label: 'Para picar', ids: ['frutos', 'castanas', 'palomitas', 'galletas', 'avena', 'pan', 'tortitas', 'croissant', 'chocolate', 'miel', 'aguacate', 'pepino', 'zanahoria'] },
    { id: 'bebida', label: 'Para beber', ids: ['cafe', 'te', 'zumo', 'leche'] }
  ],
  cena: [
    { id: 'verdura', label: 'Verdura', ids: ofCat('verdura') },
    { id: 'proteina', label: 'Proteína ligera', ids: ['pescado', 'salmon', 'atun', 'huevo', 'pollo', 'gambas', 'calamar', 'lentejas', 'alubias', 'falafel', 'ternera'] },
    { id: 'base', label: 'Acompaña', ids: ['patata', 'arroz', 'pan', 'tortilla', 'queso', 'yogur', 'limon', 'aceitunas'] },
    { id: 'despensa', label: 'Despensa', ids: ofCat('despensa') }
  ]
};

/** Bases "de verdad" para la cazuela sorpresa de comida y cena. */
export const STARCHES = ['arroz', 'pasta', 'patata', 'pan', 'tortilla'];

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

/** Busca sin tildes ni mayúsculas: "champi" → Champiñón. */
export const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Otras formas de buscar cada alimento. */
const ALIASES: Record<string, string> = {
  falafel: 'garbanzos hummus legumbre',
  lentejas: 'legumbre',
  alubias: 'judias frijoles legumbre',
  atun: 'bonito pescado',
  salmon: 'pescado azul',
  pescado: 'merluza bacalao lubina dorada',
  ostras: 'mejillones marisco',
  gambas: 'langostinos marisco',
  calamar: 'sepia chipiron marisco',
  cangrejo: 'surimi marisco',
  pan: 'tostada',
  tortilla: 'wrap fajita burrito',
  cerdo: 'lomo costillas',
  ternera: 'carne filete',
  pollo: 'pechuga',
  sal: 'especias pimienta oregano',
  lechuga: 'ensalada',
  boniato: 'batata',
  frutos: 'nueces almendras cacahuetes',
  yogur: 'kefir',
  queso: 'mozzarella',
  te: 'infusion',
  cafe: 'cafe con leche'
};

export function searchIngredients(q: string): Ingredient[] {
  const n = normalize(q);
  if (!n) return [];
  return INGREDIENTS.filter((i) => normalize(i.name).includes(n) || i.id.includes(n) || (ALIASES[i.id] ?? '').includes(n));
}

const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));

/** Cantidad para N personas: "300 g", "1 ud", "2 dientes", "1 pizca". */
export function amountFor(id: string, servings: number): string {
  const it = BY_ID[id];
  if (!it) return '';
  const raw = it.qty * servings;
  if (it.unit === 'g' || it.unit === 'ml') {
    const r = raw >= 100 ? Math.round(raw / 10) * 10 : Math.round(raw / 5) * 5;
    return `${Math.max(5, r)} ${it.unit}`;
  }
  if (it.unit === 'pizca') return servings > 2 ? 'Al gusto' : '1 pizca';
  const units = Math.round(raw * 2) / 2;
  const n = Math.max(0.5, units);
  if (it.unit === 'diente') return `${fmtNum(n)} ${n === 1 ? 'diente' : 'dientes'}`;
  if (it.unit === 'cda') return `${fmtNum(n)} ${n === 1 ? 'cucharada' : 'cucharadas'}`;
  return n === 0.5 ? '½ ud' : `${fmtNum(n)} ud`;
}

export const amountsFor = (ids: string[], servings: number) => ids.map((id) => amountFor(id, servings));

/** Color de cada alimento en pantalla (retos y resumen). */
export const COLOR_HEX: Record<FoodColor, string> = {
  verde: '#7ed957',
  rojo: '#ff5a36',
  naranja: '#ff9f43',
  amarillo: '#ffd84d',
  morado: '#9b7bff',
  blanco: '#f5f1ea',
  marron: '#b07a4f'
};
