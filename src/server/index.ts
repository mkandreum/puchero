import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { PrismaClient, type User } from '@prisma/client';
import { ALLERGIES, isValidIngredient, MAX_IN_POT } from '../shared/ingredients';
import { slotForHour, SLOTS, type Meal, type Slot } from '../shared/types';
import { makeRecipe } from './ai';
import {
  checkPassword, hashPassword, isGoal, isSkill, normalizeEmail, PASSWORD_MAX, PASSWORD_MIN, rateLimit,
  requireAuth, signSession, toProfile, validEmail, type Authed
} from './auth';
import { bestStreak, challengeFor, dayKey, localHour, streakFrom, weekOf } from './days';

const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.resolve('dist/public');

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
  const dislikes = Array.isArray(b.dislikes) ? [...new Set<string>(b.dislikes.filter(isValidIngredient))] : undefined;
  const allergies = cleanList(b.allergies, ALLERGY_IDS);
  const slots = cleanList(b.slots, SLOTS);
  const name = cleanName(b.name);
  const u = await prisma.user.update({
    where: { id: uid(req) },
    data: {
      ...(dislikes ? { dislikes } : {}),
      ...(allergies ? { allergies } : {}),
      ...(slots && slots.length ? { slots } : {}),
      ...(name ? { name } : {}),
      ...(isGoal(b.goal) ? { goal: b.goal } : {}),
      ...(isSkill(b.skill) ? { skill: b.skill } : {}),
      ...(typeof b.onboarded === 'boolean' ? { onboarded: b.onboarded } : {})
    }
  });
  res.json(toProfile(u));
}));

app.get('/api/today', auth, a(async (req, res) => {
  const user = (req as Authed).user;
  const now = new Date();
  const today = dayKey(now);
  const all = await prisma.meal.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 1000 });
  const counts = new Map<string, number>();
  for (const m of all) {
    const k = dayKey(m.createdAt);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const keys = new Set(counts.keys());
  res.json({
    date: today,
    challenge: challengeFor(today, user.dislikes),
    streak: streakFrom(keys, today),
    best: bestStreak(keys),
    total: all.length,
    week: weekOf(today, counts),
    meals: all.filter((m) => dayKey(m.createdAt) === today).map(toMeal)
  });
}));

app.post('/api/recipe', auth, aiLimit, a(async (req, res) => {
  const ids = cleanIds(req.body?.ingredients);
  if (ids.length < 2) return res.status(400).json({ error: 'Mete al menos 2 ingredientes.' });
  const slot: Slot = SLOTS.includes(req.body?.slot) ? req.body.slot : slotForHour(localHour(new Date()));
  res.json(await makeRecipe(ids, toProfile((req as Authed).user), slot));
}));

app.get('/api/meals', auth, a(async (req, res) => {
  const take = Math.min(100, Math.max(1, Number(req.query.limit) || 40));
  const meals = await prisma.meal.findMany({
    where: { userId: uid(req) },
    orderBy: { createdAt: 'desc' },
    take
  });
  res.json(meals.map(toMeal));
}));

app.post('/api/meals', auth, a(async (req, res) => {
  const b = req.body || {};
  const ids = cleanIds(b.ingredients);
  const steps = Array.isArray(b.steps) ? b.steps.filter((s: unknown) => typeof s === 'string').map((s: string) => s.slice(0, 200)).slice(0, 8) : [];
  if (typeof b.title !== 'string' || !b.title.trim() || ids.length === 0)
    return res.status(400).json({ error: 'Plato incompleto' });
  const int = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
  const m = await prisma.meal.create({
    data: {
      userId: uid(req),
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

app.delete('/api/meals/:id', auth, a(async (req, res) => {
  await prisma.meal.deleteMany({ where: { id: req.params.id, userId: uid(req) } });
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
