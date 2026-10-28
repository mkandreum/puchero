import { comboFor, goalBonus } from '../shared/chef';
import { DISHES, type Dish } from '../shared/dishes';
import { amountFor, BY_ID } from '../shared/ingredients';
import { localRecipe } from '../shared/recipe';
import type { Plan, PlanItem, Profile, ShoppingItem } from '../shared/types';
import { addDays, mondayOf } from './days';

/** Generador con semilla: el mismo plan para la misma semana hasta que pidas otro. */
function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/**
 * Menú de la semana: cada hueco es un plato real del recetario (`shared/dishes.ts`), sin alergias
 * ni manías, que no se repite, que usa lo que hay en la nevera cuando se puede y que sigue tu
 * objetivo (más verde, más proteína o rapidísimo). Entre dos platos buenos decide el azar.
 */
export function generatePlan(p: Profile, today: string, seed = Date.now()): Plan {
  const rand = rng(seed);
  const weekStart = mondayOf(today);
  const filter = { allergies: p.allergies, dislikes: p.dislikes };
  const usedDish = new Map<string, number>();
  const usedFood = new Map<string, number>();
  const items: PlanItem[] = [];
  for (let d = 0; d < 7; d++) {
    const date = addDays(weekStart, d);
    for (const slot of p.slots) {
      let best: { dish: Dish; ids: string[]; score: number } | null = null;
      for (const dish of DISHES) {
        if (!dish.slots.includes(slot)) continue;
        const ids = comboFor(dish, { ...filter, pantry: p.pantry, rand });
        if (!ids || ids.length < 2) continue;
        // Variedad: castiga repetir plato y repetir los mismos ingredientes principales
        const repeats = ids.reduce((n, id) => n + (usedFood.get(id) ?? 0), 0);
        const score =
          rand() * 6 +
          goalBonus(dish, ids, p.goal) +
          ids.filter((id) => p.pantry.includes(id)).length * 2 -
          (usedDish.get(dish.id) ?? 0) * 60 -
          repeats * 2;
        if (!best || score > best.score) best = { dish, ids, score };
      }
      if (!best) continue;
      usedDish.set(best.dish.id, (usedDish.get(best.dish.id) ?? 0) + 1);
      best.ids.forEach((id) => usedFood.set(id, (usedFood.get(id) ?? 0) + 1));
      items.push({ date, slot, title: localRecipe(best.ids, p.dislikes, 1, slot).title, ingredients: best.ids });
    }
  }
  return { weekStart, items };
}

/**
 * Lista de la compra a partir de lo que queda del plan: suma raciones de cada alimento,
 * quita lo que ya hay en la nevera y conserva lo que ya estaba tachado o añadido a mano.
 */
export function shoppingFromPlan(plan: Plan, p: Profile, today: string, current: ShoppingItem[]): ShoppingItem[] {
  const portions = new Map<string, number>();
  for (const it of plan.items) {
    if (it.date < today) continue;
    for (const id of it.ingredients) {
      if (!BY_ID[id] || p.pantry.includes(id)) continue;
      portions.set(id, (portions.get(id) ?? 0) + p.servings);
    }
  }
  const done = new Set(current.filter((i) => i.done).map((i) => i.id));
  const manual = current.filter((i) => i.label);
  const fromPlan: ShoppingItem[] = [...portions.entries()]
    .sort((a, b) => BY_ID[a[0]].cat.localeCompare(BY_ID[b[0]].cat))
    .map(([id, n]) => ({ id, amount: amountFor(id, n), done: done.has(id) }));
  return [...fromPlan, ...manual];
}

/** Valida una lista que llega del cliente. */
export function cleanShopping(v: unknown): ShoppingItem[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 200).flatMap((raw): ShoppingItem[] => {
    const o = raw as Record<string, unknown>;
    const done = o?.done === true;
    if (typeof o?.id === 'string' && BY_ID[o.id])
      return [{ id: o.id, amount: typeof o.amount === 'string' ? o.amount.slice(0, 30) : undefined, done }];
    if (typeof o?.label === 'string' && o.label.trim()) {
      const id = typeof o.id === 'string' && o.id.startsWith('x-') ? o.id.slice(0, 40) : `x-${Math.random().toString(36).slice(2, 10)}`;
      return [{ id, label: o.label.trim().slice(0, 60), done }];
    }
    return [];
  });
}

export function readPlan(v: unknown): Plan | null {
  const o = v as Plan | null;
  return o && typeof o.weekStart === 'string' && Array.isArray(o.items) ? o : null;
}
