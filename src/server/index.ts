import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { PrismaClient, type User } from '@prisma/client';
import { ALLERGIES, amountsFor, isValidIngredient, MAX_IN_POT } from '../shared/ingredients';
import { slotForHour, SLOTS, type Meal, type Slot } from '../shared/types';
import { aiEnabled, makeRecipe, scanFridge } from './ai';
import { cleanShopping, generatePlan, readPlan, shoppingFromPlan } from './plan';
import { initPush, startReminders, vapidPublicKey } from './push';
import { achievementsOf, nutrientsOf, summaryOf } from './stats';
import {
  checkPassword, hashPassword, isGoal, isSkill, normalizeEmail, PASSWORD_MAX, PASSWORD_MIN, rateLimit, readReminders,
  requireAuth, signSession, toProfile, validEmail, type Authed
} from './auth';
import { challengeFor, dayKey, localHour, mondayOf, streakInfo, weekOf } from './days';

const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.resolve('dist/public');

app.set('trust proxy', 1);
app.disable('x-powered-by');
const smallJson = express.json({ limit: '32kb' });
const photoJson = express.json({ limit: '4mb' });
// Solo la foto de la nevera necesita un cuerpo grande
app.use((req, res, next) => (req.path === '/api/fridge/scan' ? photoJson : smallJson)(req, res, next));

// Express 4 no captura errores de handlers async: los envolvemos.
const a =
  (fn: (req: Request, res: Response, next: NextFunction) => unknown) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// ── CORS para la app Android (sirve la web empaquetada desde su propio origen) ──
const ORIGINS = new Set(
  (process.env.CORS_ORIGINS || 'https://appassets.androidplatform.net').split(',').map((o) => o.trim()).filter(Boolean)
);
app.use('/api', (req, res, next) => {
  const origin = req.header('origin');
  if (origin && ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type, x-device-id');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

const auth = requireAuth(prisma);
const uid = (req: Request) => (req as Authed).user.id;
const ip = (req: Request) => req.ip || 'x';
const authLimit = rateLimit(10, 15 * 60_000, (req) => `${ip(req)}:${normalizeEmail(req.body?.email)}`, 'Demasiados intentos. Espera unos minutos.');
const registerLimit = rateLimit(5, 60 * 60_000, ip, 'Demasiadas cuentas nuevas desde aquí. Prueba más tarde.');

const session = (res: Response, u: User, status = 200) =>
  res.status(status).json({ token: signSession(u), user: toProfile(u) });

const aiLimit = rateLimit(20, 10 * 60_000, uid, 'Demasiadas recetas seguidas, respira un poco.');
const scanLimit = rateLimit(10, 10 * 60_000, uid, 'Demasiadas fotos seguidas. Espera un poco.');
const clampServings = (v: unknown, fallback: number) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 12 ? (v as number) : fallback);

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
  createdAt: m.createdAt.toISOString(),
  carbs: nutrientsOf(m).carbs,
  fat: nutrientsOf(m).fat,
  fiber: nutrientsOf(m).fiber,
  amounts: m.amounts?.length === m.ingredients.length ? m.amounts : amountsFor(m.ingredients, m.servings ?? 1),
  servings: m.servings ?? 1,
  favorite: m.favorite ?? false,
  rating: m.rating ?? 0
});

const cleanIds = (v: unknown) =>
  Array.isArray(v) ? [...new Set(v.filter(isValidIngredient))].slice(0, MAX_IN_POT) : [];
const cleanList = <T extends string>(v: unknown, ok: readonly T[]) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is T => ok.includes(x as T)))] : undefined;
const cleanName = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, 40) : '');
const ALLERGY_IDS = ALLERGIES.map((x) => x.id);
const ID_RE = /^[a-zA-Z0-9-]{16,64}$/;

// ── Rutas ────────────────────────────────────────────────────────
app.get('/api/health', a(async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
}));

