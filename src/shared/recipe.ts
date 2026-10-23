import { amountsFor, BY_ID, type Ingredient } from './ingredients';
import type { Recipe } from './types';

const lower = (s: string) => s.toLowerCase();

export function joinEs(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

export function macros(ids: string[]) {
  const its = ids.map((id) => BY_ID[id]).filter((i) => i && i.cat !== 'despensa');
  return {
    kcal: its.reduce((s, i) => s + i.kcal, 0),
    protein: its.reduce((s, i) => s + i.protein, 0),
    minutes: Math.min(45, 8 + its.length * 4)
  };
}

const has = (ids: string[], id: string) => ids.includes(id);

/** Plato principal según la combinación: [nombre, ids que ya nombra, paso clave] */
function mainDish(ids: string[]): [string, string[], string] {
  const fruits = ids.filter((id) => BY_ID[id].cat === 'fruta');
  const drinksOnly = ids.every((id) => ['cafe', 'te', 'zumo', 'leche'].includes(id));
  if (drinksOnly) return ['Desayuno exprés', [], 'Prepara la bebida y acompáñala con algo sólido si puedes: fruta o una tostada.'];
  if (has(ids, 'gofre'))
    return ['Gofre', ['gofre'], 'Calienta el gofre en la tostadora o la sartén 2 min hasta que cruja.'];
  if (has(ids, 'bagel'))
    return ['Bagel relleno', ['bagel'], 'Abre el bagel, tuéstalo 3 min y rellénalo mientras está caliente.'];
  if (has(ids, 'croissant'))
    return ['Croissant', ['croissant'], 'Calienta el croissant 3 min en el horno para que vuelva a crujir.'];
  if (has(ids, 'tortitas'))
    return ['Tortitas', ['tortitas'], 'Haz las tortitas en sartén antiadherente 1 min por lado, a fuego medio.'];
  if (has(ids, 'avena'))
    return ['Porridge de avena', ['avena', 'leche'], 'Cuece la avena con leche (o agua) 4 min removiendo hasta que espese.'];
  if (has(ids, 'yogur'))
    return ['Bol de yogur', ['yogur'], 'Pon el yogur en un bol hondo y reparte lo demás por encima.'];
  if (has(ids, 'leche') && fruits.length)
    return ['Batido', ['leche'], 'Tritura la fruta con la leche 30 segundos y sírvelo bien frío.'];
  if (fruits.length >= 2 && ids.every((id) => ['fruta', 'cereal'].includes(BY_ID[id].cat)))
    return ['Macedonia', [], 'Corta la fruta en dados del mismo tamaño y mézclala con cuidado.'];
  if (has(ids, 'tortilla'))
    return ['Wrap', ['tortilla'], 'Calienta la tortilla 30 s por lado, rellena por el centro y enróllala apretando.'];
  if (has(ids, 'empanadillas'))
    return ['Empanadillas al horno', ['empanadillas'], 'Hornea las empanadillas a 200 °C 15 min hasta que estén doradas.'];
  if (has(ids, 'lentejas'))
    return ['Lentejas exprés', ['lentejas'], 'Rehoga el sofrito 5 min, añade las lentejas cocidas y deja 10 min a fuego suave.'];
  if (has(ids, 'falafel'))
    return ['Bol de falafel', ['falafel'], 'Dora el falafel en sartén 6 min dándole vueltas hasta que cruja.'];
  if (has(ids, 'patata') && has(ids, 'huevo'))
    return ['Tortilla de patata', ['patata', 'huevo'], 'Pocha la patata a fuego suave 12 min, escurre y cuaja con el huevo batido.'];
  if (has(ids, 'gambas') && has(ids, 'ajo'))
    return ['Gambas al ajillo', ['gambas', 'ajo'], 'Dora el ajo laminado en aceite y saltea las gambas 2 min.'];
  if (has(ids, 'pasta'))
    return ['Pasta salteada', ['pasta'], 'Cuece la pasta 9 min y guarda un chorro del agua de cocción.'];
  if (has(ids, 'arroz'))
    return ['Arroz salteado', ['arroz'], 'Saltea el arroz cocido a fuego fuerte 4 min hasta que se tueste un poco.'];
  if (has(ids, 'alubias'))
    return ['Guiso exprés de alubias', ['alubias'], 'Rehoga un sofrito rápido y añade las alubias con un vaso de agua 10 min.'];
  if (has(ids, 'salmon'))
    return ['Salmón a la plancha', ['salmon'], 'Marca el salmón 4 min por la piel y 2 min por el otro lado.'];
  if (has(ids, 'atun'))
    return ['Ensalada templada de atún', ['atun'], 'Escurre el atún y mézclalo con lo demás justo antes de servir.'];
  if (has(ids, 'calamar') || has(ids, 'cangrejo') || has(ids, 'ostras'))
    return ['Salteado marinero', [], 'Saltea el marisco a fuego muy fuerte 3 min, sin pasarte, que se endurece.'];
  if (has(ids, 'pescado'))
    return ['Pescado a la plancha', ['pescado'], 'Marca el pescado 3 min por lado con la piel hacia abajo primero.'];
  if (has(ids, 'cerdo'))
    return ['Cerdo al ajillo', ['cerdo'], 'Dora el cerdo en dados 8 min a fuego medio-alto.'];
  if (has(ids, 'ternera'))
    return ['Ternera salteada', ['ternera'], 'Corta la ternera en tiras finas y séllala a fuego muy fuerte 2 min.'];
  if (has(ids, 'pollo'))
    return ['Pollo dorado', ['pollo'], 'Dora el pollo en dados a fuego medio-alto 6 min.'];
  if (has(ids, 'huevo'))
    return ['Revuelto', ['huevo'], 'Bate los huevos y cuájalos a fuego bajo sin dejar de mover.'];
  if (has(ids, 'pan'))
    return ['Tosta', ['pan'], 'Tuesta el pan con un hilo de aceite hasta que cruja.'];
  if (has(ids, 'boniato'))
    return ['Boniato asado', ['boniato'], 'Asa el boniato en dados a 200 °C unos 25 min.'];
  if (has(ids, 'patata'))
    return ['Patatas al horno', ['patata'], 'Asa la patata en gajos a 200 °C unos 25 min.'];
  const raw = ids.filter((id) => ['tomate', 'pepino', 'aguacate', 'lechuga'].includes(id));
  if (raw.length >= 2) return ['Ensalada fresca', [], 'Corta todo en dados y aliña con aceite, sal y limón.'];
  return ['Salteado de verduras', [], 'Saltea las verduras a fuego fuerte, de la más dura a la más blanda.'];
}

export function camouflageTip(ids: string[], dislikes: string[]): string {
  const hated = ids.filter((id) => dislikes.includes(id)).map((id) => BY_ID[id]);
  const target: Ingredient | undefined = hated[0] ?? ids.map((id) => BY_ID[id]).find((i) => i?.green);
  if (!target)
    return ids.every((id) => ['fruta', 'cereal', 'lacteo', 'despensa'].includes(BY_ID[id]?.cat))
      ? 'Un puñado de algo crujiente por encima y entra solo, hasta con sueño.'
      : 'Sirve en bol hondo y termina con un chorrito de aceite crudo: entra todo mejor.';
  if (target.cat === 'fruta')
    return `${target.name}: tritúralo en batido o mézclalo con avena caliente. Solo queda el dulzor.`;
  if (target.cat === 'verdura')
    return `${target.name}: rállalo o tritúralo con la salsa. Aporta todo y ni lo vas a ver.`;
  return `${target.name}: córtalo muy pequeño y mézclalo con algo que te encante.`;
}

export function localRecipe(ids: string[], dislikes: string[] = [], servings = 1): Recipe {
  const clean = ids.filter((id) => BY_ID[id]);
  const [base, named, keyStep] = mainDish(clean);
  const rest = clean.filter((id) => !named.includes(id) && BY_ID[id].cat !== 'despensa').map((id) => lower(BY_ID[id].name));
  const shown = rest.slice(0, 3);
  let title = base;
  if (shown.length) title += rest.length > 3 ? ` con ${shown.join(', ')} y más` : ` con ${joinEs(shown)}`;
  const greens = clean.some((id) => BY_ID[id].green);
  const sweet = clean.every((id) => ['fruta', 'cereal', 'lacteo', 'despensa'].includes(BY_ID[id].cat));
  const hated = clean.some((id) => dislikes.includes(id));
  const { kcal, protein, minutes } = macros(clean);
  return {
    title,
    tagline: hated
      ? 'Lo que odias va camuflado. Palabra.'
      : sweet
        ? 'Dulce, rápido y sin culpa.'
        : greens
          ? 'Lo verde va de incógnito. Ni lo notarás.'
          : 'Rápido, rico y sin excusas.',
    tip: camouflageTip(clean, dislikes),
    steps: sweet
      ? [
          'Lava y corta la fruta en trozos de bocado.',
          keyStep,
          'Termina con lo crujiente o lo dulce por encima, en el último momento.',
          'Cómetelo al momento: así está en su punto.'
        ]
      : [
          'Corta todo pequeño: así nada protagoniza más de la cuenta.',
          keyStep,
          greens ? 'Añade lo verde al final, picado fino, solo 1 minuto.' : 'Incorpora el resto y deja que se mezclen los sabores 2 min.',
          'Prueba, ajusta de sal y emplata en bol hondo.'
        ],
    ingredients: clean,
    amounts: amountsFor(clean, servings),
    servings,
    kcal,
    protein,
    minutes,
    source: 'local'
  };
}
