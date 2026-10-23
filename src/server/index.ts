import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { isValidIngredient, MAX_IN_POT } from '../shared/ingredients';
import { slotForHour, type Goal, type Meal, type Slot } from '../shared/types';
import { makeRecipe } from './ai';
import { bestStreak, challengeFor, dayKey, localHour, streakFrom, weekOf } from './days';

const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.resolve('dist/public');

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

const GOALS: Goal[] = ['verde', 'proteina', 'rapido'];
const SLOTS: Slot[] = ['desayuno', 'comida', 'cena'];

// Express 4 no captura errores de handlers async: los envolvemos.
const a =
  (fn: (req: Request, res: Response, next: NextFunction) => unknown) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// ── Identidad anónima por dispositivo ────────────────────────────
type Authed = Request & { userId: string };
const ID_RE = /^[a-zA-Z0-9-]{16,64}$/;

async function deviceRaw(req: Request, res: Response, next: NextFunction) {
  const id = String(req.header('x-device-id') || '');
  if (!ID_RE.test(id)) return res.status(400).json({ error: 'x-device-id inválido' });
  await prisma.user.upsert({ where: { id }, update: {}, create: { id } });
  (req as Authed).userId = id;
  next();
}
const device = a(deviceRaw);

// ── Límite simple para la IA ─────────────────────────────────────
const hits = new Map<string, number[]>();
function aiLimit(req: Request, res: Response, next: NextFunction) {
  const key = (req as Authed).userId;
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < 10 * 60_000);
  if (recent.length >= 20) return res.status(429).json({ error: 'Demasiadas recetas seguidas, respira un poco.' });
  recent.push(now);
  hits.set(key, recent);
  next();
}

const toMeal = (m: any): Meal => ({
  id: m.id,
  title: m.title,
  tagline: m.tagline,
  tip: m.tip,
  steps: m.steps,
  ingredients: m.ingredients,
  kcal: m.kcal,
  protein: m.protein,
  minutes: m.minutes,
  slot: m.slot,
  source: m.source === 'ia' ? 'ia' : 'local',
  createdAt: m.createdAt.toISOString()
});

const cleanIds = (v: unknown) =>
  Array.isArray(v) ? [...new Set(v.filter(isValidIngredient))].slice(0, MAX_IN_POT) : [];

// ── Rutas ────────────────────────────────────────────────────────
app.get('/api/health', a(async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
}));

app.get('/api/me', device, a(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: (req as Authed).userId } });
  res.json({ dislikes: u?.dislikes ?? [], goal: (u?.goal as Goal) ?? 'verde' });
}));

app.put('/api/me', device, a(async (req, res) => {
  const dislikes = Array.isArray(req.body?.dislikes) ? [...new Set(req.body.dislikes.filter(isValidIngredient))] : undefined;
  const goal = GOALS.includes(req.body?.goal) ? (req.body.goal as Goal) : undefined;
  const u = await prisma.user.update({
    where: { id: (req as Authed).userId },
    data: { ...(dislikes ? { dislikes: dislikes as string[] } : {}), ...(goal ? { goal } : {}) }
  });
  res.json({ dislikes: u.dislikes, goal: u.goal });
}));

app.get('/api/today', device, a(async (req, res) => {
  const userId = (req as Authed).userId;
  const now = new Date();
  const today = dayKey(now);
  const [u, all] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.meal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 1000 })
  ]);
  const counts = new Map<string, number>();
  for (const m of all) {
    const k = dayKey(m.createdAt);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const keys = new Set(counts.keys());
  res.json({
    date: today,
    challenge: challengeFor(today, u?.dislikes ?? []),
    streak: streakFrom(keys, today),
    best: bestStreak(keys),
    total: all.length,
    week: weekOf(today, counts),
    meals: all.filter((m) => dayKey(m.createdAt) === today).map(toMeal)
  });
}));

app.post('/api/recipe', device, aiLimit, a(async (req, res) => {
  const ids = cleanIds(req.body?.ingredients);
  if (ids.length < 2) return res.status(400).json({ error: 'Mete al menos 2 ingredientes.' });
  const u = await prisma.user.findUnique({ where: { id: (req as Authed).userId } });
  res.json(await makeRecipe(ids, u?.dislikes ?? [], (u?.goal as Goal) ?? 'verde'));
}));

app.get('/api/meals', device, a(async (req, res) => {
  const take = Math.min(100, Math.max(1, Number(req.query.limit) || 40));
  const meals = await prisma.meal.findMany({
    where: { userId: (req as Authed).userId },
    orderBy: { createdAt: 'desc' },
    take
  });
  res.json(meals.map(toMeal));
}));

app.post('/api/meals', device, a(async (req, res) => {
  const b = req.body || {};
  const ids = cleanIds(b.ingredients);
  const steps = Array.isArray(b.steps) ? b.steps.filter((s: unknown) => typeof s === 'string').map((s: string) => s.slice(0, 200)).slice(0, 8) : [];
  if (typeof b.title !== 'string' || !b.title.trim() || ids.length === 0)
    return res.status(400).json({ error: 'Plato incompleto' });
  const int = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
  const m = await prisma.meal.create({
    data: {
      userId: (req as Authed).userId,
      title: b.title.trim().slice(0, 80),
      tagline: String(b.tagline || '').slice(0, 120),
      tip: String(b.tip || '').slice(0, 200),
      steps,
      ingredients: ids,
      kcal: int(b.kcal, 5000),
      protein: int(b.protein, 500),
      minutes: int(b.minutes, 300),
      source: b.source === 'ia' ? 'ia' : 'local',
      slot: SLOTS.includes(b.slot) ? b.slot : slotForHour(localHour(new Date()))
    }
  });
  res.status(201).json(toMeal(m));
}));

app.delete('/api/meals/:id', device, a(async (req, res) => {
  await prisma.meal.deleteMany({ where: { id: req.params.id, userId: (req as Authed).userId } });
  res.status(204).end();
}));

app.use('/api', (_req, res) => res.status(404).json({ error: 'No encontrado' }));

// ── Frontend ─────────────────────────────────────────────────────
app.use(
  express.static(PUBLIC_DIR, {
    index: false,
    setHeaders(res, file) {
      if (file.includes(`${path.sep}assets${path.sep}`) || file.includes(`${path.sep}food${path.sep}`))
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  })
);
const indexHtml = path.join(PUBLIC_DIR, 'index.html');
app.get('*', (_req, res) => {
  if (!fs.existsSync(indexHtml)) return res.status(500).send('Falta el build del cliente (npm run build).');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(indexHtml);
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[api]', err?.message || err);
  res.status(500).json({ error: 'Algo se ha quemado en la cocina.' });
});

const server = app.listen(PORT, () => console.log(`PUCHERO escuchando en :${PORT}`));
const shutdown = () => server.close(() => prisma.$disconnect().finally(() => process.exit(0)));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