// ── Cuentas ──────────────────────────────────────────────────────
app.post('/api/auth/register', registerLimit, a(async (req, res) => {
  const name = cleanName(req.body?.name);
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!name) return res.status(400).json({ error: 'Dinos cómo te llamas.' });
  if (!validEmail(email)) return res.status(400).json({ error: 'Ese email no parece un email.' });
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
    return res.status(400).json({ error: `La contraseña necesita al menos ${PASSWORD_MIN} caracteres.` });
  if (await prisma.user.findUnique({ where: { email } }))
    return res.status(409).json({ error: 'Ya hay una cuenta con ese email. Entra con ella.' });

  const passwordHash = await hashPassword(password);
  // Si este dispositivo ya cocinaba sin cuenta, esa racha pasa a la cuenta nueva.
  const deviceId = String(req.body?.deviceId || '');
  const anon = ID_RE.test(deviceId) ? await prisma.user.findUnique({ where: { id: deviceId } }) : null;
  try {
    const u =
      anon && !anon.passwordHash && !anon.email
        ? await prisma.user.update({ where: { id: anon.id }, data: { name, email, passwordHash } })
        : await prisma.user.create({ data: { name, email, passwordHash } });
    session(res, u, 201);
  } catch (e: any) {
    if (e?.code === 'P2002') return res.status(409).json({ error: 'Ya hay una cuenta con ese email. Entra con ella.' });
    throw e;
  }
}));

app.post('/api/auth/login', authLimit, a(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === 'string' ? req.body.password.slice(0, PASSWORD_MAX) : '';
  const u = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!(await checkPassword(u, password))) return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
  session(res, u!);
}));

app.post('/api/auth/logout-all', auth, a(async (req, res) => {
  const u = await prisma.user.update({ where: { id: uid(req) }, data: { tokenVersion: { increment: 1 } } });
  session(res, u);
}));

app.put('/api/me/password', auth, authLimit, a(async (req, res) => {
  const current = String(req.body?.current || '');
  const next = typeof req.body?.next === 'string' ? req.body.next : '';
  if (!(await checkPassword((req as Authed).user, current)))
    return res.status(403).json({ error: 'La contraseña actual no es correcta.' });
  if (next.length < PASSWORD_MIN || next.length > PASSWORD_MAX)
    return res.status(400).json({ error: `La nueva necesita al menos ${PASSWORD_MIN} caracteres.` });
  // Contraseña nueva: se cierran las demás sesiones y este dispositivo recibe una nueva.
  const u = await prisma.user.update({
    where: { id: uid(req) },
    data: { passwordHash: await hashPassword(next), tokenVersion: { increment: 1 } }
  });
  session(res, u);
}));

app.delete('/api/me', auth, authLimit, a(async (req, res) => {
  if (!(await checkPassword((req as Authed).user, String(req.body?.password || ''))))
    return res.status(403).json({ error: 'La contraseña no es correcta.' });
  await prisma.user.delete({ where: { id: uid(req) } });
  res.status(204).end();
}));

// ── Perfil ───────────────────────────────────────────────────────
app.get('/api/me', auth, (req, res) => {
  res.json(toProfile((req as Authed).user));
});

app.put('/api/me', auth, a(async (req, res) => {
  const b = req.body || {};
  const ids = (v: unknown) => (Array.isArray(v) ? [...new Set<string>(v.filter(isValidIngredient))] : undefined);
  const dislikes = ids(b.dislikes);
  const pantry = ids(b.pantry);
  const allergies = cleanList(b.allergies, ALLERGY_IDS);
  const slots = cleanList(b.slots, SLOTS);
  const name = cleanName(b.name);
  const servings = Number.isInteger(b.servings) && b.servings >= 1 && b.servings <= 12 ? b.servings : undefined;
  const waterGoal = Number.isInteger(b.waterGoal) && b.waterGoal >= 4 && b.waterGoal <= 16 ? b.waterGoal : undefined;
  const kcalGoal = Number.isInteger(b.kcalGoal) && b.kcalGoal >= 1000 && b.kcalGoal <= 4500 ? b.kcalGoal : undefined;
  const proteinGoal = Number.isInteger(b.proteinGoal) && b.proteinGoal >= 30 && b.proteinGoal <= 250 ? b.proteinGoal : undefined;
  const u = await prisma.user.update({
    where: { id: uid(req) },
    data: {
      ...(dislikes ? { dislikes } : {}),
      ...(pantry ? { pantry } : {}),
      ...(allergies ? { allergies } : {}),
      ...(slots && slots.length ? { slots } : {}),
      ...(name ? { name } : {}),
      ...(servings ? { servings } : {}),
      ...(waterGoal ? { waterGoal } : {}),
      ...(kcalGoal ? { kcalGoal } : {}),
      ...(proteinGoal ? { proteinGoal } : {}),
      ...(b.reminders && typeof b.reminders === 'object' ? { reminders: readReminders(b.reminders) as object } : {}),
      ...(isGoal(b.goal) ? { goal: b.goal } : {}),
      ...(isSkill(b.skill) ? { skill: b.skill } : {}),
      ...(typeof b.onboarded === 'boolean' ? { onboarded: b.onboarded } : {})
    }
  });
  res.json(toProfile(u));
}));

