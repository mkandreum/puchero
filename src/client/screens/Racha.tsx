import { useEffect, useState } from 'react';
import { foodImg } from '../../shared/ingredients';
import { SLOT_LABEL, type Achievement, type Meal, type Summary, type TodayData } from '../../shared/types';
import { IconHeart, IconRepeat, IconShare, IconSnow, IconThumb, IconTrash, IconTrophy } from '../components/Icons';
import { WeekCharts } from '../components/WeekCharts';
import { api } from '../lib/api';
import { haptic } from '../lib/haptics';
import { shareRecipe } from '../lib/shareCard';
import { useCountUp } from '../lib/useCountUp';

const when = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

interface Props {
  data: TodayData | null;
  refreshKey: number;
  onChanged: () => void;
  onRepeat: (m: Meal) => void;
  toast: (msg: string) => void;
}

export function Racha({ data, refreshKey, onChanged, onRepeat, toast }: Props) {
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [achievements, setAchievements] = useState<Achievement[] | null>(null);
  const [onlyFav, setOnlyFav] = useState(false);
  const [open, setOpen] = useState<Achievement | null>(null);

  useEffect(() => {
    api.meals(80).then(setMeals).catch(() => setMeals([]));
    api.summary().then(setSummary).catch(() => undefined);
    api.achievements().then(setAchievements).catch(() => undefined);
  }, [refreshKey]);

  const patch = async (m: Meal, p: { favorite?: boolean; rating?: number }) => {
    setMeals((list) => list?.map((x) => (x.id === m.id ? { ...x, ...p } : x)) ?? null);
    try {
      await api.updateMeal(m.id, p);
    } catch {
      setMeals((list) => list?.map((x) => (x.id === m.id ? m : x)) ?? null);
      toast('Sin conexión: no se ha guardado');
    }
  };
  const toggleFav = (m: Meal) => {
    haptic[m.favorite ? 'tap' : 'drop']();
    patch(m, { favorite: !m.favorite });
  };
  const rate = (m: Meal, v: number) => {
    const next = m.rating === v ? 0 : v;
    haptic[next ? 'drop' : 'tap']();
    patch(m, { rating: next });
  };
  const del = async (id: string) => {
    haptic.tap();
    setMeals((m) => m?.filter((x) => x.id !== id) ?? null);
    await api.deleteMeal(id).catch(() => undefined);
    onChanged();
  };
  const share = async (m: Meal) => {
    haptic.tap();
    try {
      if ((await shareRecipe(m)) === 'downloaded') toast('Tarjeta descargada: compártela donde quieras');
    } catch {
      toast('No se ha podido crear la tarjeta');
    }
  };

  const streak = data?.streak ?? 0;
  const shown = useCountUp(streak);
  const best = useCountUp(data?.best ?? 0);
  const total = useCountUp(data?.total ?? 0);
  const unlocked = achievements?.filter((a) => a.unlocked).length ?? 0;
  const list = onlyFav ? meals?.filter((m) => m.favorite) : meals;

  return (
    <div className="screen">
      <div className="wrap rise">
        <p className="mono">Tu racha</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap', marginTop: 10 }}>
          <span className="h-xl" style={{ fontSize: 'clamp(140px, 42vw, 260px)', color: 'var(--butter)' }}>{shown}</span>
          <span className="serif" style={{ fontSize: 'clamp(48px, 13vw, 88px)', lineHeight: 1, marginBottom: '.1em' }}>
            {streak === 1 ? 'día seguido.' : 'días seguidos.'}
          </span>
        </div>
        {data && (
          <p className="mono freeze-note">
            <IconSnow width={14} height={14} />
            {data.freezes ? '1 comodín disponible esta semana' : 'Comodín de la semana usado'}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 24, maxWidth: 560 }}>
          <div className="card" style={{ background: 'var(--lilac)', color: 'var(--ink)' }}>
            <b style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-.04em' }}>{best}</b>
            <p className="mono" style={{ color: 'var(--ink)' }}>Mejor racha</p>
          </div>
          <div className="card" style={{ background: 'var(--lime)', color: 'var(--ink)' }}>
            <b style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-.04em' }}>{total}</b>
            <p className="mono" style={{ color: 'var(--ink)' }}>Platos cocinados</p>
          </div>
        </div>

        <h2 className="sec-title">Tu semana <span className="serif">en datos.</span></h2>
        {summary ? <WeekCharts data={summary} /> : <div className="skeleton" style={{ height: 260 }} />}

        <h2 className="sec-title">
          Logros <span className="serif">{achievements ? `${unlocked} de ${achievements.length}.` : '…'}</span>
        </h2>
        <div className="achs">
          {achievements?.map((a) => (
            <button key={a.id} className={`ach${a.unlocked ? ' on' : ''}`} onClick={() => { haptic.tap(); setOpen(open?.id === a.id ? null : a); }} aria-expanded={open?.id === a.id}>
              <span className="ach-img">
                <img src={foodImg(a.img)} alt="" />
                {!a.unlocked && <svg viewBox="0 0 36 36" className="ach-ring"><circle cx="18" cy="18" r="16" pathLength={100} strokeDasharray={`${a.progress * 100} 100`} /></svg>}
              </span>
              <b>{a.title}</b>
            </button>
          ))}
        </div>
        {open && (
          <div className="ach-detail" key={open.id}>
            <IconTrophy width={22} height={22} />
            <div>
              <b>{open.title}</b>
              <p>{open.text} {open.unlocked ? '¡Conseguido!' : `Llevas el ${Math.round(open.progress * 100)}%.`}</p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, margin: '40px 0 12px' }}>
          <p className="mono">Historial</p>
          <div className="seg small" role="tablist">
            <button role="tab" aria-selected={!onlyFav} className={!onlyFav ? 'on' : ''} onClick={() => { haptic.tap(); setOnlyFav(false); }}>Todos</button>
            <button role="tab" aria-selected={onlyFav} className={onlyFav ? 'on' : ''} onClick={() => { haptic.tap(); setOnlyFav(true); }}>
              <IconHeart width={14} height={14} filled /> Favoritos
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {list === null && [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 92 }} />)}
          {list?.length === 0 && (
            <p className="serif" style={{ fontSize: 30, color: '#cfc8bc', margin: 0 }}>
              {onlyFav ? 'Sin favoritos aún. Dale al corazón en un plato.' : 'Aún nada. La cazuela te espera.'}
            </p>
          )}
          {list?.map((m) => (
            <div key={m.id} className="hist">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <p className="mono" style={{ fontSize: 11 }}>{when(m.createdAt)} · {SLOT_LABEL[m.slot] ?? m.slot}{m.servings > 1 ? ` · ${m.servings} pers.` : ''}</p>
                  <p className="serif hist-title">{m.title}</p>
                  <div className="thumbs" style={{ marginTop: 8 }}>
                    {m.ingredients.slice(0, 6).map((id) => <img key={id} src={foodImg(id)} alt="" />)}
                  </div>
                </div>
                <button className={`icon-btn${m.favorite ? ' fav' : ''}`} aria-pressed={m.favorite} aria-label={m.favorite ? 'Quitar de favoritos' : 'Guardar en favoritos'} onClick={() => toggleFav(m)}>
                  <IconHeart width={18} height={18} filled={m.favorite} />
                </button>
              </div>
              <div className="hist-acts">
                <button className="btn btn-lime small" onClick={() => onRepeat(m)}>
                  <IconRepeat width={16} height={16} /> Repetir
                </button>
                <div className="rate dark" role="group" aria-label="¿Te gustó?">
                  <button className={m.rating > 0 ? 'on' : ''} aria-pressed={m.rating > 0} aria-label="Me gustó" onClick={() => rate(m, 1)}>
                    <IconThumb width={18} height={18} filled={m.rating > 0} />
                  </button>
                  <button className={m.rating < 0 ? 'on' : ''} aria-pressed={m.rating < 0} aria-label="No me gustó" onClick={() => rate(m, -1)}>
                    <IconThumb width={18} height={18} down filled={m.rating < 0} />
                  </button>
                </div>
                <span style={{ flex: 1 }} />
                <button className="icon-btn" aria-label={`Compartir ${m.title}`} onClick={() => share(m)}>
                  <IconShare width={18} height={18} />
                </button>
                <button className="icon-btn" aria-label={`Borrar ${m.title}`} onClick={() => del(m.id)}>
                  <IconTrash width={18} height={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
