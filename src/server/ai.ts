import { GoogleGenAI } from '@google/genai';
import { amountsFor, BY_ID, INGREDIENTS, isValidIngredient } from '../shared/ingredients';
import { matchDish } from '../shared/chef';
import { localRecipe, macros } from '../shared/recipe';
import type { Goal, Profile, Recipe, Skill, Slot } from '../shared/types';

// Mismo patrón que VoltBody Powered: Gemini con cadena de modelos configurables desde Coolify.
const LEGACY_MODEL = 'gemini-3-flash-preview';
const MODELS = [...new Set([process.env.GEMINI_MODEL_FAST || 'gemini-3.5-flash-lite', LEGACY_MODEL])];
const CONFIG = {
  responseMimeType: 'application/json',
  temperature: 0.85,
  maxOutputTokens: 700,
  thinkingConfig: { thinkingLevel: 'MINIMAL' }
};

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
if (!ai) console.warn('[ai] GEMINI_API_KEY no configurada: se usan recetas locales.');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const errStatus = (e: any) => {
  const m = String(e?.message || '');
  return Number(e?.status || e?.code || (m.match(/"code"\s*:\s*(\d{3})/) || [])[1] || 0);
};
const isBusy = (e: any) => /"code":503|unavailable|high demand/i.test(String(e?.message || ''));
const isUnsupportedConfig = (e: any) =>
  errStatus(e) === 400 && /thinking|not supported|unsupported|invalid argument/i.test(String(e?.message || ''));

async function generate(prompt: string | object[], maxTokens = 700): Promise<string> {
  let last: unknown = null;
  for (const model of MODELS) {
    let cfg: Record<string, unknown> = { ...CONFIG, maxOutputTokens: maxTokens };
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await ai!.models.generateContent({ model, contents: prompt as any, config: cfg });
        return res.text ?? '';
      } catch (e) {
        last = e;
        if (cfg.thinkingConfig && isUnsupportedConfig(e)) {
          const { thinkingConfig: _drop, ...rest } = cfg;
          cfg = rest;
          continue;
        }
        if (isBusy(e) && attempt === 1) {
          await sleep(350);
          continue;
        }
        console.warn('[ai] modelo falló', model, errStatus(e));
        break;
      }
    }
  }
  throw last;
}

export function extractJson(raw = ''): string {
  const t = String(raw).trim();
  if (t.startsWith('{') && t.endsWith('}')) return t;
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  return a >= 0 && b > a ? t.slice(a, b + 1) : t;
}

const GOALS: Record<Goal, string> = {
  verde: 'quiere comer más verdura sin sufrir',
  proteina: 'quiere más proteína',
  rapido: 'quiere platos rapidísimos, de pocos pasos'
};

const SKILLS: Record<Skill, string> = {
  cero: 'No sabe cocinar nada: explica cada paso como a alguien que nunca ha encendido un fuego.',
  apano: 'Se apaña en la cocina.',
  chef: 'Cocina bien: puedes proponer alguna técnica con más gracia.'
};

const SLOT_TEXT: Record<Slot, string> = {
  desayuno: 'Es un DESAYUNO sano: nada de guisos ni frituras, algo dulce o salado ligero.',
  comida: 'Es la COMIDA principal del día.',
  merienda: 'Es una MERIENDA: algo pequeño, sano y rápido, sin cocinar si se puede.',
  cena: 'Es una CENA: ligera y fácil de digerir.'
};

export interface Taste {
  liked: string[];
  disliked: string[];
}

