// Recordatorios de la web con Web Push: cada minuto mira qué usuarios tienen aviso a esa hora
// (en APP_TZ) para una comida que aún no han cocinado hoy, y se lo manda a sus navegadores.
// La app Android programa sus propios avisos en el móvil, no usa esto.
import webpush from 'web-push';
import type { PrismaClient } from '@prisma/client';
import { SLOT_LABEL, SLOTS, type Slot } from '../shared/types';
import { readReminders } from './auth';
import { dayKey, TZ } from './days';

let publicKey = '';

async function setting(prisma: PrismaClient, key: string) {
  return (await prisma.setting.findUnique({ where: { key } }))?.value;
}

/** Claves VAPID del entorno o, si no hay, generadas una vez y guardadas en la base de datos. */
export async function initPush(prisma: PrismaClient) {
  let pub = process.env.VAPID_PUBLIC_KEY || (await setting(prisma, 'vapid.public'));
  let priv = process.env.VAPID_PRIVATE_KEY || (await setting(prisma, 'vapid.private'));
  if (!pub || !priv) {
    const keys = webpush.generateVAPIDKeys();
    pub = keys.publicKey;
    priv = keys.privateKey;
    await prisma.setting.createMany({
      data: [
        { key: 'vapid.public', value: pub },
        { key: 'vapid.private', value: priv }
      ],
      skipDuplicates: true
    });
    // Si otra instancia se adelantó, usamos las suyas
    pub = (await setting(prisma, 'vapid.public')) ?? pub;
    priv = (await setting(prisma, 'vapid.private')) ?? priv;
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:hola@puchero.app', pub, priv);
  publicKey = pub;
}

export const vapidPublicKey = () => publicKey;

const hhmm = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });

const MESSAGES: Record<Slot, string[]> = {
  desayuno: ['¿Qué desayunas hoy? Avena, fruta… tú eliges.', 'Buenos días. La cazuela del desayuno te espera.'],
  comida: ['Hora de comer. Tres ingredientes y a remover.', '¿Comemos? La cazuela ya está en el fuego.'],
  merienda: ['Merienda rica y sin culpa: fruta, yogur, frutos secos…', 'Media tarde: algo pequeño y bueno.'],
  cena: ['Cena ligera y en marcha. ¿Qué metemos en la cazuela?', 'Última del día: que sea fácil y rica.']
};

async function tick(prisma: PrismaClient) {
  if (!publicKey) return;
  const now = new Date();
  const time = hhmm.format(now);
  const today = dayKey(now);
  const subs = await prisma.pushSub.findMany({ include: { user: { select: { reminders: true, slots: true } } } });
  for (const sub of subs) {
    const r = readReminders(sub.user.reminders);
    if (!r.enabled) continue;
    const slot = SLOTS.find((s) => r.times[s] === time && sub.user.slots.includes(s));
    if (!slot) continue;
    const tag = `${today}:${slot}`;
    if (sub.lastSent === tag) continue;
    // Si ya ha cocinado esa comida hoy, no molestamos
    const last = await prisma.meal.findFirst({ where: { userId: sub.userId, slot }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
    if (last && dayKey(last.createdAt) === today) continue;
    const list = MESSAGES[slot];
    const body = list[now.getDate() % list.length];
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: `${SLOT_LABEL[slot]} · PUCHERO`, body, url: `/#cocina`, slot }),
        { TTL: 3600 }
      );
      await prisma.pushSub.update({ where: { id: sub.id }, data: { lastSent: tag } });
    } catch (e: any) {
      // 404/410: la suscripción ya no existe en el navegador
      if (e?.statusCode === 404 || e?.statusCode === 410) await prisma.pushSub.delete({ where: { id: sub.id } }).catch(() => undefined);
      else console.warn('[push]', e?.statusCode || e?.message);
    }
  }
}

export function startReminders(prisma: PrismaClient) {
  const run = () => tick(prisma).catch((e) => console.warn('[push] tick', e?.message));
  // Alineado al inicio de cada minuto
  setTimeout(() => {
    run();
    setInterval(run, 60_000).unref();
  }, 60_000 - (Date.now() % 60_000)).unref();
}
