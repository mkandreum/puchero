import { DISHES_BY_ID } from './dishes';
import { joinEs, matchDish, nameOf, resolveName, type Match } from './chef';
import { amountsFor, BY_ID, type Ingredient } from './ingredients';
import type { Recipe, Slot } from './types';
import { slotForHour } from './types';

export { joinEs };

const lower = (s: string) => s.toLowerCase();

/** kcal y proteína por persona (la despensa, la sal y las bebidas sin calorías no cuentan como plato). */
export function macros(ids: string[], minutes?: number) {
  const its = ids.map((id) => BY_ID[id]).filter((i) => i && i.cat !== 'despensa');
  return {
    kcal: its.reduce((s, i) => s + i.kcal, 0),
    protein: its.reduce((s, i) => s + i.protein, 0),
    minutes: minutes ?? Math.min(45, 8 + its.length * 4)
  };
}

export function camouflageTip(ids: string[], dislikes: string[]): string | null {
  const hated = ids.filter((id) => dislikes.includes(id)).map((id) => BY_ID[id]);
  const target: Ingredient | undefined = hated[0];
  if (!target) return null;
  if (target.cat === 'fruta') return `${target.name}: tritúralo en batido o mézclalo con avena caliente. Solo queda el dulzor.`;
  if (target.cat === 'verdura') return `${target.name}: rállalo o tritúralo con la salsa. Aporta todo y ni lo vas a ver.`;
  return `${target.name}: córtalo muy pequeño y mézclalo con algo que te encante.`;
}

function tagline(m: Match, hated: boolean): string {
  const t = m.dish.tags;
  if (hated) return 'Lo que odias va camuflado. Palabra.';
  if (m.leftover.length) return 'Lo que no pega va aparte: cada cosa en su sitio.';
  if (t.includes('dulce')) return 'Dulce, rápido y sin culpa.';
  if (m.core.concat(m.extras).some((id) => BY_ID[id]?.green)) return 'Lo verde va de incógnito. Ni lo notarás.';
  if (t.includes('cuchara')) return 'De cuchara, de los que reconfortan.';
  if (t.includes('rapido')) return 'Rápido, rico y sin excusas.';
  if (t.includes('proteico')) return 'Con proteína de verdad.';
  return 'Rico y sin drama.';
}

function genericTip(m: Match): string {
  if (m.dish.tip) return m.dish.tip;
  if (m.dish.tags.includes('dulce')) return 'Un puñado de algo crujiente por encima y entra solo, hasta con sueño.';
  if (m.dish.tags.includes('frio')) return 'Sírvelo bien frío: sabe más fresco y se aguanta en la nevera.';
  return 'Sirve en bol hondo y termina con un chorrito de aceite crudo: entra todo mejor.';
}

/** Receta completa a partir del plato elegido por el motor. */
export function recipeFromMatch(m: Match, dislikes: string[] = [], servings = 1): Recipe {
  const x = m.extras.map((id) => lower(nameOf(id)));
  const steps = m.dish.steps
    .filter((s) => !(s.startsWith('?') && x.length === 0))
    .map((s) => s.replace(/^\?/, '').replace('{x}', x.length ? joinEs(x) : 'lo que tengas a mano'));
  if (m.leftover.length)
    steps.push(`Aparte, para acompañar: ${joinEs(m.leftover.map((id) => lower(nameOf(id))))}. No pega dentro del mismo plato, mejor cada cosa por separado.`);
  const spices = m.free.filter((id) => BY_ID[id]?.cat === 'despensa' && !m.core.includes(id));
  const drinks = m.free.filter((id) => !spices.includes(id));
  if (spices.length) steps.push(`Sazona con ${joinEs(spices.map((id) => lower(nameOf(id))))}.`);
  if (drinks.length) steps.push(`Para beber: ${joinEs(drinks.map((id) => lower(nameOf(id))))}.`);

  const ingredients = [...new Set([...m.core, ...m.extras, ...m.leftover, ...m.free])];
  const { kcal, protein } = macros(ingredients);
  const hated = ingredients.some((id) => dislikes.includes(id));
  return {
    title: resolveName(m),
    tagline: tagline(m, hated),
    tip: camouflageTip(ingredients, dislikes) ?? genericTip(m),
    steps,
    ingredients,
    amounts: amountsFor(ingredients, servings),
    servings,
    kcal,
    protein,
    minutes: m.dish.minutes,
    source: 'local'
  };
}

/** Receta de la casa (sin IA ni conexión): el plato que mejor encaja con lo que hay en la cazuela. */
export function localRecipe(ids: string[], dislikes: string[] = [], servings = 1, slot: Slot = slotForHour(new Date().getHours())): Recipe {
  return recipeFromMatch(matchDish(ids, slot), dislikes, servings);
}

export { DISHES_BY_ID };
