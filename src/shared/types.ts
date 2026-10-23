export type Slot = 'desayuno' | 'comida' | 'cena';

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

export interface Profile {
  dislikes: string[];
  goal: Goal;
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
  if (h < 12) return 'desayuno';
  if (h < 18) return 'comida';
  return 'cena';
}
