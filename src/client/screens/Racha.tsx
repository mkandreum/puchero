import { useEffect, useState } from 'react';
import { foodImg } from '../../shared/ingredients';
import type { Meal, TodayData } from '../../shared/types';
import { IconTrash } from '../components/Icons';
import { api } from '../lib/api';
import { haptic } from '../lib/haptics';

const when = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

export function Racha({ data, refreshKey, onChanged }: { data: TodayData | null; refreshKey: number; onChanged: () => void }) {
  const [meals, setMeals] = useState<Meal[] | null>(null);

  useEffect(() => {
    api.meals(60).then(setMeals).catch(() => setMeals([]));
  }, [refreshKey]);

  const del = async (id: string) => {
    haptic.tap();
    setMeals((m) => m?.filter((x) => x.id !== id) ?? null);
    await api.deleteMeal(id).catch(() => undefined);
    onChanged();
  };

  const streak = data?.streak ?? 0;
  return (
    <div className="screen">
      <div className="wrap">
        <p className="mono">Tu racha</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap', marginTop: 10 }}>
          <span className="h-xl" style={{ fontSize: 'clamp(140px, 42vw, 260px)', color: 'var(--butter)' }}>{streak}</span>
          <span className="serif" style={{ fontSize: 'clamp(48px, 13vw, 88px)', lineHeight: 1, marginBottom: '.1em' }}>
            {streak === 1 ? 'día' : 'días'} seguidos.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 24, maxWidth: 560 }}>
          <div className="card" style={{ background: 'var(--lilac)', color: 'var(--ink)' }}>
            <b style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-.04em' }}>{data?.best ?? 0}</b>
            <p className="mono" style={{ color: 'var(--ink)' }}>Mejor racha</p>
          </div>
          <div className="card" style={{ background: 'var(--lime)', color: 'var(--ink)' }}>
            <b style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-.04em' }}>{data?.total ?? 0}</b>
            <p className="mono" style={{ color: 'var(--ink)' }}>Platos cocinados</p>
          </div>
        </div>

        <p className="mono" style={{ margin: '34px 0 12px' }}>Historial</p>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {meals === null && [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 92 }} />)}
          {meals?.length === 0 && (
            <p className="serif" style={{ fontSize: 30, color: '#cfc8bc', margin: 0 }}>Aún nada. La cazuela te espera.</p>
          )}
          {meals?.map((m) => (
            <div key={m.id} className="meal-row" style={{ background: 'var(--ink-2)' }}>
              <div style={{ minWidth: 0 }}>
                <p className="mono" style={{ fontSize: 11 }}>{when(m.createdAt)} · {m.slot}</p>
                <p className="serif">{m.title}</p>
                <div className="thumbs" style={{ marginTop: 8 }}>
                  {m.ingredients.slice(0, 6).map((id) => <img key={id} src={foodImg(id)} alt="" />)}
                </div>
              </div>
              <button className="btn" aria-label={`Borrar ${m.title}`} style={{ width: 44, height: 44, padding: 0, background: 'var(--ink-3)', color: 'var(--muted)' }} onClick={() => del(m.id)}>
                <IconTrash width={18} height={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
