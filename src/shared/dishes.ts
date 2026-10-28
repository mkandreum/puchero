import type { Slot } from './types';

// Recetario de PUCHERO: platos reales, no combinaciones al azar.
// Cada plato dice qué necesita (grupos de alternativas), qué le queda bien y cómo se hace.
// Si cambias este fichero, regenera el de la app: ../pucheroapp/scripts/gen-catalog.ts

export type Tag = 'dulce' | 'salado' | 'rapido' | 'ligero' | 'cuchara' | 'frio' | 'proteico' | 'vegetariano';

/** Hace falta al menos `min` ingredientes de `of` (uno por defecto). */
export interface Group {
  of: string[];
  min?: number;
}

export interface Dish {
  id: string;
  /** Admite {0}, {1}… = el ingrediente elegido en cada grupo del núcleo (en minúsculas) */
  name: string;
  slots: Slot[];
  core: Group[];
  /** Lo que le queda bien además del núcleo */
  extras: string[];
  minutes: number;
  tags: Tag[];
  /** Admite {x} = los extras usados. Un paso que empieza por "?" se omite si no hay extras. */
  steps: string[];
  tip?: string;
  /** Prioridad extra cuando varios platos encajan (el plato "de toda la vida" gana) */
  bonus?: number;
}

export const FRUIT = ['platano', 'manzana', 'manzana_verde', 'pera', 'fresa', 'cerezas', 'arandanos', 'uvas', 'kiwi', 'naranja', 'melocoton', 'mango', 'pina', 'sandia', 'melon', 'coco'];
export const VEG = ['brocoli', 'espinaca', 'lechuga', 'guisantes', 'tomate', 'zanahoria', 'pimiento', 'berenjena', 'pepino', 'cebolla', 'champinon', 'maiz', 'aguacate', 'boniato'];
const FRESH = ['lechuga', 'tomate', 'pepino', 'zanahoria', 'pimiento', 'maiz', 'aguacate', 'cebolla'];
const COOKED_VEG = ['brocoli', 'espinaca', 'guisantes', 'zanahoria', 'pimiento', 'berenjena', 'cebolla', 'champinon', 'maiz', 'boniato', 'tomate'];
const BREAD = ['pan', 'baguette', 'bagel'];
const LOAF = ['pan', 'baguette'];
const MEATS = ['pollo', 'ternera', 'cerdo', 'bacon'];
const FISH = ['pescado', 'salmon', 'atun'];
const SEAFOOD = ['gambas', 'calamar', 'cangrejo', 'ostras'];
const LEGUMES = ['alubias', 'lentejas'];
const SWEET_TOP = ['miel', 'chocolate', 'frutos', 'galletas', 'coco', 'mantequilla'];

const SLOT_OF: Record<string, Slot> = { d: 'desayuno', c: 'comida', m: 'merienda', n: 'cena' };
const g = (...of: string[]): Group => ({ of });
const gm = (min: number, ...of: string[]): Group => ({ of, min });

const d = (
  id: string,
  name: string,
  slots: string,
  core: Group[],
  extras: string[],
  minutes: number,
  steps: string[],
  tags: Tag[] = [],
  tip?: string
): Dish => ({ id, name, slots: [...slots].map((s) => SLOT_OF[s]), core, extras, minutes, steps, tags, tip });

