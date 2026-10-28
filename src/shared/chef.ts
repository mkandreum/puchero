import { DISHES, DISHES_BY_ID, type Dish, type Group } from './dishes';
import { amountsFor, BY_ID, isAllergic, MAX_IN_POT } from './ingredients';
import type { Goal, Slot } from './types';

// El "chef": dado lo que hay en la cazuela, decide qué plato es de verdad, qué va aparte
// porque no pega, y qué se puede cocinar con lo que hay en la nevera.

const DRINKS = ['cafe', 'te', 'zumo'];
/** Sal, especias, jengibre…: dan sabor a cualquier plato y nunca "sobran". */
const isFree = (id: string) => BY_ID[id]?.cat === 'despensa' || DRINKS.includes(id);

export const nameOf = (id: string) => BY_ID[id]?.name ?? id;
const lower = (s: string) => s.toLowerCase();

export function joinEs(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

export interface Match {
  dish: Dish;
  /** Lo elegido en cada grupo del núcleo */
  chosen: string[][];
  core: string[];
  /** Ingredientes que le quedan bien al plato y se han usado */
  extras: string[];
  /** Lo que está en la cazuela pero no pega con este plato: va aparte */
  leftover: string[];
  /** Sal, especias, bebidas: acompañan sin molestar */
  free: string[];
  offSlot: boolean;
  score: number;
}

function matchGroup(g: Group, have: Set<string>): string[] | null {
  const hit = g.of.filter((id) => have.has(id));
  return hit.length >= (g.min ?? 1) ? hit : null;
}

function matchOne(dish: Dish, ids: string[], have: Set<string>, slot?: Slot): Match | null {
  const chosen: string[][] = [];
  for (const g of dish.core) {
    const m = matchGroup(g, have);
    if (!m) return null;
    chosen.push(m);
  }
  const core = [...new Set(chosen.flat())];
  const extras = ids.filter((id) => !core.includes(id) && dish.extras.includes(id) && !isFree(id));
  const free = ids.filter((id) => !core.includes(id) && isFree(id));
  const leftover = ids.filter((id) => !core.includes(id) && !extras.includes(id) && !isFree(id));
  const offSlot = !!slot && !dish.slots.includes(slot);
  const score = dish.core.length * 8 + core.length * 3 + extras.length * 2 - leftover.length * 5 - (offSlot ? 40 : 0) + (dish.bonus ?? 0);
  return { dish, chosen, core, extras, leftover, free, offSlot, score };
}

/** Plato genérico para combinaciones que no encajan en ninguna receta. */
function generic(ids: string[]): Match {
  const cats = (c: string) => ids.filter((id) => BY_ID[id]?.cat === c);
  const sweet = ids.length > 0 && ids.every((id) => ['fruta', 'cereal', 'lacteo', 'despensa'].includes(BY_ID[id]?.cat));
  const main = ids.filter((id) => !isFree(id));
  const dish: Dish = {
    id: 'generico',
    name: sweet ? 'Bol de fruta y más' : 'Salteado de lo que hay',
    slots: ['desayuno', 'comida', 'merienda', 'cena'],
    core: [],
    extras: main,
    minutes: sweet ? 5 : 15,
    tags: sweet ? ['dulce', 'rapido'] : cats('proteina').length ? ['proteico'] : [],
    steps: sweet
      ? ['Corta todo en trozos de bocado.', 'Mézclalo en un bol.', '?Termina con {x}.']
      : [
          'Corta todo pequeño y reparte lo duro en trozos más finos.',
          'Saltea primero lo más duro y la proteína 5 min a fuego fuerte.',
          '?Añade {x} y saltea 4 min más.',
          'Prueba y ajusta de sal.'
        ]
  };
  return { dish, chosen: [], core: [], extras: main, leftover: [], free: ids.filter(isFree), offSlot: false, score: 0 };
}

/** El plato que mejor encaja con lo que hay en la cazuela. */
export function matchDish(rawIds: string[], slot?: Slot): Match {
  const ids = [...new Set(rawIds.filter((id) => BY_ID[id]))];
  const have = new Set(ids);
  let best: Match | null = null;
  for (const dish of DISHES) {
    const m = matchOne(dish, ids, have, slot);
    if (m && (!best || m.score > best.score)) best = m;
  }
  return best ?? generic(ids);
}

export interface Suggestion {
  dish: Dish;
  /** Nombre con los ingredientes concretos ("Sándwich de queso") */
  title: string;
  /** Todo lo que lleva el plato (lo que tienes + lo que falta) */
  ids: string[];
  have: string[];
  missing: string[];
}

interface Filter {
  allergies?: string[];
  dislikes?: string[];
}
const allowedBy = (f: Filter) => (id: string) => !isAllergic(id, f.allergies ?? []) && !(f.dislikes ?? []).includes(id);

export interface Readiness {
  /** Lo que ya tienes y usa el plato */
  have: string[];
  /** Lo que te falta (una opción por grupo) */
  missing: string[];
  /** Falso si por alergias o manías el plato no se puede hacer */
  possible: boolean;
}

/** Qué tienes y qué te falta para un plato, sin contar alergias ni manías. */
export function readiness(dish: Dish, pantry: string[], f: Filter = {}): Readiness {
  const ok = allowedBy(f);
  const have = new Set(pantry.filter((id) => BY_ID[id] && ok(id)));
  const used: string[] = [];
  const missing: string[] = [];
  for (const g of dish.core) {
    const hit = g.of.filter((id) => have.has(id));
    const need = (g.min ?? 1) - hit.length;
    if (need > 0) {
      const cand = g.of.filter((id) => ok(id) && !have.has(id));
      if (cand.length < need) return { have: used, missing, possible: false };
      missing.push(...cand.slice(0, need));
    }
    used.push(...hit.slice(0, Math.max(g.min ?? 1, 1)));
  }
  return { have: used, missing, possible: true };
}

/** Platos que se pueden hacer con lo que tienes (o a los que les falta poco). */
export function suggestDishes(pantry: string[], slot: Slot, f: Filter = {}, limit = 6, maxMissing = 2): Suggestion[] {
  const ok = allowedBy(f);
  const have = new Set(pantry.filter((id) => BY_ID[id] && ok(id)));
  const out: (Suggestion & { rank: number })[] = [];
  for (const dish of DISHES) {
    if (!dish.slots.includes(slot)) continue;
    const r = readiness(dish, pantry, f);
    if (!r.possible || r.missing.length > maxMissing || r.have.length === 0) continue;
    const extras = dish.extras.filter((id) => have.has(id) && !r.have.includes(id) && !isFree(id)).slice(0, 2);
    const haveIds = [...new Set([...r.have, ...extras])];
    const ids = [...new Set([...r.have, ...r.missing, ...extras])].slice(0, MAX_IN_POT);
    const m = matchOne(dish, ids, new Set(ids), slot);
    out.push({
      dish,
      title: m ? resolveName(m) : dish.name,
      have: haveIds,
      missing: r.missing,
      ids,
      rank: r.missing.length * 100 - haveIds.length * 10 + dish.minutes / 10
    });
  }
  return out.sort((a, b) => a.rank - b.rank).slice(0, limit).map(({ rank: _r, ...x }) => x);
}

export interface ComboOptions extends Filter {
  pantry?: string[];
  rand?: () => number;
  /** Cuántos extras añadir (por defecto 1–2) */
  extras?: number;
}

/** Ingredientes concretos para cocinar un plato (respeta alergias y manías, prefiere lo que hay en casa). */
export function comboFor(dish: Dish, o: ComboOptions = {}): string[] | null {
  const ok = allowedBy(o);
  const rand = o.rand ?? Math.random;
  const pantry = new Set(o.pantry ?? []);
  const pickFrom = (list: string[], n: number) => {
    const pool = list.filter(ok);
    const home = pool.filter((id) => pantry.has(id));
    const rest = pool.filter((id) => !pantry.has(id));
    const shuffle = <T,>(a: T[]) => [...a].sort(() => rand() - 0.5);
    const order = rand() < 0.75 ? [...shuffle(home), ...shuffle(rest)] : shuffle(pool);
    return order.slice(0, n);
  };
  const ids: string[] = [];
  for (const g of dish.core) {
    const got = pickFrom(g.of, g.min ?? 1);
    if (got.length < (g.min ?? 1)) return null;
    ids.push(...got);
  }
  const n = o.extras ?? (rand() < 0.5 ? 1 : 2);
  const extras = pickFrom(dish.extras.filter((id) => !ids.includes(id) && !isFree(id)), n);
  return [...new Set([...ids, ...extras])].slice(0, MAX_IN_POT);
}

export function dishesForSlot(slot: Slot, f: Filter = {}): Dish[] {
  return DISHES.filter((d) => d.slots.includes(slot) && comboFor(d, { ...f, extras: 0 }));
}

export interface SurpriseProfile extends Filter {
  pantry: string[];
  goal: Goal;
}

/** Puntúa un plato según el objetivo de la persona (verde, proteína o rápido). */
export function goalBonus(dish: Dish, ids: string[], goal: Goal): number {
  if (goal === 'rapido') return dish.minutes <= 15 ? 6 : dish.minutes <= 25 ? 2 : -4;
  if (goal === 'proteina') return dish.tags.includes('proteico') ? 6 : 0;
  return ids.some((id) => BY_ID[id]?.green) || ids.filter((id) => BY_ID[id]?.cat === 'verdura').length >= 2 ? 6 : 0;
}

/** "Sorpréndeme": un plato real al azar para esa comida, con sus ingredientes. */
export function surpriseCombo(slot: Slot, p: SurpriseProfile, rand: () => number = Math.random): string[] {
  const options = DISHES.filter((d) => d.slots.includes(slot))
    .map((dish) => ({ dish, ids: comboFor(dish, { ...p, rand }) }))
    .filter((x): x is { dish: Dish; ids: string[] } => !!x.ids)
    .map((x) => ({
      ...x,
      score: rand() * 8 + goalBonus(x.dish, x.ids, p.goal) + x.ids.filter((id) => p.pantry.includes(id)).length * 2
    }))
    .sort((a, b) => b.score - a.score);
  return options[0]?.ids ?? [];
}

export { DISHES, DISHES_BY_ID, amountsFor };
export const dishById = (id: string) => DISHES_BY_ID[id];
export const resolveName = (m: Match): string => {
  let name = m.dish.name.replace(/\{(\d+)\}/g, (_, i) => lower(nameOf(m.chosen[Number(i)]?.[0] ?? '')));
  // Lo que aún no sale en el nombre y se ha usado
  const mention = [
    ...m.chosen.flatMap((c, gi) => (m.dish.core[gi].min && m.dish.core[gi].min! > 1 ? [] : c.slice(1))),
    ...m.extras
  ].filter((id) => !lower(name).includes(lower(nameOf(id)).split(' ')[0]));
  if (mention.length) {
    const shown = mention.slice(0, 3).map((id) => lower(nameOf(id)));
    const tail = mention.length > 3 ? `${shown.join(', ')} y más` : joinEs(shown);
    // Si el nombre ya lleva un "con", se sigue la lista en vez de abrir otro
    name += / con /.test(name) ? (shown.length === 1 && mention.length === 1 ? ` y ${tail}` : `, ${tail}`) : ` con ${tail}`;
  }
  return name;
};

/** Nombre corto para listas: "Wrap de {1}" → "Wrap". */
export const dishLabel = (d: Dish) => d.name.replace(/ (de|con) \{\d+\}/g, '').replace(/\{\d+\}/g, '').trim();

/** Una opción de cada grupo para enseñar el plato en una lista. */
export const dishPreview = (d: Dish): string[] => d.core.flatMap((g) => g.of.slice(0, g.min ?? 1)).slice(0, 4);
