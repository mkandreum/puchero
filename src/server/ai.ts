import { GoogleGenAI } from '@google/genai';
import { BY_ID } from '../shared/ingredients';
import { localRecipe, macros } from '../shared/recipe';
import type { Goal, Recipe } from '../shared/types';

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

async function generate(prompt: string): Promise<string> {
  let last: unknown = null;
  for (const model of MODELS) {
    let cfg: Record<string, unknown> = CONFIG;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await ai!.models.generateContent({ model, contents: prompt, config: cfg });
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

function buildPrompt(ids: string[], dislikes: string[], goal: Goal) {
  const names = ids.map((id) => BY_ID[id].name).join(', ');
  const hated = ids.filter((id) => dislikes.includes(id)).map((id) => BY_ID[id].name);
  return `Eres el chef de PUCHERO, una app para gente a la que le cuesta comer bien (manías o pereza).
Crea UN plato casero en español de España usando SOLO estos ingredientes (más aceite, sal, especias y agua): ${names}.
El usuario ${GOALS[goal]}.${hated.length ? ` Odia: ${hated.join(', ')}. Escóndelo con una técnica concreta (rallar, triturar en salsa, gratinar...).` : ''}
Tono: cercano, divertido, cero sermones. Pasos cortos y concretos (máx. 16 palabras cada uno).
Responde SOLO JSON con esta forma exacta:
{"title":"nombre del plato, máx 6 palabras","tagline":"frase gancho, máx 9 palabras","tip":"truco para camuflar lo que menos gusta, máx 18 palabras","steps":["paso 1","paso 2","paso 3","paso 4"],"minutes":15}`;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function makeRecipe(ids: string[], dislikes: string[], goal: Goal): Promise<Recipe> {
  const fallback = localRecipe(ids, dislikes);
  if (!ai) return fallback;
  try {
    const json = JSON.parse(extractJson(await generate(buildPrompt(ids, dislikes, goal))));
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
