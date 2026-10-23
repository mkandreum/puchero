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

export const mondayOf = (key: string) => addDays(key, -((noon(key).getUTCDay() + 6) % 7));
export { addDays };

export interface StreakInfo {
  streak: number;
  best: number;
  /** Días sin cocinar salvados con el comodín */
  frozen: Set<string>;
  /** Comodín disponible esta semana (0 o 1) */
  freezes: number;
}

/**
 * Racha con comodín: cada semana (lunes a domingo) hay un comodín que salva UN día suelto sin
 * cocinar entre dos días cocinados. El día salvado no suma, pero no rompe la racha.
 */
export function streakInfo(keys: Set<string>, today: string): StreakInfo {
  const sorted = [...keys].sort();
  const frozen = new Set<string>();
  const usedWeeks = new Set<string>();
  let best = 0;
  let run = 0;
  if (sorted.length) {
    // Pasada hacia delante: rachas históricas (para la mejor racha y los comodines usados)
    let day = sorted[0];
    while (day <= today) {
      if (keys.has(day)) {
        run += 1;
        best = Math.max(best, run);
      } else if (day < today) {
        const wk = mondayOf(day);
        const next = addDays(day, 1);
        if (run > 0 && !usedWeeks.has(wk) && keys.has(next)) {
          usedWeeks.add(wk);
          frozen.add(day);
        } else {
          run = 0;
        }
      }
      day = addDays(day, 1);
    }
  }
  // Racha actual: si hoy aún no has cocinado, cuenta hasta ayer
  const streak = keys.has(today) || keys.has(addDays(today, -1)) || frozen.has(addDays(today, -1)) ? run : 0;
  return { streak, best, frozen, freezes: usedWeeks.has(mondayOf(today)) ? 0 : 1 };
}

export const LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function weekOf(today: string, counts: Map<string, number>, frozen: Set<string> = new Set()): DayStatus[] {
  const dow = (noon(today).getUTCDay() + 6) % 7; // 0 = lunes
  const monday = addDays(today, -dow);
  return LETTERS.map((letter, i) => {
    const date = addDays(monday, i);
    return { date, letter, count: counts.get(date) ?? 0, isToday: date === today, isFuture: date > today, frozen: frozen.has(date) };
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
