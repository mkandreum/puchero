import { useState } from 'react';
import { foodImg } from '../../shared/ingredients';
import { SLOT_LABEL, SLOTS as SLOT_ORDER, type Meal, type PlanItem, type Profile, type Slot, type TodayData } from '../../shared/types';
import { IconArrow, IconDrop, IconFlame, IconMinus, IconSnow, IconThumb } from '../components/Icons';
import { api } from '../lib/api';
import { haptic } from '../lib/haptics';
import { useCountUp } from '../lib/useCountUp';

const SLOTS: { id: Slot; label: string; bg: string }[] = [
  { id: 'desayuno', label: 'Desayuno', bg: 'var(--lilac)' },
  { id: 'comida', label: 'Comida', bg: 'var(--butter)' },
  { id: 'merienda', label: 'Merienda', bg: 'var(--t-fruta)' },
  { id: 'cena', label: 'Cena', bg: 'var(--t-verdura)' }
];

const dateLabel = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });

interface Props {
  data: TodayData | null;
  profile: Profile;
  onCook: (slot?: Slot) => void;
  onCookPlan: (item: PlanItem) => void;
  onWater: (glasses: number) => void;
  onRated: () => void;
  toast: (msg: string) => void;
}

/** Vasos de agua del día: un toque llena el siguiente. */
function Water({ glasses, goal, onChange, toast }: { glasses: number; goal: number; onChange: (n: number) => void; toast: (m: string) => void }) {
  const [pop, setPop] = useState<number | null>(null);
  const change = async (delta: number) => {
    const next = Math.max(0, glasses + delta);
    if (next === glasses) return haptic.error();
    onChange(next); // optimista
    if (delta > 0) {
      setPop(next - 1);
      if (next === goal) {
        haptic.success();
        toast('¡Objetivo de agua! Bien hidratado.');
      } else haptic.drop();
    } else haptic.tap();
    try {
      onChange((await api.water(delta)).glasses);
    } catch {
      onChange(glasses);
      toast('Sin conexión: no se ha guardado el vaso');
    }
  };
  const cells = Math.max(goal, glasses);
  return (
    <div className="card water">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <p className="mono" style={{ color: 'var(--ink)' }}>Agua de hoy</p>
        <p className="water-n">
          <b>{glasses}</b> / {goal} vasos
        </p>
      </div>
      <div className="glasses" style={{ ['--n' as string]: cells }}>
        {Array.from({ length: cells }, (_, i) => (
          <button
            key={i}
            className={`glass${i < glasses ? ' full' : ''}${pop === i ? ' pop' : ''}`}
            aria-label={i < glasses ? `Vaso ${i + 1}, bebido` : 'Beber un vaso'}
            onClick={() => change(i < glasses ? 0 : 1)}
            onAnimationEnd={() => setPop(null)}
          >
            <span className="glass-fill" />
            <IconDrop width={16} height={16} filled={i < glasses} />
          </button>
        ))}
        <button className="glass-minus" aria-label="Quitar un vaso" onClick={() => change(-1)} disabled={!glasses}>
          <IconMinus width={18} height={18} />
        </button>
      </div>
    </div>
  );
}

