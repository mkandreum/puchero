import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BY_ID, foodImg } from '../../shared/ingredients';
import { stepMinutes, type Recipe } from '../../shared/types';
import { haptic } from '../lib/haptics';
import { IconArrow, IconCheck, IconPause, IconPlay, IconTimer, IconX } from './Icons';

/** Pitido corto con WebAudio cuando acaba un temporizador (sin ficheros de audio). */
function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.28, 0.56].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.22);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.24);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* sin audio */
  }
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Modo cocinar: un paso por pantalla, en grande. Si el paso dice "8 min", hay temporizador
 * (vibra y pita al acabar). La pantalla no se apaga mientras está abierto.
 */
export function CookMode({ recipe, onClose, onDone }: { recipe: Recipe; onClose: () => void; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [left, setLeft] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [rang, setRang] = useState(false);
  const total = useRef(0);
  const endAt = useRef(0);
  const steps = recipe.steps;
  const step = steps[i];
  const mins = stepMinutes(step);
  const last = i === steps.length - 1;

  // Pantalla encendida mientras cocinas
  useEffect(() => {
    let lock: { release(): Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } };
    const get = () => nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => undefined);
    get();
    const onVis = () => document.visibilityState === 'visible' && get();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      lock?.release().catch(() => undefined);
    };
  }, []);

  // Al cambiar de paso, el temporizador se prepara (sin arrancar)
  useEffect(() => {
    setRunning(false);
    setRang(false);
    if (mins) {
      total.current = mins * 60;
      setLeft(mins * 60);
    } else setLeft(null);
  }, [i, mins]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const s = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        setRunning(false);
        setRang(true);
        haptic.success();
        setTimeout(() => haptic.success(), 900);
        beep();
      }
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const toggle = () => {
    if (left === null) return;
    haptic.tap();
    if (running) setRunning(false);
    else {
      const from = left === 0 ? total.current : left;
      endAt.current = Date.now() + from * 1000;
      setLeft(from);
      setRang(false);
      setRunning(true);
    }
  };

  const go = (d: number) => {
    haptic.tap();
    setI((n) => Math.max(0, Math.min(steps.length - 1, n + d)));
  };

  const pct = left !== null && total.current ? 1 - left / total.current : 0;
  const R = 92;
  const C = 2 * Math.PI * R;

  // En un portal: el plato tiene transform y atraparía el position: fixed
  return createPortal(
    <div className="cook" role="dialog" aria-modal="true" aria-label="Modo cocinar">
      <header className="cook-top">
        <p className="mono" style={{ color: 'var(--ink)' }}>
          Paso {i + 1} de {steps.length}
        </p>
        <button className="cook-x" aria-label="Salir del modo cocinar" onClick={() => { haptic.tap(); onClose(); }}>
          <IconX width={22} height={22} />
        </button>
      </header>
      <div className="cook-bars">
        {steps.map((_, n) => (
          <span key={n} className={n <= i ? 'on' : ''} />
        ))}
      </div>

      <main className="cook-body" key={i}>
        <p className="cook-n">{String(i + 1).padStart(2, '0')}</p>
        <p className="cook-step">{step}</p>
        {i === 0 && (
          <div className="cook-ings">
            {recipe.ingredients.map((id, n) => (
              <span key={id} className="cook-ing">
                <img src={foodImg(id)} alt="" />
                <b>{recipe.amounts[n]}</b> {BY_ID[id]?.name.toLowerCase()}
              </span>
            ))}
          </div>
        )}
        {left !== null && (
          <button className={`timer${running ? ' run' : ''}${rang ? ' rang' : ''}`} onClick={toggle} aria-label={running ? 'Pausar temporizador' : 'Arrancar temporizador'}>
            <svg viewBox="0 0 200 200" aria-hidden="true">
              <circle cx="100" cy="100" r={R} className="timer-track" />
              <circle cx="100" cy="100" r={R} className="timer-fill" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
            </svg>
            <span className="timer-t">{rang ? '¡Listo!' : mmss(left)}</span>
            <span className="timer-b">
              {running ? <IconPause width={18} height={18} /> : rang ? <IconTimer width={18} height={18} /> : <IconPlay width={16} height={16} />}
              {running ? 'Pausa' : rang ? 'Otra vez' : left === total.current ? 'Empezar' : 'Seguir'}
            </span>
          </button>
        )}
      </main>

      <footer className="cook-foot">
        {i > 0 && (
          <button className="btn btn-line" style={{ height: 62, color: 'var(--ink)' }} onClick={() => go(-1)}>
            Atrás
          </button>
        )}
        {last ? (
          <button className="btn btn-ink" style={{ flex: 1, height: 62, fontSize: 18 }} onClick={() => { haptic.success(); onDone(); }}>
            <IconCheck width={20} height={20} /> ¡A comer!
          </button>
        ) : (
          <button className="btn btn-ink" style={{ flex: 1, height: 62, fontSize: 18 }} onClick={() => go(1)}>
            Siguiente <IconArrow width={20} height={20} />
          </button>
        )}
      </footer>
    </div>,
    document.body
  );
}
