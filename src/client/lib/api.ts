import { localRecipe } from '../../shared/recipe';
import {
  slotForHour,
  type Achievement,
  type Meal,
  type Plan,
  type Profile,
  type Recipe,
  type Session,
  type ShoppingItem,
  type Slot,
  type Summary,
  type TodayData
} from '../../shared/types';

declare const __API_BASE__: string;
/** Vacío en la web (mismo origen). La app Android se compila apuntando a puchero.xyoncloud.win. */
const BASE = typeof __API_BASE__ === 'string' ? __API_BASE__ : '';

const TOKEN_KEY = 'puchero.token';
const DEVICE_KEY = 'puchero.device';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* almacenamiento bloqueado: la sesión dura lo que la pestaña */
  }
}

let token = read(TOKEN_KEY);
const listeners = new Set<() => void>();

export const auth = {
  get token() {
    return token;
  },
  set(t: string | null) {
    token = t;
    write(TOKEN_KEY, t);
  },
  /** Avisa a la app cuando el servidor da la sesión por caducada. */
  onExpired(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
};

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {})
    }
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 && token && !path.startsWith('/api/auth/')) {
      auth.set(null);
      listeners.forEach((fn) => fn());
    }
    throw new Error(body.error || `Error ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

async function startSession(p: Promise<Session>): Promise<Profile> {
  const s = await p;
  auth.set(s.token);
  return s.user;
}

export const api = {
  register: (name: string, email: string, password: string) =>
    // Si este navegador ya cocinaba sin cuenta, el servidor le pasa la racha a la cuenta nueva.
    startSession(req<Session>('/api/auth/register', json('POST', { name, email, password, deviceId: read(DEVICE_KEY) }))),
  login: (email: string, password: string) => startSession(req<Session>('/api/auth/login', json('POST', { email, password }))),
  logoutAll: () => startSession(req<Session>('/api/auth/logout-all', { method: 'POST' })),
  changePassword: (current: string, next: string) => startSession(req<Session>('/api/me/password', json('PUT', { current, next }))),
  deleteAccount: (password: string) => req<void>('/api/me', json('DELETE', { password })),
  me: () => req<Profile>('/api/me'),
  saveMe: (p: Partial<Profile>) => req<Profile>('/api/me', json('PUT', p)),
  today: () => req<TodayData>('/api/today'),
  meals: (limit = 40, favorites = false) => req<Meal[]>(`/api/meals?limit=${limit}${favorites ? '&favorites=1' : ''}`),
  updateMeal: (id: string, patch: { favorite?: boolean; rating?: number }) =>
    req<Meal>(`/api/meals/${encodeURIComponent(id)}`, json('PATCH', patch)),
  water: (delta: number) => req<{ glasses: number }>('/api/water', json('POST', { delta })),
  summary: () => req<Summary>('/api/summary'),
  achievements: () => req<Achievement[]>('/api/achievements'),
  plan: () => req<Plan>('/api/plan'),
  newPlan: () => req<Plan>('/api/plan/generate', { method: 'POST' }),
  swapPlan: (date: string, slot: Slot) => req<Plan>('/api/plan/swap', json('POST', { date, slot })),
  shopping: () => req<ShoppingItem[]>('/api/shopping'),
  saveShopping: (items: ShoppingItem[]) => req<ShoppingItem[]>('/api/shopping', json('PUT', { items })),
  shoppingFromPlan: () => req<ShoppingItem[]>('/api/shopping/from-plan', { method: 'POST' }),
  scanFridge: (image: string) => req<{ ids: string[] }>('/api/fridge/scan', json('POST', { image })),
  pushKey: () => req<{ key: string }>('/api/push/key'),
  pushSubscribe: (subscription: PushSubscriptionJSON) => req<void>('/api/push/subscribe', json('POST', { subscription })),
  pushUnsubscribe: (endpoint: string) => req<void>('/api/push/unsubscribe', json('POST', { endpoint })),
  deleteMeal: (id: string) => req<void>(`/api/meals/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  async recipe(ingredients: string[], dislikes: string[], slot: Slot, servings: number): Promise<Recipe> {
    try {
      return await req<Recipe>('/api/recipe', json('POST', { ingredients, slot, servings }));
    } catch {
      // Sin conexión o servidor caído: la cocina sigue funcionando en local.
      return localRecipe(ingredients, dislikes, servings);
    }
  },
  saveMeal: (r: Recipe, slot: Slot = slotForHour(new Date().getHours()), favorite = false) =>
    req<Meal>('/api/meals', json('POST', { ...r, slot, favorite }))
};
