export type Slot = 'desayuno' | 'comida' | 'merienda' | 'cena';

export const SLOTS: Slot[] = ['desayuno', 'comida', 'merienda', 'cena'];

export interface Recipe {
  title: string;
  tagline: string;
  /** Truco para camuflar lo que no te gusta */
  tip: string;
  steps: string[];
  ingredients: string[];
  kcal: number;
  protein: number;
  minutes: number;
  source: 'ia' | 'local';
}

export interface Meal extends Recipe {
  id: string;
  slot: Slot;
  createdAt: string;
}

export type Skill = 'cero' | 'apano' | 'chef';

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
}

export interface TodayData {
  date: string;
  challenge: string;
  streak: number;
  best: number;
  total: number;
  week: DayStatus[];
  meals: Meal[];
}

export function slotForHour(h: number): Slot {
  if (h < 11) return 'desayuno';
  if (h < 16) return 'comida';
  if (h < 20) return 'merienda';
  return 'cena';
}
