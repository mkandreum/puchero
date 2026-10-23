import { localRecipe } from '../../shared/recipe';
import { slotForHour, type Meal, type Profile, type Recipe, type Slot, type TodayData } from '../../shared/types';

const KEY = 'puchero.device';

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

function deviceId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = makeId();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return (window as any).__pucheroId ??= makeId();
  }
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', 'x-device-id': deviceId(), ...(init.headers || {}) }
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Error ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  me: () => req<Profile>('/api/me'),
  saveMe: (p: Partial<Profile>) => req<Profile>('/api/me', { method: 'PUT', body: JSON.stringify(p) }),
  today: () => req<TodayData>('/api/today'),
  meals: (limit = 40) => req<Meal[]>(`/api/meals?limit=${limit}`),
  deleteMeal: (id: string) => req<void>(`/api/meals/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  async recipe(ingredients: string[], dislikes: string[]): Promise<Recipe> {
    try {
      return await req<Recipe>('/api/recipe', { method: 'POST', body: JSON.stringify({ ingredients }) });
    } catch {
      // Sin conexión o servidor caído: la cocina sigue funcionando en local.
      return localRecipe(ingredients, dislikes);
    }
  },
  saveMeal: (r: Recipe, slot: Slot = slotForHour(new Date().getHours())) =>
    req<Meal>('/api/meals', { method: 'POST', body: JSON.stringify({ ...r, slot }) })
};
