// Comprobaciones del recetario: ids válidos, platos cocinables y combinaciones de ejemplo.
// Uso: npx tsx scripts/check-dishes.ts
import { comboFor, matchDish, substitutes, suggestDishes, surpriseCombo } from '../src/shared/chef';
import { DISHES } from '../src/shared/dishes';
import { BY_ID } from '../src/shared/ingredients';
import { localRecipe } from '../src/shared/recipe';
import { SLOTS, stepMinutes, type Slot } from '../src/shared/types';

let bad = 0;
const fail = (m: string) => { bad++; console.log('✗', m); };

const seen = new Set<string>();
for (const d of DISHES) {
  if (seen.has(d.id)) fail(`id repetido: ${d.id}`);
  seen.add(d.id);
  const all = [...d.core.flatMap((g) => g.of), ...d.extras];
  for (const id of all) if (!BY_ID[id]) fail(`${d.id}: ingrediente desconocido "${id}"`);
  if (!d.slots.length) fail(`${d.id}: sin comidas`);
  if (!d.steps.length) fail(`${d.id}: sin pasos`);
  d.core.forEach((g, i) => { if (g.of.length < (g.min ?? 1)) fail(`${d.id}: grupo ${i} no tiene ingredientes suficientes`); });
  const nameRefs = [...d.name.matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1]));
  for (const n of nameRefs) if (!d.core[n]) fail(`${d.id}: el nombre usa {${n}} pero no hay ese grupo`);
  for (const s of d.steps) if (s.includes('{x}') && !s.startsWith('?')) fail(`${d.id}: paso obligatorio con {x}: "${s}"`);
  const combo = comboFor(d);
  if (!combo) fail(`${d.id}: no se puede cocinar nunca`);
  else {
    const m = matchDish(combo, d.slots[0]);
    if (m.dish.id !== d.id && m.score < 0) fail(`${d.id}: su propia combinación acaba en "${m.dish.id}" con puntuación ${m.score}`);
  }
}
console.log(`${DISHES.length} platos revisados`);
for (const s of SLOTS) console.log(`  ${s}: ${DISHES.filter((d) => d.slots.includes(s)).length} platos`);

// Todas las comidas deben poder resolverse con lo básico
for (const slot of SLOTS) if (surpriseCombo(slot, { pantry: [], goal: 'verde' }).length < 2) fail(`sorpresa vacía en ${slot}`);

const show = (title: string, ids: string[], slot: Slot, servings = 2) => {
  const r = localRecipe(ids, [], servings, slot);
  console.log(`\n▶ ${title} [${slot}] → ${r.title}`);
  console.log(`  ${r.tagline} · ${r.minutes} min · ${r.kcal} kcal · ${r.protein} g`);
  r.steps.forEach((s, i) => console.log(`  ${i + 1}. ${s}${stepMinutes(s) ? '  ⏱' : ''}`));
  console.log(`  ingredientes: ${r.ingredients.map((id, i) => `${r.amounts[i]} ${id}`).join(', ')}`);
  return r;
};

const ex: [string, string[], Slot][] = [
  ['pollo + yogur + espinacas', ['pollo', 'yogur', 'espinaca'], 'comida'],
  ['avena + plátano + leche', ['avena', 'platano', 'leche'], 'desayuno'],
  ['arroz + gambas + guisantes', ['arroz', 'gambas', 'guisantes'], 'comida'],
  ['fresas + pescado (raro)', ['fresa', 'pescado'], 'cena'],
  ['huevo + pan + aguacate', ['huevo', 'pan', 'aguacate'], 'desayuno'],
  ['pasta + ternera + tomate', ['pasta', 'ternera', 'tomate'], 'cena'],
  ['solo ajo y limón', ['ajo', 'limon'], 'cena'],
  ['tortilla + pollo + lechuga', ['tortilla', 'pollo', 'lechuga'], 'cena'],
  ['yogur + atún', ['yogur', 'atun'], 'merienda']
];
for (const [t, ids, slot] of ex) show(t, ids, slot);

console.log('\n▶ Con lo que tengo (huevo, arroz, tomate, pan) — comida');
for (const s of suggestDishes(['huevo', 'arroz', 'tomate', 'pan'], 'comida', {}, 5))
  console.log(`  ${s.title}: tienes ${s.have.join(', ')}${s.missing.length ? ` · te falta ${s.missing.join(', ')}` : ' · ¡ya puedes!'}`);

// Alergias: ningún combo ni sugerencia debe llevar un alérgeno ni una manía
for (const slot of SLOTS) for (let i = 0; i < 40; i++) {
  const ids = surpriseCombo(slot, { pantry: ['pollo'], goal: 'rapido', allergies: ['gluten', 'lactosa', 'huevo'], dislikes: ['brocoli', 'pollo'] });
  for (const id of ids) {
    const a = BY_ID[id].allergens ?? [];
    if (a.some((x) => ['gluten', 'lactosa', 'huevo'].includes(x)) || id === 'brocoli' || id === 'pollo') fail(`combo ${slot} con "${id}" prohibido`);
  }
}
// Sustituciones: cada alternativa debe dar un plato válido y respetar alergias
let subs = 0;
for (const d of DISHES) {
  const ids = comboFor(d, { allergies: ['gluten'], dislikes: ['brocoli'] });
  if (!ids) continue;
  for (const id of ids) {
    const sub = substitutes(ids, id, d.slots[0], { allergies: ['gluten'], dislikes: ['brocoli'] });
    for (const alt of sub.alternatives) {
      subs++;
      if (ids.includes(alt)) fail(`${d.id}: ${id} → ${alt} ya está en el plato`);
      if ((BY_ID[alt].allergens ?? []).includes('gluten') || alt === 'brocoli') fail(`${d.id}: sustituto prohibido ${alt}`);
      const swapped = ids.map((x) => (x === id ? alt : x));
      const r = localRecipe(swapped, [], 1, d.slots[0]);
      if (!r.title || r.steps.length < 2) fail(`${d.id}: ${id} → ${alt} no da receta`);
    }
  }
}
console.log(`\n${subs} sustituciones comprobadas`);
const pollo = substitutes(['pollo', 'lechuga', 'queso'], 'pollo', 'comida', { pantry: ['ternera'] });
console.log('  pollo → ', pollo.alternatives.join(', '), pollo.removable ? '(se puede quitar)' : '(imprescindible)');
const queso = substitutes(['pollo', 'lechuga', 'queso'], 'queso', 'comida');
console.log('  queso → ', queso.alternatives.join(', ') || '—', queso.removable ? '(se puede quitar)' : '(imprescindible)');
console.log(bad ? `\n${bad} problemas` : '\nTodo en orden ✓');
process.exit(bad ? 1 : 0);
