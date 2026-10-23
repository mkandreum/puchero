import { amountFor, BY_ID, isAllergic, SHELVES, STARCHES } from '../shared/ingredients';
import { localRecipe } from '../shared/recipe';
import type { Plan, PlanItem, Profile, ShoppingItem, Slot } from '../shared/types';
import { addDays, mondayOf } from './days';

/** Generador con semilla: el mismo plan para la misma semana hasta que pidas otro. */
function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Lo que define cada desayuno o merienda: lo demás (fruta, toppings) lo acompaña. */
const ANCHORS: Partial<Record<Slot, string[]>> = {
  desayuno: ['avena', 'pan', 'tortitas', 'gofre', 'bagel', 'yogur', 'huevo', 'croissant'],
  merienda: ['yogur', 'frutos', 'pan', 'palomitas', 'queso', 'galletas', 'helado']
};
const TOPPINGS = ['frutos', 'miel', 'chocolate', 'mantequilla', 'queso', 'aguacate', 'tomate'];

/**
 * Menú de la semana para las comidas que el usuario quiere resolver: sin alergias ni manías,
 * variado (nada se repite más de dos veces en la semana) y, a igualdad, con lo que hay en casa.
 */
export function generatePlan(p: Profile, today: string, seed = Date.now()): Plan {
  const rand = rng(seed);
  const used = new Map<string, number>();
  const ok = (id: string) => BY_ID[id] && !isAllergic(id, p.allergies) && !p.dislikes.includes(id);
  /** El menos usado de la lista; entre empatados, mejor si está en la nevera; si no, al azar. */
  const choose = (ids: string[], exclude: string[] = []): string | undefined => {
    const list = ids.filter((id) => ok(id) && !exclude.includes(id));
    if (!list.length) return undefined;
    const min = Math.min(...list.map((id) => used.get(id) ?? 0));
    const least = list.filter((id) => (used.get(id) ?? 0) === min);
    const home = least.filter((id) => p.pantry.includes(id));
    const pool = home.length && rand() < 0.7 ? home : least;
    const id = pool[Math.floor(rand() * pool.length)];
    used.set(id, (used.get(id) ?? 0) + 1);
    return id;
  };
  const weekStart = mondayOf(today);
  const items: PlanItem[] = [];
  for (let d = 0; d < 7; d++) {
    const date = addDays(weekStart, d);
    for (const slot of p.slots) {
      const shelves = SHELVES[slot];
      const shelf = (id: string) => shelves.find((s) => s.id === id)?.ids ?? [];
      let ids: (string | undefined)[] = [];
      if (slot === 'comida' || slot === 'cena') {
        const veg = shelf('verdura');
        const protein = choose(shelf('proteina'));
        const light = slot === 'cena' && rand() < 0.5; // cena ligera: sin base
        const starch = light ? undefined : choose(shelf('base').filter((id) => STARCHES.includes(id)));
        const green = choose(veg.filter((id) => BY_ID[id].green));
        const other = choose(veg.filter((id) => !BY_ID[id].green && !['ajo', 'castanas'].includes(id)));
        ids = [starch, protein, green, other];
      } else {
        const anchor = choose(ANCHORS[slot] ?? shelves[0].ids);
        // Huevo, pan o bagel piden salado; lo demás, fruta
        const savory = anchor && ['huevo', 'pan', 'bagel'].includes(anchor);
        const fruits = savory ? ['tomate', 'aguacate', 'queso', 'salmon', 'bacon', 'huevo'] : shelf('fruta');
        const f1 = choose(fruits, anchor ? [anchor] : []);
        const f2 = rand() < 0.5 ? choose(fruits, [anchor ?? '', f1 ?? '']) : undefined;
        const top = rand() < 0.6 ? choose(TOPPINGS, [anchor ?? '']) : undefined;
        ids = [anchor, f1, f2, top];
      }
      const clean = [...new Set(ids.filter((x): x is string => !!x))];
      if (clean.length < 2) continue;
      items.push({ date, slot, title: localRecipe(clean, p.dislikes).title, ingredients: clean });
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