export const DISHES: Dish[] = [
  // ── Desayunos y meriendas dulces ─────────────────────────
  d('porridge', 'Porridge de avena', 'dm', [g('avena')], ['leche', 'yogur', ...FRUIT, 'frutos', 'miel', 'chocolate'], 8, [
    'Pon la avena con el doble de leche (o agua) en un cazo a fuego medio.',
    'Remueve 4 min hasta que espese y quede cremoso.',
    'Sírvelo en un bol hondo, caliente.',
    '?Corta o reparte por encima {x}.'
  ], ['dulce', 'rapido', 'ligero', 'vegetariano']),
  d('overnight', 'Avena fría con yogur', 'dm', [g('avena'), g('yogur')], [...FRUIT, 'frutos', 'miel', 'chocolate', 'leche', 'coco'], 5, [
    'Mezcla la avena con el yogur en un bol o un bote.',
    'Déjalo 10 min en la nevera para que la avena se ablande (mejor de un día para otro).',
    '?Termina con {x} por encima.'
  ], ['dulce', 'rapido', 'frio', 'vegetariano'], 'Si lo dejas de un día para otro, tienes el desayuno hecho antes de levantarte.'),
  d('yogur-bowl', 'Bol de yogur', 'dm', [g('yogur')], [...FRUIT, 'avena', 'frutos', 'miel', 'chocolate', 'coco', 'galletas'], 3, [
    'Pon el yogur en un bol hondo.',
    '?Reparte por encima {x}.',
    'Cómetelo al momento para que lo crujiente siga crujiendo.'
  ], ['dulce', 'rapido', 'frio', 'ligero', 'vegetariano']),
  d('batido', 'Batido', 'dm', [g('leche', 'yogur'), gm(1, ...FRUIT)], ['frutos', 'miel', 'chocolate', 'coco', 'espinaca'], 4, [
    'Trocea la fruta y ponla en el vaso de la batidora con la leche o el yogur.',
    '?Añade {x}.',
    'Tritura 30 segundos hasta que no queden trozos y sírvelo bien frío.'
  ], ['dulce', 'rapido', 'frio', 'vegetariano']),
  d('batido-verde', 'Batido verde', 'dm', [g('leche', 'yogur', 'zumo'), g('espinaca', 'kiwi', 'pepino', 'manzana_verde', 'aguacate')], ['platano', 'pina', 'mango', 'pera', 'melon', 'avena', 'miel', 'limon', 'jengibre'], 4, [
    'Pon lo verde, la fruta y el líquido en la batidora.',
    '?Añade {x}.',
    'Tritura 40 segundos hasta que quede liso y sírvelo enseguida.'
  ], ['dulce', 'rapido', 'frio', 'ligero', 'vegetariano'], 'El plátano o la piña esconden el sabor a verde: ni se nota.'),
  d('macedonia', 'Macedonia', 'dm', [gm(2, ...FRUIT)], ['yogur', 'miel', 'frutos', 'zumo', 'chocolate', 'coco', 'limon'], 6, [
    'Lava la fruta y córtala en dados del mismo tamaño.',
    'Mézclala con cuidado en un bol.',
    '?Termina con {x}.',
    'Déjala 5 min en la nevera para que suelte su jugo.'
  ], ['dulce', 'frio', 'ligero', 'vegetariano']),
  d('tortitas', 'Tortitas', 'dm', [g('tortitas')], [...FRUIT, 'miel', 'chocolate', 'frutos', 'yogur', 'mantequilla'], 8, [
    'Calienta una sartén antiadherente a fuego medio.',
    'Haz las tortitas 1 min por lado, hasta que se doren.',
    '?Sírvelas con {x}.'
  ], ['dulce', 'rapido', 'vegetariano']),
  d('gofre', 'Gofre', 'dm', [g('gofre')], [...FRUIT, 'miel', 'chocolate', 'frutos', 'yogur', 'mantequilla', 'helado'], 5, [
    'Calienta el gofre en la tostadora o en la sartén 2 min hasta que cruja.',
    '?Cúbrelo con {x}.'
  ], ['dulce', 'rapido', 'vegetariano']),
  d('tostada-dulce', 'Tostada dulce', 'dm', [g(...LOAF), g('miel', 'chocolate')], ['mantequilla', 'platano', 'fresa', 'frutos', 'arandanos', 'coco'], 5, [
    'Tuesta el pan 2 min.',
    'Úntalo con la mantequilla si la hay, y con lo dulce por encima.',
    '?Corta {x} en rodajas y colócalo encima.'
  ], ['dulce', 'rapido', 'vegetariano']),
  d('tostada-francesa', 'Tostada francesa', 'dm', [g(...LOAF), g('huevo'), g('leche')], ['miel', 'fresa', 'platano', 'chocolate', 'frutos', 'mantequilla', 'arandanos'], 12, [
    'Bate el huevo con la leche en un plato hondo.',
    'Pasa el pan por la mezcla 20 segundos por cada lado.',
    'Dóralo en la sartén con un poco de mantequilla 2 min por lado.',
    '?Sírvelo con {x}.'
  ], ['dulce', 'vegetariano']),
  d('croissant', 'Croissant', 'dm', [g('croissant')], ['queso', 'mantequilla', 'miel', 'chocolate', ...FRUIT, 'yogur', 'huevo', 'bacon', 'cafe', 'leche'], 5, [
    'Calienta el croissant 3 min en el horno o la tostadora para que vuelva a crujir.',
    '?Acompáñalo con {x}.'
  ], ['rapido']),
  d('desayuno-clasico', 'Desayuno de siempre', 'dm', [g('cafe', 'te', 'zumo', 'leche')], ['pan', 'baguette', 'croissant', 'galletas', 'mantequilla', 'miel', 'tomate', 'aguacate', 'huevo', 'yogur', 'avena', ...FRUIT, 'frutos'], 6, [
    'Prepara la bebida.',
    '?Acompáñala con {x}.',
    'Mejor sentado: se desayuna mejor con calma.'
  ], ['rapido']),
  d('palomitas', 'Palomitas', 'm', [g('palomitas')], ['chocolate', 'miel', 'frutos', 'coco', 'sal'], 4, [
    'Pon las palomitas en un bol grande.',
    '?Mézclalas con {x}.',
    'Cómetelas con calma, que son más de lo que parecen.'
  ], ['dulce', 'rapido', 'vegetariano']),
  d('picoteo', 'Picoteo de frutos secos', 'm', [g('frutos')], [...FRUIT, 'chocolate', 'palomitas', 'galletas', 'miel', 'yogur', 'queso'], 2, [
    'Pon un puñado de frutos secos en un cuenco (unos 30 g).',
    '?Combínalos con {x}.'
  ], ['rapido', 'proteico', 'vegetariano']),
  d('helado', 'Copa de helado', 'm', [g('helado')], [...FRUIT, 'chocolate', 'frutos', 'galletas', 'miel', 'coco'], 3, [
    'Pon el helado en una copa o un bol.',
    '?Decóralo con {x}.',
    'Sírvelo enseguida.'
  ], ['dulce', 'rapido', 'frio', 'vegetariano']),
  d('manzana-asada', 'Fruta asada', 'mn', [g('manzana', 'manzana_verde', 'pera', 'platano', 'melocoton')], ['miel', 'frutos', 'avena', 'galletas', 'yogur', 'coco', 'chocolate'], 20, [
    'Calienta el horno a 180 °C.',
    'Parte la fruta por la mitad y quítale el corazón o el hueso.',
    'Ásala 15 min, hasta que esté blanda.',
    '?Rellénala con {x} y sírvela templada.'
  ], ['dulce', 'ligero', 'vegetariano']),
  d('tabla-queso', 'Tabla de queso y fruta', 'mn', [g('queso'), gm(1, 'manzana', 'pera', 'uvas', 'melon', 'kiwi', 'naranja', 'mango', 'melocoton', 'cerezas', 'fresa', 'manzana_verde')], ['frutos', 'miel', 'pan', 'baguette', 'aceitunas', 'galletas'], 5, [
    'Corta el queso en cuñas y la fruta en gajos.',
    'Colócalo todo en una tabla o un plato grande.',
    '?Añade {x}.'
  ], ['rapido', 'vegetariano']),
  d('crudites', 'Crudités', 'mn', [g('zanahoria', 'pepino', 'pimiento')], ['yogur', 'aguacate', 'queso', 'aceitunas', 'tomate', 'limon', 'sal'], 6, [
    'Corta las verduras en bastones del mismo grosor.',
    '?Mezcla {x} para mojar.',
    'Sírvelas frías, mejor con algo cremoso para mojar.'
  ], ['rapido', 'frio', 'ligero', 'vegetariano']),
  d('castanas', 'Castañas asadas', 'm', [g('castanas')], ['frutos', 'miel', 'manzana', 'queso', 'pera', 'chocolate'], 25, [
    'Haz un corte en cada castaña para que no revienten.',
    'Ásalas 20 min a 200 °C.',
    'Pélalas todavía calientes.',
    '?Sírvelas con {x}.'
  ], ['ligero', 'vegetariano']),

  // ── Desayunos y meriendas saladas ────────────────────────
  d('tostada-aguacate', 'Tostada de aguacate', 'dmn', [g(...BREAD), g('aguacate')], ['huevo', 'tomate', 'salmon', 'limon', 'sal', 'queso', 'guindilla', 'pepino', 'atun'], 8, [
    'Tuesta el pan 2 min.',
    'Machaca el aguacate con un tenedor y un poco de sal y limón.',
    'Úntalo sobre el pan.',
    '?Termina con {x}.'
  ], ['rapido', 'vegetariano']),
  d('pan-tomate', 'Pan con tomate', 'dmn', [g(...LOAF), g('tomate')], ['ajo', 'aceitunas', 'queso', 'bacon', 'atun', 'aguacate', 'sal'], 5, [
    'Tuesta el pan 2 min.',
    'Ralla el tomate y sazónalo con sal.',
    'Úntalo sobre el pan caliente.',
    '?Termina con {x}.'
  ], ['rapido', 'vegetariano']),
  d('tosta-queso', 'Tosta de queso', 'dmn', [g(...LOAF), g('queso')], ['tomate', 'aceitunas', 'bacon', 'aguacate', 'atun', 'cebolla', 'pimiento', 'champinon'], 7, [
    'Pon el queso sobre el pan.',
    'Gratina 3 min en el horno o la tostadora hasta que burbujee.',
    '?Corta {x} y ponlo encima.'
  ], ['rapido', 'vegetariano']),
  d('tosta-atun', 'Tosta de atún', 'mnc', [g(...LOAF), g('atun')], ['tomate', 'aguacate', 'cebolla', 'pepino', 'aceitunas', 'limon', 'huevo', 'pimiento', 'maiz'], 7, [
    'Tuesta el pan 2 min.',
    'Escurre el atún y mézclalo con un chorrito de limón.',
    'Repártelo sobre el pan.',
    '?Corta {x} fino y ponlo encima.'
  ], ['rapido', 'proteico']),
  d('revuelto-tostada', 'Huevos revueltos con tostada', 'dmn', [g('huevo'), g(...BREAD, 'tortilla')], ['tomate', 'espinaca', 'champinon', 'bacon', 'queso', 'aguacate', 'cebolla', 'pimiento', 'salmon'], 10, [
    'Tuesta el pan 2 min.',
    '?Saltea {x} 3 min en la sartén.',
    'Bate los huevos y viértelos a fuego bajo, removiendo sin parar.',
    'Retíralos cuando estén cremosos, que se siguen haciendo con el calor.',
    'Sírvelos sobre el pan.'
  ], ['rapido', 'proteico']),
  d('bagel-salmon', 'Bagel de salmón', 'dmn', [g('bagel'), g('salmon')], ['queso', 'aguacate', 'pepino', 'limon', 'tomate', 'cebolla'], 6, [
    'Abre el bagel y tuéstalo 3 min.',
    '?Úntalo con {x}.',
    'Reparte el salmón y ciérralo.'
  ], ['rapido', 'proteico']),
  d('bagel', 'Bagel relleno', 'dmn', [g('bagel')], ['queso', 'huevo', 'bacon', 'aguacate', 'tomate', 'atun', 'espinaca', 'pepino', 'mantequilla', 'pollo'], 6, [
    'Abre el bagel y tuéstalo 3 min.',
    '?Rellénalo con {x}.',
    'Cierra y córtalo por la mitad.'
  ], ['rapido']),
  d('guacamole', 'Guacamole', 'mnc', [g('aguacate'), g('tomate', 'cebolla', 'limon')], ['ajo', 'guindilla', 'pan', 'baguette', 'tortilla', 'maiz', 'sal', 'pepino', 'zanahoria'], 8, [
    'Machaca el aguacate con un tenedor.',
    'Pica fino el tomate o la cebolla y mézclalo con limón y sal.',
    '?Añade {x} picado.',
    'Sírvelo con pan tostado o bastones de verdura.'
  ], ['rapido', 'frio', 'vegetariano']),
  d('sandwich', 'Sándwich de {1}', 'cmn', [g(...LOAF), g('queso', 'huevo', 'pollo', 'atun', 'bacon')], ['lechuga', 'tomate', 'aguacate', 'pepino', 'zanahoria', 'pimiento', 'cebolla', 'queso', 'mantequilla'], 8, [
    'Tuesta el pan 2 min.',
    '?Corta {x} fino.',
    'Monta el sándwich con el relleno entre dos rebanadas.',
    'Córtalo por la mitad en diagonal.'
  ], ['rapido']),

  // ── Wraps, tortillas de trigo y bocatas ───────────────────
  d('wrap', 'Wrap de {1}', 'cmn', [g('tortilla'), g('pollo', 'atun', 'huevo', 'falafel', 'ternera', 'queso', 'aguacate', 'gambas', 'bacon')], ['lechuga', 'tomate', 'pepino', 'cebolla', 'pimiento', 'zanahoria', 'maiz', 'espinaca', 'guindilla', 'yogur'], 10, [
    'Calienta la tortilla 30 segundos por lado en una sartén seca.',
    'Cocina el relleno si hace falta (pollo, huevo o carne, 6 min).',
    '?Corta {x} fino.',
    'Rellena por el centro, dobla los lados y enrolla apretando.'
  ], ['rapido']),
  d('quesadilla', 'Quesadilla', 'cn', [g('tortilla'), g('queso')], ['pollo', 'champinon', 'pimiento', 'cebolla', 'maiz', 'bacon', 'tomate', 'aguacate', 'guindilla', 'espinaca'], 10, [
    '?Saltea {x} 4 min y resérvalo.',
    'Pon la tortilla en la sartén, reparte el queso y el relleno sobre la mitad.',
    'Dóbla y dora 2 min por lado hasta que el queso se funda.',
    'Córtala en triángulos.'
  ], ['rapido']),
  d('fajitas', 'Fajitas', 'cn', [g('tortilla'), g('pollo', 'ternera'), g('pimiento', 'cebolla')], ['maiz', 'tomate', 'aguacate', 'queso', 'guindilla', 'lechuga', 'champinon', 'yogur'], 18, [
    'Corta la carne y las verduras en tiras finas.',
    'Saltea primero la carne 5 min a fuego fuerte.',
    'Añade las verduras y sigue 5 min más.',
    'Calienta las tortillas y sírvelo todo para que cada uno se las monte.'
  ], ['proteico']),
  d('burrito', 'Burrito', 'cn', [g('tortilla'), g('arroz'), g('alubias', 'pollo', 'ternera')], ['maiz', 'queso', 'tomate', 'aguacate', 'cebolla', 'pimiento', 'guindilla', 'lechuga'], 15, [
    'Calienta el arroz y el relleno en una sartén 5 min.',
    '?Corta {x} y mézclalo.',
    'Pon todo en el centro de la tortilla caliente.',
    'Dobla los lados, enrolla y dora el burrito 1 min por cada lado.'
  ], ['proteico']),
  d('pizza', 'Pizza casera', 'cn', [g('tortilla', ...LOAF), g('tomate'), g('queso')], ['champinon', 'aceitunas', 'pimiento', 'cebolla', 'bacon', 'pollo', 'atun', 'maiz', 'ajo'], 15, [
    'Calienta el horno a 220 °C.',
    'Extiende el tomate triturado sobre la base.',
    'Reparte el queso por encima.',
    '?Añade {x}.',
    'Hornea 8 min hasta que el queso burbujee y los bordes estén dorados.'
  ]),
  d('empanadillas', 'Empanadillas al horno', 'cnm', [g('empanadillas')], ['lechuga', 'tomate', 'pepino', 'patata', 'huevo', 'aceitunas', 'queso', 'zanahoria', 'maiz'], 20, [
    'Calienta el horno a 200 °C.',
    'Coloca las empanadillas en una bandeja con papel de horno.',
    'Hornéalas 15 min, dándoles la vuelta a la mitad.',
    '?Sírvelas con una ensalada de {x}.'
  ]),

  // ── Huevos ───────────────────────────────────────────────
  d('revuelto', 'Revuelto de huevos', 'dcn', [g('huevo')], ['champinon', 'espinaca', 'gambas', 'bacon', 'tomate', 'pimiento', 'cebolla', 'queso', 'ajo', 'brocoli', 'calamar', 'salmon', 'maiz'], 10, [
    '?Saltea {x} 3 min en la sartén con un chorrito de aceite.',
    'Bate los huevos con una pizca de sal.',
    'Viértelos a fuego bajo y remueve sin parar 2 min.',
    'Retira cuando estén cremosos, que se siguen haciendo solos.'
  ], ['rapido', 'proteico', 'ligero']),
  d('tortilla-verduras', 'Tortilla de {1}', 'cn', [g('huevo'), g('champinon', 'espinaca', 'pimiento', 'cebolla', 'tomate', 'brocoli', 'maiz', 'guisantes', 'zanahoria')], ['queso', 'bacon', 'ajo', 'patata', 'aceitunas'], 15, [
    'Corta la verdura pequeña y sofríela 5 min a fuego medio.',
    '?Añade {x}.',
    'Bate los huevos con sal y viértelos sobre la verdura.',
    'Cuaja 2 min por lado, dándole la vuelta con la ayuda de un plato.'
  ], ['proteico', 'ligero']),
  d('tortilla-patata', 'Tortilla de patata', 'cnm', [g('patata'), g('huevo')], ['cebolla', 'pimiento', 'champinon', 'espinaca', 'bacon', 'queso'], 30, [
    'Pela y corta la patata en láminas finas.',
    'Pochala a fuego suave 12 min con la cebolla si la hay, hasta que esté blanda.',
    'Escurre el aceite y mezcla la patata con los huevos batidos.',
    'Cuaja 4 min por un lado, dale la vuelta con un plato y 3 min por el otro.',
    '?Para variar, añade {x}.'
  ], ['proteico', 'vegetariano']),
  d('huevos-rotos', 'Huevos rotos con patatas', 'cn', [g('patata'), g('huevo')], ['bacon', 'pimiento', 'ajo', 'aceitunas', 'champinon', 'guindilla'], 25, [
    'Corta las patatas en rodajas finas y fríelas o ásalas 15 min hasta que estén doradas.',
    '?Saltea {x} 3 min.',
    'Haz los huevos fritos 2 min.',
    'Pon los huevos sobre las patatas y rómpelos al servir.'
  ], ['proteico']),
  d('huevos-duros', 'Ensalada con huevo duro', 'cn', [g('huevo'), g('lechuga', 'tomate', 'pepino', 'zanahoria')], ['atun', 'maiz', 'aceitunas', 'aguacate', 'cebolla', 'queso', 'pimiento', 'limon'], 15, [
    'Cuece los huevos 10 min, enfríalos y pélalos.',
    'Lava y corta las verduras.',
    '?Añade {x}.',
    'Parte los huevos por la mitad y colócalos encima, aliñado con aceite, sal y limón.'
  ], ['ligero', 'proteico', 'frio']),

  // ── Arroz ────────────────────────────────────────────────
  d('arroz-pollo', 'Arroz con pollo', 'c', [g('arroz'), g('pollo')], ['pimiento', 'guisantes', 'cebolla', 'ajo', 'zanahoria', 'tomate', 'maiz', 'champinon', 'limon'], 30, [
    'Sofríe el pollo troceado 6 min hasta que se dore.',
    '?Añade {x} y rehoga 4 min.',
    'Echa el arroz, dale una vuelta y cúbrelo con el doble de agua caliente.',
    'Cuece 15 min sin remover y déjalo reposar 5 min tapado.'
  ], ['cuchara', 'proteico']),
  d('arroz-marinero', 'Arroz marinero', 'c', [g('arroz'), g(...SEAFOOD, 'pescado')], ['tomate', 'pimiento', 'guisantes', 'ajo', 'cebolla', 'limon', 'guindilla'], 30, [
    'Sofríe el ajo y la cebolla si los hay, 3 min.',
    '?Añade {x} y rehoga 3 min.',
    'Echa el arroz y cúbrelo con el doble de caldo o agua caliente.',
    'A los 10 min añade el marisco o el pescado y cuece 8 min más.',
    'Reposa 5 min tapado.'
  ], ['cuchara']),
  d('arroz-cubana', 'Arroz a la cubana', 'cn', [g('arroz'), g('huevo')], ['tomate', 'platano', 'bacon', 'ajo'], 20, [
    'Cuece el arroz 12 min en agua con sal y escúrrelo.',
    '?Prepara {x} frito o a la plancha.',
    'Haz los huevos fritos 2 min.',
    'Sirve el arroz con el huevo encima.'
  ], ['rapido', 'proteico']),
  d('arroz-verduras', 'Arroz con verduras', 'cn', [g('arroz'), gm(2, ...COOKED_VEG)], ['ajo', 'queso', 'huevo', 'limon', 'jengibre', 'guindilla'], 25, [
    'Corta las verduras en dados pequeños y sofríelas 5 min.',
    'Añade el arroz y rehoga 1 min.',
    'Cúbrelo con el doble de agua caliente y cuece 15 min.',
    '?Termina con {x}.'
  ], ['vegetariano', 'ligero']),
  d('arroz-salteado', 'Arroz salteado', 'cn', [g('arroz')], ['huevo', 'pollo', 'gambas', 'guisantes', 'zanahoria', 'maiz', 'cebolla', 'pimiento', 'ajo', 'champinon', 'brocoli', 'espinaca', 'bacon', 'ternera', 'cerdo', 'jengibre', 'guindilla', 'calamar', 'cangrejo'], 15, [
    'Cuece el arroz con antelación y déjalo enfriar (el arroz recién hecho se apelmaza).',
    '?Corta {x} pequeño y saltéalo 4 min a fuego fuerte.',
    'Añade el arroz y saltea 4 min más hasta que se tueste un poco.',
    'Prueba y ajusta de sal.'
  ], ['rapido']),
  d('ensalada-arroz', 'Ensalada de arroz', 'cn', [g('arroz'), g('maiz', 'tomate', 'pepino', 'zanahoria', 'pimiento'), g('atun', 'huevo', 'pollo', 'gambas', 'aceitunas')], ['lechuga', 'cebolla', 'aguacate', 'queso', 'limon'], 15, [
    'Cuece el arroz 12 min, escúrrelo y enfríalo bajo el grifo.',
    'Corta las verduras en dados pequeños.',
    'Mézclalo todo con el atún, el huevo o lo que lleve.',
    '?Añade {x}.',
    'Aliña con aceite, sal y limón.'
  ], ['frio', 'ligero']),
  d('pimientos-rellenos', 'Pimientos rellenos', 'cn', [g('pimiento'), g('arroz', 'ternera', 'atun', 'pollo', 'queso')], ['cebolla', 'tomate', 'huevo', 'ajo', 'champinon', 'maiz', 'aceitunas'], 40, [
    'Calienta el horno a 190 °C y corta la tapa de los pimientos.',
    'Sofríe el relleno 6 min con la cebolla si la hay.',
    '?Mezcla con {x}.',
    'Rellena los pimientos y hornéalos 25 min.'
  ], ['cuchara']),

  // ── Pasta ────────────────────────────────────────────────
  d('pasta-tomate', 'Pasta con tomate', 'cn', [g('pasta'), g('tomate')], ['ajo', 'cebolla', 'queso', 'aceitunas', 'champinon', 'berenjena', 'pimiento', 'atun', 'bacon', 'espinaca'], 20, [
    'Cuece la pasta en agua con sal según el paquete (unos 9 min).',
    'Mientras, sofríe el ajo o la cebolla y echa el tomate troceado 8 min.',
    '?Añade {x}.',
    'Mezcla la pasta con la salsa y un cacito del agua de cocción.'
  ], ['vegetariano']),
  d('carbonara', 'Pasta a la carbonara', 'cn', [g('pasta'), g('bacon'), g('huevo')], ['queso', 'champinon', 'ajo', 'cebolla'], 20, [
    'Cuece la pasta 9 min y guarda un vaso del agua.',
    'Dora el bacon en la sartén 4 min, sin aceite.',
    'Bate el huevo con el queso si lo hay, y mézclalo con la pasta caliente fuera del fuego.',
    'Añade el bacon y un chorrito del agua hasta que quede cremoso.'
  ], ['proteico']),
  d('boloñesa', 'Pasta boloñesa', 'cn', [g('pasta'), g('ternera'), g('tomate')], ['cebolla', 'zanahoria', 'ajo', 'champinon', 'queso', 'pimiento'], 35, [
    'Sofríe la cebolla y la zanahoria picadas 5 min.',
    'Añade la carne y dórala 6 min, desmenuzándola.',
    'Echa el tomate y deja cocer 15 min a fuego suave.',
    'Cuece la pasta 9 min y mézclala con la salsa.',
    '?Termina con {x}.'
  ], ['proteico']),
  d('pasta-atun', 'Pasta con atún', 'cn', [g('pasta'), g('atun')], ['tomate', 'aceitunas', 'maiz', 'cebolla', 'ajo', 'queso', 'pimiento'], 18, [
    'Cuece la pasta 9 min.',
    'Sofríe el ajo y la cebolla si los hay, 4 min.',
    '?Añade {x} y rehoga 2 min.',
    'Mezcla con el atún escurrido y la pasta caliente.'
  ], ['rapido', 'proteico']),
  d('pasta-gambas', 'Pasta con gambas', 'cn', [g('pasta'), g('gambas', 'calamar')], ['ajo', 'guindilla', 'tomate', 'limon', 'espinaca', 'cebolla'], 18, [
    'Cuece la pasta 9 min.',
    'Dora el ajo laminado 1 min y añade el marisco 3 min a fuego fuerte.',
    '?Añade {x}.',
    'Mezcla con la pasta y un chorrito del agua de cocción.'
  ], ['rapido']),
  d('pasta-pollo', 'Pasta con pollo', 'cn', [g('pasta'), g('pollo')], ['champinon', 'espinaca', 'brocoli', 'queso', 'cebolla', 'tomate', 'ajo', 'pimiento'], 22, [
    'Cuece la pasta 9 min.',
    'Dora el pollo en dados 6 min a fuego medio-alto.',
    '?Añade {x} y saltea 4 min.',
    'Mezcla con la pasta y un chorrito del agua de cocción.'
  ], ['proteico']),
  d('pasta-verduras', 'Pasta con verduras', 'cn', [g('pasta'), gm(2, ...COOKED_VEG)], ['queso', 'ajo', 'aceitunas', 'guindilla'], 20, [
    'Cuece la pasta 9 min.',
    'Corta las verduras y saltéalas 6 min a fuego medio-alto.',
    'Mezcla con la pasta y un cacito del agua de cocción.',
    '?Termina con {x}.'
  ], ['vegetariano']),
  d('ensalada-pasta', 'Ensalada de pasta', 'cn', [g('pasta'), g('tomate', 'pepino', 'maiz', 'pimiento'), g('atun', 'huevo', 'queso', 'aceitunas', 'pollo')], ['lechuga', 'zanahoria', 'cebolla', 'limon', 'aguacate'], 18, [
    'Cuece la pasta 9 min, escúrrela y enfríala bajo el grifo.',
    'Corta las verduras en dados.',
    'Mézclalo todo con el atún, el queso o lo que lleve.',
    '?Añade {x}.',
    'Aliña con aceite, sal y limón.'
  ], ['frio']),

  // ── Patata y boniato ─────────────────────────────────────
  d('patatas-horno', 'Patatas al horno', 'cn', [g('patata')], ['cebolla', 'ajo', 'pimiento', 'bacon', 'queso', 'brocoli', 'champinon', 'zanahoria', 'limon', 'guindilla', 'tomate'], 40, [
    'Calienta el horno a 200 °C.',
    'Corta las patatas en gajos y mézclalas con aceite y sal.',
    '?Añade {x} troceado.',
    'Ásalo 30 min, dándole la vuelta a la mitad.'
  ], ['vegetariano']),
  d('boniato-asado', 'Boniato asado', 'cn', [g('boniato')], ['queso', 'aguacate', 'huevo', 'bacon', 'yogur', 'ajo', 'pimiento', 'cebolla', 'lentejas', 'falafel', 'frutos', 'miel'], 35, [
    'Calienta el horno a 200 °C.',
    'Pincha el boniato con un tenedor o córtalo en dados.',
    'Ásalo 30 min (dados: 25 min), hasta que esté blando.',
    '?Sírvelo con {x}.'
  ], ['vegetariano']),
  d('pollo-patatas', 'Pollo con patatas al horno', 'cn', [g('pollo'), g('patata')], ['cebolla', 'ajo', 'limon', 'zanahoria', 'pimiento', 'champinon', 'tomate'], 45, [
    'Calienta el horno a 200 °C.',
    'Pon las patatas en gajos en la bandeja y el pollo encima, con aceite y sal.',
    '?Reparte {x} alrededor.',
    'Hornea 35 min, dándole la vuelta al pollo a la mitad.'
  ], ['proteico']),
  d('guiso-patatas', 'Guiso de {0} con patatas', 'c', [g('ternera', 'cerdo'), g('patata')], ['zanahoria', 'cebolla', 'guisantes', 'ajo', 'pimiento', 'champinon', 'tomate'], 50, [
    'Dora la carne en trozos 5 min en una cazuela.',
    '?Añade {x} y rehoga 4 min.',
    'Echa las patatas troceadas y cubre con agua caliente.',
    'Cuece tapado 30 min a fuego suave, hasta que todo esté tierno.'
  ], ['cuchara', 'proteico']),
  d('filete-patatas', 'Filete de {0} con patatas', 'cn', [g('ternera', 'cerdo'), g('patata')], ['pimiento', 'huevo', 'ajo', 'champinon', 'aceitunas', 'tomate', 'cebolla'], 25, [
    'Corta las patatas en rodajas finas y fríelas o ásalas 15 min.',
    'Sazona el filete y márcalo en la plancha 3 min por lado.',
    '?Saltea {x} 3 min.',
    'Deja reposar la carne 2 min antes de cortarla.'
  ], ['proteico']),

  // ── Pollo, carne y pescado ───────────────────────────────
  d('pollo-ensalada', 'Pollo a la plancha con ensalada', 'cn', [g('pollo'), g('lechuga', 'tomate', 'pepino', 'zanahoria', 'aguacate')], ['cebolla', 'aceitunas', 'maiz', 'limon', 'queso', 'pimiento'], 18, [
    'Sazona el pollo y márcalo en la plancha 5 min por lado.',
    'Lava y corta la ensalada.',
    '?Añade {x}.',
    'Corta el pollo en tiras y colócalo sobre la ensalada con aceite y limón.'
  ], ['ligero', 'proteico']),
  d('pollo-limon', 'Pollo al limón', 'cn', [g('pollo'), g('limon')], ['ajo', 'champinon', 'patata', 'arroz', 'brocoli', 'zanahoria', 'jengibre', 'guisantes'], 25, [
    'Dora el pollo troceado 6 min.',
    '?Añade {x} y rehoga 3 min.',
    'Exprime el limón por encima, tapa y cuece 8 min a fuego suave.'
  ], ['proteico']),
  d('pollo-ajillo', 'Pollo al ajillo', 'cn', [g('pollo'), g('ajo')], ['patata', 'limon', 'champinon', 'guindilla', 'cebolla', 'pimiento', 'arroz'], 25, [
    'Dora el pollo troceado 6 min a fuego fuerte.',
    'Añade el ajo laminado y rehoga 2 min.',
    '?Añade {x} y rehoga 3 min.',
    'Baja el fuego, tapa y cuece 12 min.'
  ], ['proteico']),
  d('pollo-verduras', 'Salteado de pollo y verduras', 'cn', [g('pollo'), gm(2, ...COOKED_VEG)], ['arroz', 'pasta', 'ajo', 'jengibre', 'guindilla', 'limon', 'queso'], 20, [
    'Corta el pollo en tiras y las verduras en trozos medianos.',
    'Saltea el pollo 5 min a fuego fuerte y resérvalo.',
    'Saltea las verduras 6 min.',
    'Vuelve a poner el pollo y mezcla 1 min.',
    '?Sírvelo con {x}.'
  ], ['proteico']),
  d('pollo', 'Pollo dorado', 'cn', [g('pollo')], ['cebolla', 'ajo', 'pimiento', 'champinon', 'tomate', 'limon', 'arroz', 'patata', 'zanahoria', 'brocoli', 'espinaca', 'queso'], 18, [
    'Corta el pollo en dados y sazónalo.',
    'Dóralo 6 min a fuego medio-alto, sin moverlo mucho.',
    '?Añade {x} y rehoga 4 min.',
    'Prueba y ajusta de sal.'
  ], ['proteico', 'rapido']),
  d('ternera-salteada', 'Ternera salteada', 'cn', [g('ternera'), g(...COOKED_VEG)], ['arroz', 'pasta', 'patata', 'jengibre', 'guindilla', 'ajo', 'cebolla', 'champinon', 'pimiento'], 20, [
    'Corta la ternera en tiras finas.',
    'Márcala 2 min a fuego muy fuerte y resérvala.',
    'Saltea las verduras 6 min.',
    'Vuelve a poner la carne 1 min y sirve.',
    '?Acompáñalo con {x}.'
  ], ['proteico', 'rapido']),
  d('hamburguesa', 'Hamburguesa casera', 'cn', [g('ternera'), g(...LOAF)], ['queso', 'lechuga', 'tomate', 'cebolla', 'huevo', 'bacon', 'aguacate', 'pepino', 'patata', 'aceitunas'], 20, [
    'Forma la carne en una hamburguesa, sin apretar, y sazónala.',
    'Hazla a la plancha 4 min por lado.',
    '?Prepara {x}.',
    'Tuesta el pan 1 min y monta la hamburguesa.'
  ], ['proteico']),
  d('albondigas', 'Albóndigas en salsa', 'c', [g('ternera'), g('tomate')], ['cebolla', 'ajo', 'zanahoria', 'guisantes', 'patata', 'arroz', 'pasta', 'pimiento'], 40, [
    'Forma bolitas con la carne y sazónalas.',
    'Dóralas 5 min en la sartén y resérvalas.',
    'Sofríe la cebolla si la hay y echa el tomate 8 min.',
    'Pon las albóndigas en la salsa y cuece 15 min a fuego suave.',
    '?Añade {x} para acompañar.'
  ], ['cuchara', 'proteico']),
  d('cerdo-ajillo', 'Cerdo al ajillo', 'cn', [g('cerdo')], ['ajo', 'patata', 'pimiento', 'champinon', 'cebolla', 'arroz', 'guindilla'], 22, [
    'Corta el cerdo en dados y sazónalo.',
    'Dóralo 8 min a fuego medio-alto.',
    '?Añade {x} y rehoga 4 min.',
    'Retira cuando esté jugoso por dentro.'
  ], ['proteico']),
  d('salmon', 'Salmón a la plancha', 'cn', [g('salmon')], ['limon', 'espinaca', 'patata', 'arroz', 'brocoli', 'aguacate', 'ajo', 'zanahoria', 'boniato', 'tomate', 'pepino'], 15, [
    'Seca el salmón y sazónalo.',
    'Márcalo 4 min por el lado de la piel y 2 min por el otro.',
    '?Sírvelo con {x}.',
    'Exprime un poco de limón al final si lo tienes.'
  ], ['ligero', 'proteico', 'rapido']),
  d('pescado-horno', 'Pescado al horno', 'cn', [g('pescado')], ['limon', 'patata', 'tomate', 'pimiento', 'cebolla', 'ajo', 'arroz', 'brocoli', 'espinaca', 'aceitunas', 'zanahoria'], 25, [
    'Calienta el horno a 200 °C.',
    'Pon el pescado sobre una cama de verduras en rodajas, con aceite y sal.',
    '?Reparte {x} alrededor.',
    'Hornea 15 min.'
  ], ['ligero', 'proteico']),
  d('atun-tomate', 'Atún con tomate', 'cn', [g('atun'), g('tomate')], ['cebolla', 'pimiento', 'arroz', 'pasta', 'patata', 'huevo', 'aceitunas', 'maiz'], 15, [
    'Sofríe la cebolla o el pimiento si los hay, 5 min.',
    'Añade el tomate troceado y cuece 8 min a fuego suave.',
    'Incorpora el atún escurrido y calienta 2 min.',
    '?Sírvelo con {x}.'
  ], ['rapido', 'proteico']),
  d('ensalada-atun', 'Ensalada de atún', 'cn', [g('atun'), g('lechuga', 'tomate', 'pepino')], ['huevo', 'maiz', 'cebolla', 'aceitunas', 'aguacate', 'zanahoria', 'pimiento', 'queso', 'limon', 'patata'], 10, [
    'Lava y corta la verdura.',
    'Escurre el atún y ponlo encima.',
    '?Añade {x}.',
    'Aliña con aceite, sal y limón.'
  ], ['rapido', 'ligero', 'frio', 'proteico']),
  d('gambas-ajillo', 'Gambas al ajillo', 'cn', [g('gambas'), g('ajo')], ['guindilla', 'limon', 'pan', 'baguette', 'arroz', 'champinon', 'espinaca', 'tomate'], 10, [
    'Dora el ajo laminado 1 min a fuego medio, sin que se queme.',
    'Añade las gambas y la guindilla si hay, y saltea 2 min a fuego fuerte.',
    '?Añade {x}.',
    'Sirve enseguida, con pan para mojar.'
  ], ['rapido', 'proteico']),
  d('calamar', 'Calamar salteado', 'cn', [g('calamar')], ['ajo', 'limon', 'guindilla', 'pimiento', 'cebolla', 'arroz', 'pasta', 'guisantes', 'tomate'], 12, [
    'Limpia el calamar y córtalo en anillas.',
    '?Saltea {x} 4 min.',
    'Añade el calamar y cocina 3 min a fuego fuerte: más tiempo lo endurece.',
    'Sirve con unas gotas de limón.'
  ], ['rapido', 'proteico']),
  d('mejillones', 'Mejillones al vapor', 'cn', [g('ostras')], ['limon', 'ajo', 'tomate', 'pan', 'baguette', 'guindilla', 'cebolla', 'patata'], 12, [
    'Lava los mejillones y desecha los que estén abiertos.',
    'Ponlos en una olla con un chorrito de agua, el limón y el ajo si hay.',
    'Tapa y cuece 5 min a fuego fuerte hasta que se abran.',
    '?Sírvelos con {x}.'
  ], ['rapido', 'proteico']),
  d('ensalada-cangrejo', 'Ensalada de cangrejo', 'cn', [g('cangrejo')], ['lechuga', 'aguacate', 'pepino', 'tomate', 'maiz', 'limon', 'huevo', 'pasta', 'arroz'], 10, [
    'Desmenuza el cangrejo.',
    'Corta la verdura.',
    '?Añade {x}.',
    'Mezcla todo con aceite y limón y sirve frío.'
  ], ['rapido', 'frio', 'ligero']),

  // ── Legumbres ────────────────────────────────────────────
  d('lentejas', 'Lentejas estofadas', 'cn', [g('lentejas')], ['zanahoria', 'cebolla', 'patata', 'pimiento', 'ajo', 'tomate', 'arroz', 'bacon', 'ternera', 'pollo'], 30, [
    'Sofríe la verdura picada 5 min.',
    'Añade las lentejas cocidas y cubre con agua.',
    '?Echa {x}.',
    'Cuece 15 min a fuego suave y deja reposar 5 min.'
  ], ['cuchara', 'proteico', 'vegetariano']),
  d('alubias', 'Alubias guisadas', 'cn', [g('alubias')], ['bacon', 'cebolla', 'pimiento', 'zanahoria', 'patata', 'tomate', 'ajo', 'arroz', 'pollo'], 30, [
    'Sofríe la cebolla y el pimiento si los hay, 5 min.',
    'Añade las alubias cocidas, el tomate y un vaso de agua.',
    '?Echa {x}.',
    'Cuece 15 min a fuego suave.'
  ], ['cuchara', 'proteico']),
  d('falafel-bowl', 'Bol de falafel', 'cn', [g('falafel')], ['arroz', 'lechuga', 'tomate', 'pepino', 'aguacate', 'yogur', 'limon', 'zanahoria', 'tortilla', 'pan', 'cebolla'], 15, [
    'Dora el falafel en sartén 6 min dándole vueltas hasta que cruja.',
    'Corta la verdura y prepara la base.',
    '?Añade {x}.',
    'Monta el bol con el falafel caliente encima.'
  ], ['proteico', 'vegetariano']),
  d('ensalada-legumbres', 'Ensalada de legumbres', 'cn', [g(...LEGUMES), gm(1, 'tomate', 'pepino', 'cebolla', 'pimiento', 'maiz', 'zanahoria')], ['atun', 'huevo', 'aceitunas', 'limon', 'aguacate', 'arroz', 'lechuga'], 10, [
    'Escurre y lava las legumbres.',
    'Corta las verduras en dados pequeños.',
    '?Añade {x}.',
    'Mezcla y aliña con aceite, sal y limón. Mejor si reposa 10 min.'
  ], ['frio', 'proteico', 'rapido']),

  // ── Verduras ─────────────────────────────────────────────
  d('ensalada', 'Ensalada', 'cn', [g('lechuga'), g('tomate', 'pepino', 'zanahoria', 'aguacate', 'pimiento', 'maiz', 'cebolla')], ['huevo', 'atun', 'queso', 'aceitunas', 'pollo', 'limon', 'frutos'], 10, [
    'Lava y trocea la lechuga y el resto de la verdura.',
    '?Añade {x}.',
    'Aliña al servir con aceite, sal y limón, para que no se ablande.'
  ], ['ligero', 'rapido', 'frio', 'vegetariano']),
  d('gazpacho', 'Gazpacho', 'cnm', [g('tomate'), g('pepino', 'pimiento')], ['cebolla', 'ajo', 'pan', 'aceitunas', 'sal', 'aguacate'], 10, [
    'Trocea las verduras y ponlas en la batidora.',
    '?Añade {x}.',
    'Tritura 1 min con aceite, sal y un chorrito de vinagre o limón.',
    'Sírvelo muy frío.'
  ], ['frio', 'ligero', 'vegetariano', 'rapido']),
  d('crema-zanahoria', 'Crema de zanahoria y jengibre', 'cn', [g('zanahoria'), g('jengibre')], ['patata', 'cebolla', 'leche', 'yogur', 'naranja', 'ajo'], 30, [
    'Pela y trocea las zanahorias y la patata o cebolla si hay.',
    'Cuécelo 20 min en agua con sal y un trocito de jengibre.',
    'Tritura con un poco de su caldo hasta que quede fina.',
    '?Termina con {x}.'
  ], ['cuchara', 'ligero', 'vegetariano']),
  d('crema-verduras', 'Crema de verduras', 'cn', [gm(2, 'zanahoria', 'brocoli', 'boniato', 'espinaca', 'champinon', 'guisantes', 'pimiento', 'cebolla', 'berenjena')], ['patata', 'ajo', 'queso', 'pan', 'huevo', 'leche', 'jengibre', 'yogur'], 30, [
    'Trocea las verduras y sofríelas 5 min.',
    'Cúbrelas con agua y cuece 20 min.',
    'Tritura hasta que quede fina y ajusta de sal.',
    '?Sírvela con {x}.'
  ], ['cuchara', 'ligero', 'vegetariano']),
  d('sopa-pollo', 'Sopa de pollo', 'cn', [g('pollo'), g('zanahoria', 'cebolla', 'patata')], ['pasta', 'arroz', 'huevo', 'guisantes', 'ajo', 'brocoli', 'pimiento'], 35, [
    'Pon el pollo en una olla con agua y la verdura troceada.',
    'Cuece 20 min a fuego medio y retira la espuma.',
    '?Añade {x} y cuece 10 min más.',
    'Desmenuza el pollo y devuélvelo a la sopa.'
  ], ['cuchara', 'proteico']),
  d('brocoli-gratinado', 'Brócoli gratinado', 'cn', [g('brocoli'), g('queso')], ['patata', 'bacon', 'ajo', 'pasta', 'huevo', 'champinon', 'cebolla'], 25, [
    'Cuece el brócoli en ramilletes 5 min y escúrrelo.',
    '?Saltea {x} 3 min.',
    'Colócalo en una fuente, cúbrelo con el queso y gratina 8 min a 200 °C.'
  ], ['vegetariano']),
  d('berenjenas-gratinadas', 'Berenjenas gratinadas', 'cn', [g('berenjena'), g('queso')], ['tomate', 'cebolla', 'ternera', 'pimiento', 'ajo', 'champinon'], 35, [
    'Calienta el horno a 200 °C y corta las berenjenas por la mitad.',
    'Ásalas 20 min boca arriba, con un poco de aceite y sal.',
    '?Saltea {x} y rellénalas.',
    'Cúbrelas con queso y gratina 8 min.'
  ], ['vegetariano']),
  d('champinones-ajillo', 'Champiñones al ajillo', 'cn', [g('champinon'), g('ajo')], ['huevo', 'gambas', 'bacon', 'pan', 'baguette', 'guindilla', 'limon', 'patata'], 12, [
    'Lamina los champiñones y el ajo.',
    'Saltea los champiñones 6 min a fuego fuerte sin tapar, hasta que suelten el agua y se doren.',
    'Añade el ajo y la guindilla si hay, 1 min.',
    '?Sírvelos con {x}.'
  ], ['rapido', 'vegetariano']),
  d('espinacas', 'Espinacas salteadas', 'cn', [g('espinaca')], ['huevo', 'ajo', 'queso', 'pasta', 'bacon', 'gambas', 'atun', 'aceitunas', 'patata', 'lentejas', 'alubias', 'frutos'], 10, [
    'Lava bien las espinacas.',
    'Saltéalas 2 min con un poco de aceite y ajo si hay: se reducen muchísimo.',
    '?Añade {x}.',
    'Sazona al final para que no suelten tanta agua.'
  ], ['rapido', 'ligero', 'vegetariano']),
  d('salteado-verduras', 'Salteado de verduras', 'cn', [gm(2, ...COOKED_VEG)], ['ajo', 'jengibre', 'guindilla', 'queso', 'huevo', 'arroz', 'pasta', 'aceitunas', 'limon'], 15, [
    'Corta las verduras: las más duras en trozos más finos.',
    'Saltea primero las más duras (zanahoria, brócoli) 4 min a fuego fuerte.',
    'Añade las blandas y saltea 3 min más.',
    '?Termina con {x}.'
  ], ['rapido', 'vegetariano', 'ligero'])
];

// Los clásicos ganan a las variantes cuando encajan los dos
for (const [id, bonus] of Object.entries({ porridge: 8, revuelto: 3, 'tortilla-patata': 4, boloñesa: 4, carbonara: 4, 'arroz-pollo': 3, 'guiso-patatas': 4, 'pollo-patatas': 3 })) {
  const dish = DISHES.find((x) => x.id === id);
  if (dish) dish.bonus = bonus;
}

export const DISHES_BY_ID: Record<string, Dish> = Object.fromEntries(DISHES.map((x) => [x.id, x]));