function buildPrompt(ids: string[], p: Profile, slot: Slot, servings: number, taste: Taste, base: Recipe) {
  const m = matchDish(ids, slot);
  const hated = ids.filter((id) => p.dislikes.includes(id)).map((id) => BY_ID[id].name);
  const aside = m.leftover.map((id) => BY_ID[id].name);
  return `Eres el chef de PUCHERO, una app para gente a la que le cuesta comer bien (manías o pereza).
El recetario ha elegido este plato: "${base.title}". Escríbelo como receta casera en español de España, fiel a ese plato, usando SOLO estos ingredientes (más aceite, sal, especias y agua): ${m.core.concat(m.extras).map((id) => BY_ID[id].name).join(', ')}.${aside.length ? ` Estos otros NO entran en el plato porque no encajan; menciónalos al final como acompañamiento aparte: ${aside.join(', ')}.` : ''}
Borrador de pasos del recetario (mejóralo, mantén los tiempos): ${base.steps.join(' | ')}
${SLOT_TEXT[slot]} Para ${servings} ${servings === 1 ? 'persona' : 'personas'}. El usuario ${GOALS[p.goal]}. ${SKILLS[p.skill]}${p.allergies.length ? ` Alergias o intolerancias: ${p.allergies.join(', ')}; no añadas nada que las contenga.` : ''}${hated.length ? ` Odia: ${hated.join(', ')}. Escóndelo con una técnica concreta (rallar, triturar en salsa, gratinar...).` : ''}
${taste.liked.length ? `Platos que le gustaron: ${taste.liked.join('; ')}.` : ''}${taste.disliked.length ? ` Platos que NO le gustaron (evita ese estilo): ${taste.disliked.join('; ')}.` : ''}
Tono: cercano, divertido, cero sermones. Pasos cortos y concretos (máx. 16 palabras cada uno).
Responde SOLO JSON con esta forma exacta:
{"title":"nombre del plato, máx 6 palabras","tagline":"frase gancho, máx 9 palabras","tip":"truco para camuflar lo que menos gusta, máx 18 palabras","steps":["paso 1","paso 2","paso 3","paso 4"],"minutes":15}`;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function makeRecipe(ids: string[], profile: Profile, slot: Slot, servings: number, taste: Taste): Promise<Recipe> {
  const fallback = localRecipe(ids, profile.dislikes, servings, slot);
  if (!ai) return fallback;
  try {
    const json = JSON.parse(extractJson(await generate(buildPrompt(ids, profile, slot, servings, taste, fallback))));
    const steps = Array.isArray(json.steps)
      ? json.steps.map((s: unknown) => str(s, 160)).filter(Boolean).slice(0, 6)
      : [];
    const title = str(json.title, 70);
    if (!title || steps.length < 2) return fallback;
    const m = macros(ids);
    const minutes = Number(json.minutes);
    return {
      title,
      tagline: str(json.tagline, 90) || fallback.tagline,
      tip: str(json.tip, 160) || fallback.tip,
      steps,
      ingredients: ids,
      amounts: amountsFor(ids, servings),
      servings,
      kcal: m.kcal,
      protein: m.protein,
      minutes: Number.isFinite(minutes) && minutes > 0 && minutes < 120 ? Math.round(minutes) : m.minutes,
      source: 'ia'
    };
  } catch (e) {
    console.warn('[ai] usando receta local:', (e as Error)?.message?.slice(0, 120));
    return fallback;
  }
}

export const aiEnabled = () => ai !== null;

/** Lee una foto de la nevera o la despensa y devuelve los alimentos del catálogo que se ven. */
export async function scanFridge(base64: string, mimeType: string): Promise<string[]> {
  if (!ai) throw new Error('NO_AI');
  const catalog = INGREDIENTS.map((i) => `${i.id} (${i.name})`).join(', ');
  const prompt = `Mira la foto de una nevera, despensa o encimera. Di qué alimentos de esta lista se ven claramente.
Lista (usa SOLO estos ids): ${catalog}.
Responde SOLO JSON: {"ids":["id1","id2"]}. Si no ves ninguno: {"ids":[]}.`;
  const raw = await generate([{ role: 'user', parts: [{ inlineData: { mimeType, data: base64 } }, { text: prompt }] }], 300);
  const json = JSON.parse(extractJson(raw));
  return Array.isArray(json.ids) ? [...new Set<string>(json.ids.filter(isValidIngredient))].slice(0, 40) : [];
}
