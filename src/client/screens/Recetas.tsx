import { useMemo, useState } from 'react';
import { comboFor, dishLabel, dishPreview, readiness } from '../../shared/chef';
import { DISHES, type Dish, type Tag } from '../../shared/dishes';
import { foodImg, normalize, BY_ID } from '../../shared/ingredients';
import { SLOT_LABEL, SLOTS, type Profile, type Slot } from '../../shared/types';
import { IconSearch, IconTimer } from '../components/Icons';
import { haptic } from '../lib/haptics';

const TAGS: { id: Tag | 'listo'; label: string }[] = [
  { id: 'listo', label: 'Con lo que tengo' },
  { id: 'rapido', label: 'Rápido' },
  { id: 'ligero', label: 'Ligero' },
  { id: 'proteico', label: 'Proteico' },
  { id: 'cuchara', label: 'De cuchara' },
  { id: 'vegetariano', label: 'Vegetariano' },
  { id: 'dulce', label: 'Dulce' },
  { id: 'frio', label: 'Frío' }
];

interface Props {
  profile: Profile;
  onCook: (dish: Dish, ids: string[]) => void;
  toast: (msg: string) => void;
}

/** Recetario: todos los platos que sabe hacer PUCHERO, por comida y etiqueta. */
export function Recetas({ profile, onCook, toast }: Props) {
  const [slot, setSlot] = useState<Slot | 'todas'>('todas');
  const [tag, setTag] = useState<Tag | 'listo' | null>(null);
  const [q, setQ] = useState('');
  const filter = useMemo(() => ({ allergies: profile.allergies, dislikes: profile.dislikes }), [profile.allergies, profile.dislikes]);

  const list = useMemo(() => {
    const n = normalize(q);
    return DISHES.map((dish) => ({ dish, r: readiness(dish, profile.pantry, filter) }))
      .filter(({ dish, r }) => r.possible && (slot === 'todas' || dish.slots.includes(slot)))
      .filter(({ dish }) => !tag || tag === 'listo' || dish.tags.includes(tag))
      .filter(({ r }) => tag !== 'listo' || r.missing.length === 0)
      .filter(({ dish }) => !n || normalize(dishLabel(dish)).includes(n) || dish.core.some((g) => g.of.some((id) => normalize(BY_ID[id]?.name ?? '').includes(n))))
      .sort((a, b) => a.r.missing.length - b.r.missing.length || a.dish.minutes - b.dish.minutes);
  }, [slot, tag, q, profile.pantry, filter]);

  const cook = (dish: Dish) => {
    const ids = comboFor(dish, { ...filter, pantry: profile.pantry, extras: 1 });
    if (!ids) return toast('Con tus alergias o manías este plato no se puede hacer.');
    haptic.drop();
    onCook(dish, ids);
  };

  return (
    <section className="rise">
      <p style={{ margin: '18px 0 0', fontSize: 17, color: '#cfc8bc', lineHeight: 1.4, maxWidth: 520 }}>
        {DISHES.length} platos de verdad. Elige uno y la cazuela se llena sola; luego cambia lo que quieras.
      </p>
      <label className="search" style={{ marginTop: 16 }}>
        <IconSearch width={18} height={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca un plato o un ingrediente…" aria-label="Buscar receta" />
      </label>
      <div className="chips" style={{ marginTop: 12 }} role="tablist" aria-label="Comida">
        {(['todas', ...SLOTS] as const).map((s) => (
          <button key={s} role="tab" aria-selected={slot === s} className={`chip${slot === s ? ' on' : ''}`} onClick={() => { haptic.tap(); setSlot(s); }}>
            {s === 'todas' ? 'Todas' : SLOT_LABEL[s]}
          </button>
        ))}
      </div>
      <div className="chips" style={{ marginTop: 8 }} aria-label="Etiquetas">
        {TAGS.filter((t) => t.id !== 'listo' || profile.pantry.length > 0).map((t) => (
          <button key={t.id} className={`chip${tag === t.id ? ' on' : ''}${t.id === 'listo' ? ' fridge' : ''}`} aria-pressed={tag === t.id} onClick={() => { haptic.tap(); setTag(tag === t.id ? null : t.id); }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="recetas">
        {list.length === 0 && <p className="serif" style={{ fontSize: 30, color: '#cfc8bc', margin: '20px 0 0' }}>Nada con esos filtros.</p>}
        {list.map(({ dish, r }) => (
          <article key={dish.id} className="receta">
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="mono" style={{ fontSize: 11 }}>
                {dish.slots.map((s) => SLOT_LABEL[s]).join(' · ')}
              </p>
              <h3 className="serif receta-t">{dishLabel(dish)}</h3>
              <div className="thumbs" style={{ marginTop: 8 }}>
                {dishPreview(dish).map((id) => <img key={id} src={foodImg(id)} alt="" />)}
              </div>
              <p className="receta-m">
                <IconTimer width={14} height={14} /> {dish.minutes} min
                {profile.pantry.length > 0 && (
                  <span className={r.missing.length ? 'miss' : 'ok'}>
                    {r.missing.length ? `Te falta ${r.missing.map((id) => BY_ID[id].name.toLowerCase()).join(' y ')}` : '¡Ya puedes!'}
                  </span>
                )}
              </p>
            </div>
            <button className="btn btn-lime plan-cook" onClick={() => cook(dish)}>
              Cocinar
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
