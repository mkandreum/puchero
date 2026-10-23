export type Slot = 'desayuno' | 'comida' | 'merienda' | 'cena';

export const SLOTS: Slot[] = ['desayuno', 'comida', 'merienda', 'cena'];

export const SLOT_LABEL: Record<Slot, string> = {
  desayuno: 'Desayuno',
  comida: 'Comida',
  merienda: 'Merienda',
  cena: 'Cena'
};

export interface Recipe {
  title: string;
  tagline: string;
  /** Truco para camuflar lo que no te gusta */
  tip: string;
  steps: string[];
  ingredients: string[];
  /** Cantidad de cada ingrediente (mismo orden que ingredients) para `servings` personas */
  amounts: string[];
  servings: number;
  kcal: number;
  protein: number;
  minutes: number;
  source: 'ia' | 'local';
}

export interface Meal extends Recipe {
  id: string;
  slot: Slot;
  createdAt: string;
  favorite: boolean;
  /** 1 me gustó, -1 no me gustó, 0 sin valorar */
  rating: number;
}

export type Skill = 'cero' | 'apano' | 'chef';

export interface Reminders {
  enabled: boolean;
  /** Hora "HH:MM" de cada comida */
  times: Record<Slot, string>;
}

export const DEFAULT_REMINDERS: Reminders = {
  enabled: false,
  times: { desayuno: '08:30', comida: '14:00', merienda: '17:30', cena: '21:00' }
};

export interface Profile {
  name: string;
  email: string;
  dislikes: string[];
  allergies: string[];
  goal: Goal;
  skill: Skill;
  /** Comidas que quiere resolver con PUCHERO */
  slots: Slot[];
  onboarded: boolean;
  /** Lo que hay en casa ("Mi nevera") */
  pantry: string[];
  /** Personas para las que cocina normalmente */
  servings: number;
  reminders: Reminders;
  /** Vasos de agua al día */
  waterGoal: number;
}

export interface Session {
  token: string;
  user: Profile;
}

export type Goal = 'verde' | 'proteina' | 'rapido';

export interface DayStatus {
  date: string;
  letter: string;
  count: number;
  isToday: boolean;
  isFuture: boolean;
  /** Día salvado con el comodín */
  frozen: boolean;
}

export interface TodayData {
  date: string;
  challenge: string;
  streak: number;
  best: number;
  total: number;
  week: DayStatus[];
  meals: Meal[];
  water: number;
  /** Comodines que quedan esta semana (salvan un día sin cocinar) */
  freezes: number;
  /** Lo planificado para hoy */
  plan: PlanItem[];
}

export interface PlanItem {
  date: string;
  slot: Slot;
  title: string;
  ingredients: string[];
  done?: boolean;
}

export interface Plan {
  weekStart: string;
  items: PlanItem[];
}

export interface ShoppingItem {
  id: string;
  /** Texto libre si no es un alimento del catálogo */
  label?: string;
  amount?: string;
  done: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  text: string;
  /** ilustración (id de alimento) */
  img: string;
  unlocked: boolean;
  /** Progreso 0..1 hacia el logro */
  progress: number;
}

export interface DaySummary {
  date: string;
  letter: string;
  kcal: number;
  protein: number;
  meals: number;
  water: number;
}

export interface Summary {
  days: DaySummary[];
  /** Alimentos distintos de la semana */
  foods: string[];
  /** Colores de la semana (verde, rojo...) */
  colors: string[];
  greens: number;
  kcalAvg: number;
  proteinAvg: number;
  waterAvg: number;
  bySlot: Record<Slot, number>;
  topFoods: { id: string; count: number }[];
}

export function slotForHour(h: number): Slot {
  if (h < 11) return 'desayuno';
  if (h < 16) return 'comida';
  if (h < 20) return 'merienda';
  return 'cena';
}

/** Minutos de un paso de receta ("cuece 9 min", "unos 25 minutos"), para el temporizador. */
export function stepMinutes(step: string): number | null {
  const m = step.match(/(\d+(?:[.,]\d+)?)\s*(?:min\b|mins\b|minutos?\b|')/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  return n > 0 && n <= 240 ? n : null;
}
