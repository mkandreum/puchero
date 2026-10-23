// Vibración: Android vía navigator.vibrate; iPhone (iOS 18+) vía el truco del
// <input type="checkbox" switch>, que dispara un "tic" háptico del sistema al conmutarse.
let iosLabel: HTMLLabelElement | null = null;
const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
const isIOS = typeof navigator !== 'undefined' && /iP(hone|ad|od)/.test(navigator.userAgent);

function iosTick() {
  if (!iosLabel) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.id = 'haptic-switch';
    iosLabel = document.createElement('label');
    iosLabel.htmlFor = input.id;
    iosLabel.setAttribute('aria-hidden', 'true');
    Object.assign(iosLabel.style, { position: 'fixed', left: '-100px', top: '0', opacity: '0', pointerEvents: 'none' });
    iosLabel.appendChild(input);
    document.body.appendChild(iosLabel);
  }
  iosLabel.click();
}

// App Android (pucheroapp): vibración nativa con el motor háptico del móvil.
const native = typeof window !== 'undefined' ? (window as { PucheroNative?: { vibrate(p: string): void } }).PucheroNative : undefined;

function buzz(pattern: number | number[]) {
  try {
    if (native) native.vibrate(String(pattern));
    else if (canVibrate) navigator.vibrate(pattern);
    else if (isIOS) {
      const n = Array.isArray(pattern) ? Math.ceil(pattern.length / 2) : 1;
      for (let i = 0; i < n; i++) setTimeout(iosTick, i * 90);
    }
  } catch {
    /* sin vibración disponible */
  }
}

export const haptic = {
  tap: () => buzz(8),
  pick: () => buzz(12),
  drop: () => buzz([18, 30, 40]),
  stir: () => buzz(10),
  success: () => buzz([40, 50, 40, 50, 120]),
  error: () => buzz([60, 40, 60])
};