/** Días cocinados, racha y agua: lo que necesitan Hoy, Racha y los logros. */
async function history(userId: string) {
  const [meals, water] = await Promise.all([
    prisma.meal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 2000 }),
    prisma.waterLog.findMany({ where: { userId } })
  ]);
  const today = dayKey(new Date());
  const counts = new Map<string, number>();
  for (const m of meals) counts.set(dayKey(m.createdAt), (counts.get(dayKey(m.createdAt)) || 0) + 1);
  const info = streakInfo(new Set(counts.keys()), today);
  return { meals, water: new Map(water.map((w) => [w.day, w.glasses])), today, counts, info };
}

app.get('/api/today', auth, a(async (req, res) => {
  const user = (req as Authed).user;
  const { meals, water, today, counts, info } = await history(user.id);
  const todays = meals.filter((m) => dayKey(m.createdAt) === today);
  const plan = readPlan(user.plan);
  res.json({
    date: today,
    challenge: challengeFor(today, user.dislikes),
    streak: info.streak,
    best: info.best,
    total: meals.length,
    week: weekOf(today, counts, info.frozen),
    meals: todays.map(toMeal),
    water: water.get(today) ?? 0,
    totals: todays.reduce(
      (t, m) => {
        const n = nutrientsOf(m);
        return { kcal: t.kcal + n.kcal, protein: t.protein + n.protein, carbs: t.carbs + n.carbs, fat: t.fat + n.fat, fiber: t.fiber + n.fiber };
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    ),
    freezes: info.freezes,
    plan: (plan?.items ?? [])
      .filter((i) => i.date === today)
      .map((i) => ({ ...i, done: todays.some((m) => m.slot === i.slot) }))
  });
}));

app.get('/api/summary', auth, a(async (req, res) => {
  const { meals, water, today } = await history(uid(req));
  res.json(summaryOf(meals, water, today));
}));

app.get('/api/achievements', auth, a(async (req, res) => {
  const user = (req as Authed).user;
  const { meals, water, today, info } = await history(user.id);
  res.json(achievementsOf({ meals, water, waterGoal: user.waterGoal, best: info.best, dislikes: user.dislikes, today }));
}));

app.post('/api/water', auth, a(async (req, res) => {
  const delta = Math.max(-1, Math.min(1, Math.round(Number(req.body?.delta) || 0)));
  const day = dayKey(new Date());
  const cur = await prisma.waterLog.findUnique({ where: { userId_day: { userId: uid(req), day } } });
  const glasses = Math.max(0, Math.min(30, (cur?.glasses ?? 0) + delta));
  await prisma.waterLog.upsert({
    where: { userId_day: { userId: uid(req), day } },
    update: { glasses },
    create: { userId: uid(req), day, glasses }
  });
  res.json({ glasses });
}));

app.post('/api/recipe', auth, aiLimit, a(async (req, res) => {
  const ids = cleanIds(req.body?.ingredients);
  if (ids.length < 2) return res.status(400).json({ error: 'Mete al menos 2 ingredientes.' });
  const user = (req as Authed).user;
  const slot: Slot = SLOTS.includes(req.body?.slot) ? req.body.slot : slotForHour(localHour(new Date()));
  const servings = clampServings(req.body?.servings, user.servings);
  // Lo que ha valorado últimamente orienta a la IA
  const rated = await prisma.meal.findMany({
    where: { userId: user.id, rating: { not: 0 } },
    orderBy: { createdAt: 'desc' },
    take: 12,
    select: { title: true, rating: true }
  });
  const taste = { liked: rated.filter((m) => m.rating > 0).map((m) => m.title), disliked: rated.filter((m) => m.rating < 0).map((m) => m.title) };
  res.json(await makeRecipe(ids, toProfile(user), slot, servings, taste));
}));

app.post('/api/fridge/scan', auth, scanLimit, a(async (req, res) => {
  const m = String(req.body?.image || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return res.status(400).json({ error: 'Esa foto no se puede leer.' });
  if (!aiEnabled()) return res.status(503).json({ error: 'La IA no está activada en el servidor.' });
  try {
    res.json({ ids: await scanFridge(m[2], m[1]) });
  } catch (e) {
    console.warn('[ai] nevera', (e as Error)?.message?.slice(0, 120));
    res.status(502).json({ error: 'No he podido leer la foto. Prueba con más luz.' });
  }
}));

app.get('/api/meals', auth, a(async (req, res) => {
  const take = Math.min(100, Math.max(1, Number(req.query.limit) || 40));
  const meals = await prisma.meal.findMany({
    where: { userId: uid(req), ...(req.query.favorites === '1' ? { favorite: true } : {}) },
    orderBy: { createdAt: 'desc' },
    take
  });
  res.json(meals.map(toMeal));
}));

app.post('/api/meals', auth, a(async (req, res) => {
  const b = req.body || {};
  const ids = cleanIds(b.ingredients);
  const strs = (v: unknown, max: number, n: number) =>
    Array.isArray(v) ? v.filter((s: unknown) => typeof s === 'string').map((s: string) => s.slice(0, max)).slice(0, n) : [];
  const steps = strs(b.steps, 200, 8);
  if (typeof b.title !== 'string' || !b.title.trim() || ids.length === 0)
    return res.status(400).json({ error: 'Plato incompleto' });
  const int = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
  const servings = clampServings(b.servings, 1);
  const m = await prisma.meal.create({
    data: {
      userId: uid(req),
      title: b.title.trim().slice(0, 80),
      tagline: String(b.tagline || '').slice(0, 120),
      tip: String(b.tip || '').slice(0, 200),
      steps,
      ingredients: ids,
      amounts: strs(b.amounts, 30, ids.length).length === ids.length ? strs(b.amounts, 30, ids.length) : amountsFor(ids, servings),
      servings,
      kcal: int(b.kcal, 5000),
      protein: int(b.protein, 500),
      minutes: int(b.minutes, 300),
      carbs: int(b.carbs, 1000),
      fat: int(b.fat, 1000),
      fiber: int(b.fiber, 200),
      source: b.source === 'ia' ? 'ia' : 'local',
      favorite: b.favorite === true,
      slot: SLOTS.includes(b.slot) ? b.slot : slotForHour(localHour(new Date()))
    }
  });
  res.status(201).json(toMeal(m));
}));

app.patch('/api/meals/:id', auth, a(async (req, res) => {
  const b = req.body || {};
  const data = {
    ...(typeof b.favorite === 'boolean' ? { favorite: b.favorite } : {}),
    ...([-1, 0, 1].includes(b.rating) ? { rating: b.rating } : {})
  };
  const { count } = await prisma.meal.updateMany({ where: { id: req.params.id, userId: uid(req) }, data });
  if (!count) return res.status(404).json({ error: 'Ese plato no existe.' });
  res.json(toMeal(await prisma.meal.findUniqueOrThrow({ where: { id: req.params.id } })));
}));

app.delete('/api/meals/:id', auth, a(async (req, res) => {
  await prisma.meal.deleteMany({ where: { id: req.params.id, userId: uid(req) } });
  res.status(204).end();
}));

// ── Plan de la semana y lista de la compra ───────────────────────
app.get('/api/plan', auth, a(async (req, res) => {
  const user = (req as Authed).user;
  const today = dayKey(new Date());
  let plan = readPlan(user.plan);
  // Semana nueva: plan nuevo
  if (!plan || plan.weekStart !== mondayOf(today)) {
    plan = generatePlan(toProfile(user), today);
    await prisma.user.update({ where: { id: user.id }, data: { plan: plan as object } });
  }
  const weekMeals = await prisma.meal.findMany({ where: { userId: user.id, createdAt: { gte: new Date(`${plan.weekStart}T00:00:00Z`) } }, select: { slot: true, createdAt: true } });
  const done = new Set(weekMeals.map((m) => `${dayKey(m.createdAt)}:${m.slot}`));
  res.json({ ...plan, items: plan.items.map((i) => ({ ...i, done: done.has(`${i.date}:${i.slot}`) })) });
}));

app.post('/api/plan/generate', auth, a(async (req, res) => {
  const user = (req as Authed).user;
  const plan = generatePlan(toProfile(user), dayKey(new Date()));
  await prisma.user.update({ where: { id: user.id }, data: { plan: plan as object } });
  res.json(plan);
}));

/** Cambia un plato concreto del plan por otro. */
app.post('/api/plan/swap', auth, a(async (req, res) => {
  const user = (req as Authed).user;
  const plan = readPlan(user.plan);
  const { date, slot } = req.body || {};
  if (!plan) return res.status(404).json({ error: 'No hay plan esta semana.' });
  const idx = plan.items.findIndex((i) => i.date === date && i.slot === slot);
  if (idx < 0) return res.status(404).json({ error: 'Ese hueco no está en el plan.' });
  const fresh = generatePlan({ ...toProfile(user), slots: [slot] }, dayKey(new Date()), Date.now() + idx);
  const replacement = fresh.items.find((i) => i.date === date) ?? fresh.items[0];
  if (replacement) plan.items[idx] = { ...replacement, date, slot };
  await prisma.user.update({ where: { id: user.id }, data: { plan: plan as object } });
  res.json(plan);
}));

app.get('/api/shopping', auth, a(async (req, res) => {
  res.json(cleanShopping((req as Authed).user.shopping));
}));

app.put('/api/shopping', auth, a(async (req, res) => {
  const items = cleanShopping(req.body?.items);
  await prisma.user.update({ where: { id: uid(req) }, data: { shopping: items as object[] } });
  res.json(items);
}));

app.post('/api/shopping/from-plan', auth, a(async (req, res) => {
  const user = (req as Authed).user;
  const today = dayKey(new Date());
  const plan = readPlan(user.plan) ?? generatePlan(toProfile(user), today);
  const items = shoppingFromPlan(plan, toProfile(user), today, cleanShopping(user.shopping));
  await prisma.user.update({ where: { id: user.id }, data: { shopping: items as object[], plan: plan as object } });
  res.json(items);
}));

// ── Recordatorios de la web (Web Push) ───────────────────────────
app.get('/api/push/key', (_req, res) => {
  res.json({ key: vapidPublicKey() });
});

app.post('/api/push/subscribe', auth, a(async (req, res) => {
  const s = req.body?.subscription;
  const endpoint = typeof s?.endpoint === 'string' && /^https:\/\//.test(s.endpoint) ? s.endpoint.slice(0, 1000) : '';
  const p256dh = typeof s?.keys?.p256dh === 'string' ? s.keys.p256dh.slice(0, 200) : '';
  const authKey = typeof s?.keys?.auth === 'string' ? s.keys.auth.slice(0, 100) : '';
  if (!endpoint || !p256dh || !authKey) return res.status(400).json({ error: 'Suscripción no válida.' });
  await prisma.pushSub.upsert({
    where: { endpoint },
    update: { userId: uid(req), p256dh, auth: authKey },
    create: { userId: uid(req), endpoint, p256dh, auth: authKey }
  });
  res.status(204).end();
}));

app.post('/api/push/unsubscribe', auth, a(async (req, res) => {
  const endpoint = String(req.body?.endpoint || '');
  await prisma.pushSub.deleteMany({ where: { endpoint, userId: uid(req) } });
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

initPush(prisma)
  .then(() => startReminders(prisma))
  .catch((e) => console.warn('[push] sin recordatorios web:', e?.message));

const server = app.listen(PORT, () => console.log(`PUCHERO escuchando en :${PORT}`));
const shutdown = () => server.close(() => prisma.$disconnect().finally(() => process.exit(0)));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
