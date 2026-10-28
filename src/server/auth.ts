// Sesiones con el mismo patrón que XyonWork: contraseña con bcrypt (coste 12), JWT HS256 con
// tokenVersion para revocar sesiones y respuestas de error que no delatan qué emails existen.
// La web y la app Android envían el token como "Authorization: Bearer".
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import type { PrismaClient, User } from '@prisma/client';
import { DEFAULT_REMINDERS, SLOTS, type Goal, type Profile, type Reminders, type Skill, type Slot } from '../shared/types';

const SESSION_SECONDS = 60 * 24 * 60 * 60; // 60 días: es una app de cocina, no un banco
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const secret = (() => {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 32) return s;
  // Sin JWT_SECRET no tumbamos el despliegue: derivamos uno estable de DATABASE_URL (lleva la
  // contraseña de Postgres, que no sale del servidor). Mejor configurar JWT_SECRET en Coolify.
  console.warn('[auth] JWT_SECRET ausente o corto: usando uno derivado de DATABASE_URL. Configura JWT_SECRET (openssl rand -base64 64).');
  return crypto.createHmac('sha256', process.env.DATABASE_URL || 'puchero-dev').update('puchero:jwt').digest('base64');
})();

// Hash ficticio para que el login tarde lo mismo exista o no el email.
const DUMMY_HASH = bcrypt.hashSync('puchero-dummy-password', 12);

export const normalizeEmail = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase().slice(0, 254) : '');
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
export const hashPassword = (p: string) => bcrypt.hash(p, 12);

export async function checkPassword(user: User | null, password: string) {
  const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  return Boolean(user?.passwordHash) && ok;
}

export const signSession = (u: Pick<User, 'id' | 'tokenVersion'>) =>
  jwt.sign({ sub: u.id, tv: u.tokenVersion }, secret, { expiresIn: SESSION_SECONDS, algorithm: 'HS256' });

const GOALS: Goal[] = ['verde', 'proteina', 'rapido'];
const SKILLS: Skill[] = ['cero', 'apano', 'chef'];

export function toProfile(u: User): Profile {
  return {
    name: u.name,
    email: u.email ?? '',
    dislikes: u.dislikes,
    allergies: u.allergies,
    goal: GOALS.includes(u.goal as Goal) ? (u.goal as Goal) : 'verde',
    skill: SKILLS.includes(u.skill as Skill) ? (u.skill as Skill) : 'apano',
    slots: u.slots.filter((s): s is Slot => SLOTS.includes(s as Slot)),
    onboarded: u.onboarded,
    pantry: u.pantry,
    servings: u.servings,
    reminders: readReminders(u.reminders),
    waterGoal: u.waterGoal,
    kcalGoal: u.kcalGoal,
    proteinGoal: u.proteinGoal
  };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Recordatorios guardados (JSON) con valores por defecto para lo que falte o venga mal. */
export function readReminders(v: unknown): Reminders {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<Reminders>;
  const times = { ...DEFAULT_REMINDERS.times };
  for (const s of SLOTS) {
    const t = (o.times as Record<string, unknown> | undefined)?.[s];
    if (typeof t === 'string' && TIME_RE.test(t)) times[s] = t;
  }
  return { enabled: o.enabled === true, times };
}

export const isGoal = (v: unknown): v is Goal => GOALS.includes(v as Goal);
export const isSkill = (v: unknown): v is Skill => SKILLS.includes(v as Skill);

export type Authed = Request & { user: User };

/** Verifica el JWT y recarga el usuario: una cuenta borrada o una sesión revocada dejan de valer al instante. */
export const requireAuth =
  (prisma: PrismaClient) => async (req: Request, res: Response, next: NextFunction) => {
    const [kind, token] = String(req.header('authorization') || '').split(' ');
    if (!/^Bearer$/i.test(kind) || !token) return res.status(401).json({ error: 'Inicia sesión para seguir.', code: 'NO_TOKEN' });
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    } catch {
      return res.status(401).json({ error: 'Tu sesión ha caducado. Vuelve a entrar.', code: 'INVALID_TOKEN' });
    }
    try {
      const user = await prisma.user.findUnique({ where: { id: String(payload.sub) } });
      if (!user || !user.passwordHash || (payload.tv ?? 0) !== user.tokenVersion)
        return res.status(401).json({ error: 'Tu sesión ha caducado. Vuelve a entrar.', code: 'SESSION_REVOKED' });
      (req as Authed).user = user;
      next();
    } catch (e) {
      next(e);
    }
  };

/** Límite por clave en ventana deslizante (memoria del proceso; suficiente para una sola instancia). */
export function rateLimit(max: number, windowMs: number, keyOf: (req: Request) => string, msg: string) {
  const hits = new Map<string, number[]>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyOf(req);
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) return res.status(429).json({ error: msg });
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 10_000) hits.clear();
    next();
  };
}
