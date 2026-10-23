import { api } from './api';

// Recordatorios en la web: Web Push con el service worker (/sw.js). Funciona con la web
// cerrada en Android y escritorio; en iPhone, solo si la web está instalada en la pantalla de inicio.

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function keyBytes(base64url: string) {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
}

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

/** Pide permiso y se suscribe. Devuelve un mensaje de error para el usuario, o null si va bien. */
export async function enablePush(): Promise<string | null> {
  if (!pushSupported()) return 'Este navegador no admite avisos. En iPhone, añade PUCHERO a la pantalla de inicio.';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'Sin permiso para avisarte. Actívalo en los ajustes del navegador.';
  const reg = (await registerSW()) ?? (await navigator.serviceWorker.ready);
  const { key } = await api.pushKey();
  if (!key) return 'El servidor no tiene los avisos listos todavía.';
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
  await api.pushSubscribe(sub.toJSON());
  return null;
}

export async function disablePush() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await api.pushUnsubscribe(sub.endpoint).catch(() => undefined);
  await sub.unsubscribe().catch(() => undefined);
}
