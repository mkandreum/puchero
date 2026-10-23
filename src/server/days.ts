import { BY_ID } from '../shared/ingredients';
import type { DayStatus } from '../shared/types';

export const TZ = process.env.APP_TZ || 'Europe/Madrid';

const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false });

/** YYYY-MM-DD en la zona horaria de la app */
export const dayKey = (d: Date) => fmt.format(d);
export const localHour = (d: Date) => Number(hourFmt.format(d)) % 24;

const noon = (key: string) => new Date(`${key}T12:00:00Z`);
const addDays = (key: string, n: number) => {
  const d = noon(key);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function streakFrom(keys: Set<string>, today: string): number {
  let cur = keys.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (keys.has(cur)) {
    n += 1;
    cur = addDays(cur, -1);
  }
  return n;
}

export function bestStreak(keys: Set<string>): number {
  const sorted = [...keys].sort();
  let best = 0;
  let run = 0;
  let prev = '';
  for (const k of sorted) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

const LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function weekOf(today: string, counts: Map<string, number>): DayStatus[] {
  const dow = (noon(today).getUTCDay() + 6) % 7; // 0 = lunes
  const monday = addDays(today, -dow);
  return LETTERS.map((letter, i) => {
    const date = addDays(monday, i);
    return { date, letter, count: counts.get(date) ?? 0, isToday: date === today, isFuture: date > today };
  });
}

const PLAIN = [
  'Mete algo verde en cada comida de hoy.',
  'Cocina con tres colores distintos en la cazuela.',
  'Hoy, cero ultraprocesados. Tú puedes.',
  'Prueba un ingrediente que nunca compras.',
  'Cena ligera: verdura + proteína, sin pan.',
  'Haz doble ración y guarda la mitad para mañana.',
  'Un plato con legumbre hoy. Sin excusas.'
];
const WITH_HATED = [
  'Cuela {x} en algo que ya te encanta.',
  'Tritura {x} en una salsa. Nadie se entera.',
  '{x} gratinado: con queso todo entra mejor.',
  'Dale una oportunidad a {x}, picado muy fino.'
];

export function challengeFor(today: string, dislikes: string[]): string {
  const idx = Math.floor(noon(today).getTime() / 86_400_000);
  const hated = dislikes.filter((id) => BY_ID[id]);
  if (hated.length && idx % 2 === 0) {
    const name = BY_ID[hated[idx % hated.length]].name.toLowerCase();
    const t = WITH_HATED[idx % WITH_HATED.length].replace('{x}', name);
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return PLAIN[idx % PLAIN.length];
}
