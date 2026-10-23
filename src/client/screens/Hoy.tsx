import { foodImg } from '../../shared/ingredients';
import type { Meal, Slot, TodayData } from '../../shared/types';
import { IconArrow, IconFlame } from '../components/Icons';

const SLOTS: { id: Slot; label: string; bg: string }[] = [
  { id: 'desayuno', label: 'Desayuno', bg: 'var(--lilac)' },
  { id: 'comida', label: 'Comida', bg: 'var(--butter)' },
  { id: 'cena', label: 'Cena', bg: 'var(--t-verdura)' }
];

const dateLabel = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });

export function Hoy({ data, onCook }: { data: TodayData | null; onCook: () => void }) {
  const meals = data?.meals ?? [];
  const bySlot = (s: Slot): Meal | undefined => meals.find((m) => m.slot === s);
  const done = meals.length;
  const line = done === 0 ? 'toca cocinar.' : done === 1 ? 'vas bien.' : done === 2 ? 'casi perfecto.' : 'día redondo.';

  return (
    <div className="screen">
      <div className="wrap hoy-grid">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <p className="mono">{data ? dateLabel(data.date) : '···'}</p>
            <span className="badge" style={{ background: 'var(--tomato)', color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <IconFlame width={14} height={14} strokeWidth={2.6} />
              {data?.streak ?? 0} {data?.streak === 1 ? 'DÍA' : 'DÍAS'}
            </span>
          </div>
          <h1 className="h-xl" style={{ marginTop: 18, fontSize: 'clamp(110px, 32vw, 210px)' }}>HOY</h1>
          <p className="serif" style={{ margin: '4px 0 0', fontSize: 'clamp(56px, 16vw, 104px)', lineHeight: 0.95, color: 'var(--lime)' }}>{line}</p>
          <p style={{ margin: '14px 0 0', fontSize: 18, lineHeight: 1.35, color: '#cfc8bc', maxWidth: 420 }}>
            Comer bien sin drama: eliges, arrastras, remueves y a comer.
          </p>

          <div className="card" style={{ marginTop: 28, background: 'var(--tomato)', color: 'var(--ink)' }}>
            <p className="mono" style={{ color: 'var(--ink)', fontWeight: 600 }}>Reto del día</p>
            <p style={{ margin: '10px 0 0', fontSize: 'clamp(28px, 7.6vw, 40px)', lineHeight: 1, fontWeight: 800, letterSpacing: '-.02em' }}>
              {data?.challenge ?? 'Mete algo verde en cada comida de hoy.'}
            </p>
            <button className="btn btn-ink" style={{ marginTop: 18, color: 'var(--tomato)' }} onClick={onCook}>
              A la cazuela <IconArrow width={20} height={20} />
            </button>
          </div>
        </div>

        <div>
          <p className="mono" style={{ marginBottom: 12 }}>Tus comidas</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!data && [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 84 }} />)}
            {data &&
              SLOTS.map((s) => {
                const m = bySlot(s.id);
                return m ? (
                  <div key={s.id} className="meal-row" style={{ background: s.bg, color: 'var(--ink)' }}>
                    <div style={{ minWidth: 0 }}>
                      <p className="mono" style={{ color: 'var(--ink)', fontSize: 11 }}>{s.label}</p>
                      <p className="serif">{m.title}</p>
                    </div>
                    <div className="thumbs">
                      {m.ingredients.slice(0, 3).map((id) => (
                        <img key={id} src={foodImg(id)} alt="" style={{ background: 'var(--paper)', borderColor: 'transparent' }} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div key={s.id} className="meal-row" style={{ border: '1.5px solid var(--ink-3)' }}>
                    <div>
                      <p className="mono" style={{ fontSize: 11 }}>{s.label}</p>
                      <p className="serif" style={{ color: '#cfc8bc' }}>Sin cocinar</p>
                    </div>
                    <button className="btn btn-lime" style={{ height: 44, padding: '0 16px', fontSize: 14 }} onClick={onCook}>
                      Cocinar
                    </button>
                  </div>
                );
              })}
          </div>

          <p className="mono" style={{ margin: '30px 0 12px' }}>Esta semana</p>
          <div className="week">
            {(data?.week ?? []).map((d) => (
              <div
                key={d.date}
                className="day"
                title={d.date}
                style={
                  d.count > 0
                    ? { background: 'var(--lime)', color: 'var(--ink)' }
                    : d.isToday
                      ? { border: '2px solid var(--butter)', color: 'var(--butter)' }
                      : { background: d.isFuture ? 'transparent' : 'var(--ink-2)', border: d.isFuture ? '1.5px dashed var(--ink-3)' : 0, color: 'var(--muted)' }
                }
              >
                {d.letter}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 40 }}>
            <p className="h-lg" style={{ fontSize: 'clamp(48px, 13vw, 72px)' }}>COMER BIEN</p>
            <p className="serif" style={{ margin: 0, fontSize: 'clamp(48px, 13vw, 72px)', lineHeight: 1, color: 'var(--tomato)' }}>sin drama.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