export function Hoy({ data, profile, onCook, onCookPlan, onWater, onRated, toast }: Props) {
  const meals = data?.meals ?? [];
  const streak = useCountUp(data?.streak ?? 0);
  const bySlot = (s: Slot): Meal | undefined => meals.find((m) => m.slot === s);
  const done = meals.length;
  // Las comidas que eligió en el onboarding, más cualquiera que ya haya cocinado hoy.
  const shown = SLOTS.filter((s) => profile.slots.includes(s.id) || meals.some((m) => m.slot === s.id));
  const order = (s: { id: Slot }) => SLOT_ORDER.indexOf(s.id);
  const line = done === 0 ? 'toca cocinar.' : done === 1 ? 'vas bien.' : done === 2 ? 'casi perfecto.' : 'día redondo.';
  const planLeft = (data?.plan ?? []).filter((p) => !p.done);
  const [rated, setRated] = useState<Record<string, number>>({});

  const rate = async (m: Meal, value: number) => {
    const next = (rated[m.id] ?? m.rating) === value ? 0 : value;
    haptic[next ? 'drop' : 'tap']();
    setRated((r) => ({ ...r, [m.id]: next }));
    try {
      await api.updateMeal(m.id, { rating: next });
      if (next) toast(next > 0 ? 'Apuntado: la IA hará más platos así' : 'Apuntado: la IA lo evitará');
      onRated();
    } catch {
      toast('Sin conexión: no se ha guardado');
    }
  };

  return (
    <div className="screen">
      <div className="wrap hoy-grid">
        <div className="rise">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <p className="mono">{data ? dateLabel(data.date) : '···'}{profile.name ? ` · ${profile.name}` : ''}</p>
            <span className="badge" style={{ background: 'var(--tomato)', color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <IconFlame width={14} height={14} strokeWidth={2.6} />
              {streak} {data?.streak === 1 ? 'DÍA' : 'DÍAS'}
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
            <button className="btn btn-ink" style={{ marginTop: 18, color: 'var(--tomato)' }} onClick={() => { haptic.tap(); onCook(); }}>
              A la cazuela <IconArrow width={20} height={20} />
            </button>
          </div>

          {data && <Water glasses={data.water} goal={profile.waterGoal} onChange={onWater} toast={toast} />}
        </div>

        <div>
          {planLeft.length > 0 && (
            <>
              <p className="mono" style={{ marginBottom: 12 }}>Hoy toca, según tu plan</p>
              <div className="rise rise-late" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 30 }}>
                {planLeft.map((p) => (
                  <div key={p.slot} className="meal-row plan-today">
                    <div style={{ minWidth: 0 }}>
                      <p className="mono" style={{ fontSize: 11 }}>{SLOT_LABEL[p.slot]}</p>
                      <p className="serif">{p.title}</p>
                      <div className="thumbs" style={{ marginTop: 8 }}>
                        {p.ingredients.map((id) => <img key={id} src={foodImg(id)} alt="" />)}
                      </div>
                    </div>
                    <button className="btn btn-lime" style={{ height: 44, padding: '0 16px', fontSize: 14 }} onClick={() => { haptic.tap(); onCookPlan(p); }}>
                      Cocinar
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <p className="mono" style={{ marginBottom: 12 }}>Tus comidas</p>
          {/* las filas entran escalonadas, después del titular */}
          <div className="rise rise-late" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!data && [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 84 }} />)}
            {data &&
              [...(shown.length ? shown : SLOTS)].sort((x, y) => order(x) - order(y)).map((s) => {
                const m = bySlot(s.id);
                const r = m ? rated[m.id] ?? m.rating : 0;
                return m ? (
                  <div key={s.id} className="meal-row" style={{ background: s.bg, color: 'var(--ink)' }}>
                    <div style={{ minWidth: 0 }}>
                      <p className="mono" style={{ color: 'var(--ink)', fontSize: 11 }}>{s.label}</p>
                      <p className="serif">{m.title}</p>
                      <div className="rate" role="group" aria-label="¿Te gustó?">
                        <button className={r > 0 ? 'on' : ''} aria-pressed={r > 0} aria-label="Me gustó" onClick={() => rate(m, 1)}>
                          <IconThumb width={18} height={18} filled={r > 0} />
                        </button>
                        <button className={r < 0 ? 'on' : ''} aria-pressed={r < 0} aria-label="No me gustó" onClick={() => rate(m, -1)}>
                          <IconThumb width={18} height={18} down filled={r < 0} />
                        </button>
                      </div>
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
                    <button className="btn btn-lime" style={{ height: 44, padding: '0 16px', fontSize: 14 }} onClick={() => { haptic.tap(); onCook(s.id); }}>
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
                className={`day${d.frozen ? ' frozen' : ''}`}
                title={d.frozen ? `${d.date}: salvado con el comodín` : d.date}
                style={
                  d.count > 0
                    ? { background: 'var(--lime)', color: 'var(--ink)' }
                    : d.frozen
                      ? undefined
                      : d.isToday
                        ? { border: '2px solid var(--butter)', color: 'var(--butter)' }
                        : { background: d.isFuture ? 'transparent' : 'var(--ink-2)', border: d.isFuture ? '1.5px dashed var(--ink-3)' : 0, color: 'var(--muted)' }
                }
              >
                {d.frozen ? <IconSnow width={18} height={18} /> : d.letter}
              </div>
            ))}
          </div>
          {data && (
            <p className="mono" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', letterSpacing: '.02em' }}>
              <IconSnow width={14} height={14} />
              {data.freezes ? 'Tienes 1 comodín esta semana: salva un día sin cocinar.' : 'Comodín de esta semana usado. El lunes tienes otro.'}
            </p>
          )}

          <div style={{ marginTop: 40 }}>
            <p className="h-lg" style={{ fontSize: 'clamp(48px, 13vw, 72px)' }}>COMER BIEN</p>
            <p className="serif" style={{ margin: 0, fontSize: 'clamp(48px, 13vw, 72px)', lineHeight: 1, color: 'var(--tomato)' }}>sin drama.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
