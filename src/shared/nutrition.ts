// Valores nutricionales aproximados por 100 g (o 100 ml) y gramos de una ración por persona.
// [kcal, proteína g, hidratos g, grasa g, fibra g, gramos de la ración]
// Fuentes: tablas de composición de alimentos habituales (BEDCA / USDA), redondeadas.
// Cereales y pasta, en seco; legumbres, cocidas; el resto, tal cual se compra.
export const NUTRITION: Record<string, [number, number, number, number, number, number]> = {
  brocoli: [34, 2.8, 7, 0.4, 2.6, 150],
  espinaca: [23, 2.9, 3.6, 0.4, 2.2, 80],
  lechuga: [15, 1.4, 2.9, 0.2, 1.3, 80],
  guisantes: [81, 5.4, 14.5, 0.4, 5.7, 80],
  tomate: [18, 0.9, 3.9, 0.2, 1.2, 120],
  zanahoria: [41, 0.9, 9.6, 0.2, 2.8, 80],
  pimiento: [26, 1, 6, 0.3, 2, 75],
  berenjena: [25, 1, 6, 0.2, 3, 125],
  pepino: [15, 0.7, 3.6, 0.1, 0.5, 100],
  cebolla: [40, 1.1, 9.3, 0.1, 1.7, 55],
  ajo: [149, 6.4, 33, 0.5, 2.1, 4],
  champinon: [22, 3.1, 3.3, 0.3, 1, 100],
  maiz: [86, 3.3, 19, 1.4, 2.7, 60],
  aguacate: [160, 2, 8.5, 14.7, 6.7, 85],
  boniato: [86, 1.6, 20, 0.1, 3, 150],
  castanas: [245, 3.2, 53, 2.2, 5.1, 60],
  pollo: [165, 31, 0, 3.6, 0, 150],
  huevo: [143, 12.6, 0.7, 9.5, 0, 110],
  pescado: [90, 19, 0, 1.2, 0, 150],
  salmon: [208, 20, 0, 13, 0, 130],
  atun: [116, 26, 0, 1, 0, 80],
  gambas: [85, 20, 0.2, 0.5, 0, 120],
  calamar: [92, 16, 3, 1.4, 0, 120],
  cangrejo: [87, 18, 0, 1.1, 0, 100],
  ostras: [86, 12, 3.7, 2.2, 0, 150],
  ternera: [187, 26, 0, 9, 0, 150],
  cerdo: [190, 25, 0, 10, 0, 150],
  bacon: [417, 13, 1.4, 40, 0, 40],
  alubias: [127, 8.7, 22.8, 0.5, 6.4, 120],
  lentejas: [116, 9, 20, 0.4, 7.9, 150],
  falafel: [333, 13, 31, 18, 5, 100],
  arroz: [360, 7, 79, 0.6, 1.3, 80],
  pasta: [357, 12.5, 71, 1.5, 3.2, 90],
  patata: [77, 2, 17, 0.1, 2.2, 200],
  pan: [265, 9, 49, 3.2, 2.7, 60],
  baguette: [270, 9, 56, 1.4, 2.5, 70],
  tortilla: [310, 8.3, 52, 8, 2.5, 80],
  empanadillas: [330, 7, 32, 19, 1.5, 135],
  queso: [380, 25, 1.3, 31, 0, 40],
  limon: [29, 1.1, 9, 0.3, 2.8, 30],
  aceitunas: [115, 0.8, 6, 11, 3.3, 30],
  platano: [89, 1.1, 23, 0.3, 2.6, 120],
  manzana: [52, 0.3, 14, 0.2, 2.4, 180],
  manzana_verde: [52, 0.3, 14, 0.2, 2.4, 180],
  pera: [57, 0.4, 15, 0.1, 3.1, 170],
  fresa: [32, 0.7, 7.7, 0.3, 2, 100],
  cerezas: [63, 1.1, 16, 0.2, 2.1, 100],
  arandanos: [57, 0.7, 14, 0.3, 2.4, 60],
  uvas: [69, 0.7, 18, 0.2, 0.9, 100],
  kiwi: [61, 1.1, 15, 0.5, 3, 75],
  naranja: [47, 0.9, 12, 0.1, 2.4, 150],
  melocoton: [39, 0.9, 10, 0.3, 1.5, 150],
  mango: [60, 0.8, 15, 0.4, 1.6, 100],
  pina: [50, 0.5, 13, 0.1, 1.4, 120],
  sandia: [30, 0.6, 7.6, 0.2, 0.4, 200],
  melon: [34, 0.8, 8, 0.2, 0.9, 200],
  coco: [354, 3.3, 15, 33, 9, 40],
  avena: [389, 17, 66, 7, 10.6, 40],
  tortitas: [227, 6, 34, 7.5, 1.3, 90],
  gofre: [291, 6, 33, 15, 1.5, 75],
  bagel: [250, 10, 49, 1.5, 2.3, 95],
  croissant: [406, 8.2, 46, 21, 2.4, 60],
  galletas: [450, 6, 70, 16, 2.5, 30],
  palomitas: [387, 13, 78, 4.5, 15, 25],
  frutos: [600, 20, 18, 52, 8, 30],
  miel: [304, 0.3, 82, 0, 0.2, 21],
  chocolate: [546, 5, 60, 31, 7, 20],
  yogur: [97, 9, 4, 5, 0, 125],
  leche: [64, 3.4, 4.8, 3.6, 0, 206],
  helado: [207, 3.5, 24, 11, 0.7, 80],
  cafe: [1, 0.1, 0, 0, 0, 200],
  te: [1, 0, 0.2, 0, 0, 200],
  zumo: [45, 0.7, 10, 0.2, 0.2, 200],
  mantequilla: [717, 0.9, 0.1, 81, 0, 10],
  sal: [0, 0, 0, 0, 0, 1],
  jengibre: [80, 1.8, 18, 0.8, 2, 5],
  guindilla: [40, 2, 9, 0.4, 1.5, 5]
};

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

/** Porcentaje de las kcal que aporta cada macro (proteína y carbohidratos 4 kcal/g, grasa 9 kcal/g). */
export function energySplit(m: Macros): { protein: number; carbs: number; fat: number } {
  const p = m.protein * 4;
  const c = m.carbs * 4;
  const f = m.fat * 9;
  const t = p + c + f || 1;
  const pc = Math.round((p / t) * 100);
  const cc = Math.round((c / t) * 100);
  return { protein: pc, carbs: cc, fat: Math.max(0, 100 - pc - cc) };
}
