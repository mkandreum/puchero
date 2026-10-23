import { forwardRef, useRef, type PointerEvent as RPointerEvent } from 'react';
import { BY_ID, foodImg } from '../../shared/ingredients';

// Sistema de coordenadas del dibujo (viewBox 400×300)
const CX = 200;
const CY = 142; // centro del caldo
const RX = 118;
const RY = 30;

export interface CazuelaProps {
  items: string[];
  mode: 'pick' | 'stir';
  over?: boolean;
  /** cambia en cada ingrediente añadido o vuelta: dispara el rebote */
  bump?: number;
  lastAdded?: string | null;
  /** giro acumulado del contenido (rad) */
  angle?: number;
  /** ángulo actual del dedo, para colocar la cuchara (rad) */
  spoon?: number | null;
  progress?: number;
  onRemove?: (id: string) => void;
  onStir?: (delta: number, angle: number) => void;
  onStirEnd?: () => void;
}

const lerpHex = (a: string, b: string, t: number) => {
  const pa = a.match(/\w\w/g)!.map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g)!.map((h) => parseInt(h, 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

const frac = (n: number) => n - Math.floor(n);

/** Greca de cerámica: franja crema ondulada a lo largo del cuerpo */
const WAVE = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = (14 + (i / 48) * 152) * (Math.PI / 180);
    const x = CX + Math.cos(t) * 154;
    const y = 150 + Math.sin(t) * 64 + Math.sin(i * 1.6) * 4;
    pts.push(`${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(' ');
})();

const FLAMES = [128, 156, 184, 212, 240, 268];

export const Cazuela = forwardRef<HTMLDivElement, CazuelaProps>(function Cazuela(
  { items, mode, over, bump = 0, lastAdded, angle = 0, spoon = null, progress = 0, onRemove, onStir, onStirEnd },
  ref
) {
  const last = useRef<number | null>(null);
  const heat = mode === 'stir' ? 0.55 + 0.45 * progress : 0.32;
  const broth = mode === 'stir' ? lerpHex('6e2f16', 'e39a3b', progress) : '#6e2f16';

  const placed = items.map((id, i) => {
    const a = i * 2.39996 + angle;
    const r = items.length === 1 ? 0.05 : 0.28 + 0.6 * frac(i * 0.618 + 0.21);
    const x = CX + Math.cos(a) * r * RX;
    const y = CY + Math.sin(a) * r * RY;
    const depth = (y - (CY - RY)) / (2 * RY);
    return {
      id,
      x,
      y,
      scale: 0.82 + 0.32 * depth,
      rot: ((i * 37) % 50) - 25 + (angle * 180) / Math.PI * 0.6,
      z: Math.round(y)
    };
  });
  const dropped = lastAdded ? placed.find((p) => p.id === lastAdded) : undefined;

  const toAngle = (e: RPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * 400 - CX;
    const vy = (((e.clientY - r.top) / r.height) * 300 - CY) * 2;
    return Math.atan2(vy, vx);
  };

  const down = (e: RPointerEvent<HTMLDivElement>) => {
    if (mode !== 'stir') return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* puntero ya liberado: seguimos sin captura */ }
    last.current = toAngle(e);
    onStir?.(0, last.current);
  };
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    if (mode !== 'stir' || last.current === null) return;
    const a = toAngle(e);
    let d = a - last.current;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    last.current = a;
    onStir?.(d, a);
  };
  const up = () => {
    if (last.current === null) return;
    last.current = null;
    onStirEnd?.();
  };

  const sb = spoon === null ? null : { x: CX + Math.cos(spoon) * 0.62 * RX, y: CY + Math.sin(spoon) * 0.62 * RY };

  return (
    <div
      ref={ref}
      className={`pot${over ? ' over' : ''} ${bump % 2 ? 'bump-a' : 'bump-b'}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      role={mode === 'stir' ? 'slider' : 'img'}
      aria-label={mode === 'stir' ? 'Cazuela: gira el dedo dentro para remover' : `Cazuela con ${items.length} ingredientes`}
      aria-valuenow={mode === 'stir' ? Math.round(progress * 100) : undefined}
      aria-valuemin={mode === 'stir' ? 0 : undefined}
      aria-valuemax={mode === 'stir' ? 100 : undefined}
      style={{ cursor: mode === 'stir' ? 'grab' : 'default' }}
    >
      <svg viewBox="0 0 400 300" aria-hidden="true">
        {/* fogón */}
        <ellipse cx="200" cy="266" rx="150" ry="18" fill="#0b0a09" />
        <g style={{ opacity: 0.5 + heat * 0.5, transform: `scale(1, ${0.5 + heat * 0.7})`, transformOrigin: '200px 268px', transition: 'transform .4s, opacity .4s' }}>
          {FLAMES.map((x, i) => (
            <g key={x} transform={`translate(${x} 268)`}>
              <path className="flame" d="M0 0 C -15 -10 -11 -36 0 -54 C 11 -36 15 -10 0 0 Z" fill="#ff5a36" style={{ animationDelay: `${-i * 0.13}s` }} />
              <path className="flame" d="M0 0 C -8 -6 -6 -20 0 -32 C 6 -20 8 -6 0 0 Z" fill="#ffd84d" style={{ animationDelay: `${-i * 0.21}s` }} />
            </g>
          ))}
        </g>
        <ellipse cx="200" cy="266" rx="128" ry="12" fill="none" stroke="#2b2723" strokeWidth="8" />

        <g className="glow">
          <ellipse cx="200" cy="130" rx="182" ry="72" fill="#d4ff4f" />
        </g>

        <g className="pot-body">
          {/* asas */}
          <ellipse cx="30" cy="140" rx="26" ry="13" fill="#a84822" />
          <ellipse cx="28" cy="140" rx="11" ry="5" fill="#141210" />
          <ellipse cx="370" cy="140" rx="26" ry="13" fill="#a84822" />
          <ellipse cx="372" cy="140" rx="11" ry="5" fill="#141210" />
          {/* cuerpo de barro */}
          <path d="M38 130 C 38 222 110 252 200 252 C 290 252 362 222 362 130 Z" fill="#c1572f" />
          <path d="M50 168 C 70 226 132 250 200 250 C 268 250 330 226 350 168 C 320 208 266 226 200 226 C 134 226 80 208 50 168 Z" fill="#a84822" />
          <path d="M70 160 C 78 196 104 218 136 230" stroke="#e98a57" strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d={WAVE} stroke="#f3d9b1" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* borde, pared interior y caldo */}
          <ellipse cx="200" cy="130" rx="162" ry="56" fill="#d9703f" />
          <ellipse cx="200" cy="134" rx="146" ry="46" fill="#5a2414" />
          <ellipse cx="200" cy="142" rx="132" ry="36" fill={broth} style={{ transition: 'fill .4s' }} />
          <ellipse cx="168" cy="132" rx="56" ry="9" fill="#ffffff" opacity=".1" />
          {mode === 'stir' &&
            [
              [150, 146, 0],
              [236, 138, 0.5],
              [196, 158, 0.9],
              [266, 152, 0.3],
              [120, 138, 1.1]
            ].map(([x, y, d], i) => (
              <circle key={i} className="bubble" cx={x} cy={y} r={4 + (i % 3)} fill={lerpHex('a8542a', 'ffe7a0', progress)} style={{ animationDelay: `${d}s` }} />
            ))}
        </g>
      </svg>

      {placed.map((p) => (
        <div
          key={p.id}
          className={`food-in${p.id === lastAdded ? ' drop' : ''}`}
          style={{
            left: `${(p.x / 400) * 100}%`,
            top: `${(p.y / 300) * 100}%`,
            zIndex: p.z,
            transform: `translate(-50%, -78%) scale(${p.scale}) rotate(${p.rot}deg)`,
            transition: mode === 'stir' ? 'none' : 'left .45s cubic-bezier(.3,1.4,.5,1), top .45s cubic-bezier(.3,1.4,.5,1)'
          }}
        >
          <img src={foodImg(p.id)} alt="" draggable={false} />
          {mode === 'pick' && onRemove && (
            <button type="button" aria-label={`Sacar ${BY_ID[p.id]?.name} de la cazuela`} onClick={() => onRemove(p.id)} />
          )}
        </div>
      ))}
      {dropped && <div key={`s${bump}`} className="splash" style={{ left: `${(dropped.x / 400) * 100}%`, top: `${(dropped.y / 300) * 100}%`, zIndex: 300 }} />}

      {/* labio delantero (tapa la parte baja de los ingredientes), cuchara y progreso */}
      <svg viewBox="0 0 400 300" aria-hidden="true" style={{ zIndex: 400, pointerEvents: 'none' }}>
        <path d="M38 130 A 162 56 0 0 0 362 130 L 346 134 A 146 46 0 0 1 54 134 Z" fill="#d9703f" />
        <path d="M60 156 A 150 50 0 0 0 150 182" stroke="#f09a6a" strokeWidth="5" fill="none" strokeLinecap="round" />
        {mode === 'stir' && sb && (
          <g>
            <line x1={sb.x} y1={sb.y} x2={sb.x + (sb.x - CX) * 0.35} y2={sb.y - 150} stroke="#a8743f" strokeWidth="15" strokeLinecap="round" />
            <line x1={sb.x} y1={sb.y} x2={sb.x + (sb.x - CX) * 0.35} y2={sb.y - 150} stroke="#e2b07a" strokeWidth="9" strokeLinecap="round" />
            <ellipse cx={sb.x} cy={sb.y} rx="20" ry="10" fill="#e2b07a" stroke="#a8743f" strokeWidth="3" />
          </g>
        )}
        {mode === 'stir' && (
          <>
            <ellipse cx="200" cy="130" rx="184" ry="74" fill="none" stroke="#2b2723" strokeWidth="7" />
            <ellipse
              cx="200"
              cy="130"
              rx="184"
              ry="74"
              fill="none"
              stroke="#d4ff4f"
              strokeWidth="7"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset={100 - progress * 100}
              style={{ transition: 'stroke-dashoffset .15s' }}
            />
          </>
        )}
      </svg>

      {mode === 'stir' &&
        [34, 46, 57, 68].slice(0, progress > 0.4 ? 4 : 2).map((l, i) => (
          <span key={l} className="steam" style={{ left: `${l}%`, animationDelay: `${i * 0.55}s` }} />
        ))}

      {mode === 'pick' && items.length === 0 && <p className="pot-hint">suéltalo aquí ↓</p>}
      {mode === 'stir' && progress === 0 && (
        <div className="stir-hint">
          <svg viewBox="0 0 400 300" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <path d="M120 120 A 90 32 0 1 1 140 160" stroke="#f5f1ea" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray="2 14" />
            <path d="M128 148 l14 14 l-20 6" stroke="#f5f1ea" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  );
});
