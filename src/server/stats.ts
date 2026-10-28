import { BY_ID } from '../shared/ingredients';
import { macros } from '../shared/recipe';
import { SLOTS, type Achievement, type DaySummary, type Slot, type Summary } from '../shared/types';
import { addDays, dayKey, LETTERS, mondayOf } from './days';

export interface MealLite {
  ingredients: string[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  slot: string;
  source: string;
  servings: number;
  createdAt: Date;
}

/** Nutrientes de un plato guardado; los platos antiguos no traen hidratos, grasas ni fibra: se calculan de sus ingredientes. */
export function nutrientsOf(m: Pick<MealLite, 'ingredients' | 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber'>) {
  if (m.carbs + m.fat + m.fiber > 0) return { kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat, fiber: m.fiber };
  const x = macros(m.ingredients);
  return { kcal: m.kcal, protein: m.protein, carbs: x.carbs, fat: x.fat, fiber: x.fiber };
}

/** Resumen de los últimos 7 días (hoy incluido). */
export function summaryOf(meals: MealLite[], water: Map<string, number>, today: string): Summary {
  const start = addDays(today, -6);
  const days: DaySummary[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    const dow = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
    days.push({ date, letter: LETTERS[dow], kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, meals: 0, water: water.get(date) ?? 0 });
  }
  const byDate = new Map(days.map((d) => [d.date, d]));
  const counts = new Map<string, number>();
  const bySlot = Object.fromEntries(SLOTS.map((s) => [s, 0])) as Record<Slot, number>;
  for (const m of meals) {
    const d = byDate.get(dayKey(m.createdAt));
    if (!d) continue;
    d.meals += 1;
    // kcal y proteína son por persona: así se compara un día con otro
    const n = nutrientsOf(m);
    d.kcal += n.kcal;
    d.protein += n.protein;
    d.carbs += n.carbs;
    d.fat += n.fat;
    d.fiber += n.fiber;
    if (SLOTS.includes(m.slot as Slot)) bySlot[m.slot as Slot] += 1;
    for (const id of m.ingredients) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const foods = [...counts.keys()].filter((id) => BY_ID[id] && BY_ID[id].cat !== 'despensa');
  const colors = [...new Set(foods.map((id) => BY_ID[id].color))];
  const active = days.filter((d) => d.meals > 0);
  const avg = (f: (d: DaySummary) => number, list: DaySummary[]) => (list.length ? Math.round(list.reduce((s, d) => s + f(d), 0) / list.length) : 0);
  return {
    days,
    foods,
    colors,
    greens: foods.filter((id) => BY_ID[id].green).length,
    kcalAvg: avg((d) => d.kcal, active),
    proteinAvg: avg((d) => d.protein, active),
    carbsAvg: avg((d) => d.carbs, active),
    fatAvg: avg((d) => d.fat, active),
    fiberAvg: avg((d) => d.fiber, active),
    waterAvg: avg((d) => d.water, days),
    bySlot,
    topFoods: [...counts.entries()]
      .filter(([id]) => BY_ID[id] && BY_ID[id].cat !== 'despensa')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ id, count }))
  };
}

interface AchInput {
  meals: MealLite[];
  water: Map<string, number>;
  waterGoal: number;
  best: number;
  dislikes: string[];
  today: string;
}

/** Medallas: se calculan siempre a partir de lo cocinado, así nunca se desincronizan. */
export function achievementsOf({ meals, water, waterGoal, best, dislikes, today }: AchInput): Achievement[] {
  const total = meals.length;
  const distinct = new Set(meals.flatMap((m) => m.ingredients).filter((id) => BY_ID[id] && BY_ID[id].cat !== 'despensa'));
  const ia = meals.filter((m) => m.source === 'ia').length;
  const breakfastDays = new Set(meals.filter((m) => m.slot === 'desayuno').map((m) => dayKey(m.createdAt))).size;
  const hatedCooked = meals.some((m) => m.ingredients.some((id) => dislikes.includes(id)));
  const waterDays = [...water.values()].filter((g) => g >= waterGoal).length;
  const family = meals.some((m) => m.servings >= 4);
  // Colores distintos en la mejor semana
  const weekColors = new Map<string, Set<string>>();
  for (const m of meals) {
    const wk = mondayOf(dayKey(m.createdAt));
    const set = weekColors.get(wk) ?? new Set<string>();
    m.ingredients.forEach((id) => BY_ID[id] && BY_ID[id].cat !== 'despensa' && set.add(BY_ID[id].color));
    weekColors.set(wk, set);
  }
  const bestColors = Math.max(0, ...[...weekColors.values()].map((s) => s.size));
  const greenDays = new Set(meals.filter((m) => m.ingredients.some((id) => BY_ID[id]?.green)).map((m) => dayKey(m.createdAt))).size;
  void today;

  const a = (id: string, title: string, text: string, img: string, value: number, goal: number): Achievement => ({
    id, title, text, img, unlocked: value >= goal, progress: Math.min(1, goal ? value / goal : 0)
  });
  return [
    a('primer-plato', 'Primer puchero', 'Cocina tu primer plato.', 'plato', total, 1),
    a('racha-3', 'Tres seguidos', 'Racha de 3 días.', 'huevo', best, 3),
    a('racha-7', 'Una semana entera', 'Racha de 7 días.', 'pollo', best, 7),
    a('racha-30', 'Mes de cuchara', 'Racha de 30 días.', 'ternera', best, 30),
    a('platos-10', 'Diez platos', 'Cocina 10 platos.', 'pasta', total, 10),
    a('platos-50', 'Cocinillas de verdad', 'Cocina 50 platos.', 'arroz', total, 50),
    a('arcoiris', 'Arcoíris', '6 colores distintos en una misma semana.', 'pimiento', bestColors, 6),
    a('verde-5', 'Lo verde no muerde', 'Algo verde 5 días distintos.', 'brocoli', greenDays, 5),
    a('desayunos-5', 'Buenos días', 'Desayuna con PUCHERO 5 días.', 'avena', breakfastDays, 5),
    a('agua', 'Bien hidratado', `Llega a ${waterGoal} vasos de agua en un día.`, 'leche', waterDays, 1),
    a('agua-7', 'Camello no', `${waterGoal} vasos de agua 7 días.`, 'pepino', waterDays, 7),
    a('explorador', 'Explorador', 'Cocina con 25 alimentos distintos.', 'champinon', distinct.size, 25),
    a('valiente', 'Valiente', 'Cocina algo que dijiste que odiabas.', 'espinaca', hatedCooked ? 1 : 0, 1),
    a('chef-ia', 'Chef con IA', '10 recetas creadas por la IA.', 'tortitas', ia, 10),
    a('familia', 'Para todos', 'Cocina un plato para 4 o más personas.', 'lentejas', family ? 1 : 0, 1)
  ];
}
