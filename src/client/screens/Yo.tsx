import { CATEGORIES, foodImg, INGREDIENTS } from '../../shared/ingredients';
import type { Goal, Profile } from '../../shared/types';
import { haptic } from '../lib/haptics';

const GOALS: { id: Goal; label: string; text: string }[] = [
  { id: 'verde', label: 'Más verde', text: 'Verdura camuflada en todo' },
  { id: 'proteina', label: 'Más proteína', text: 'Platos que llenan de verdad' },
  { id: 'rapido', label: 'Rapidísimo', text: 'Pocos pasos, cero excusas' }
];

export function Yo({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
  const toggle = (id: string) => {
    haptic.tap();
    const dislikes = profile.dislikes.includes(id) ? profile.dislikes.filter((d) => d !== id) : [...profile.dislikes, id];
    onChange({ ...profile, dislikes });
  };

  return (
    <div className="screen">
      <div className="wrap">
        <p className="mono">Tu perfil</p>
        <h1 className="h-lg" style={{ marginTop: 10, fontSize: 'clamp(56px, 15vw, 120px)' }}>
          LO QUE
          <span className="serif" style={{ display: 'block', color: 'var(--tomato)', letterSpacing: '-.01em' }}>no soportas.</span>
        </h1>
        <p style={{ margin: '14px 0 0', fontSize: 18, lineHeight: 1.35, color: '#cfc8bc', maxWidth: 520 }}>
          Márcalo sin vergüenza. Cuando lo metas en la cazuela, la receta lo esconderá para que ni lo notes.
        </p>

        <p className="mono" style={{ margin: '30px 0 12px' }}>Objetivo</p>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', maxWidth: 820 }}>
          {GOALS.map((g) => {
            const on = profile.goal === g.id;
            return (
              <button
                key={g.id}
                className="card"
                aria-pressed={on}
                onClick={() => { haptic.tap(); onChange({ ...profile, goal: g.id }); }}
                style={{ border: 0, textAlign: 'left', background: on ? 'var(--lime)' : 'var(--ink-2)', color: on ? 'var(--ink)' : 'var(--paper)', transition: 'background .2s' }}
              >
                <b style={{ display: 'block', fontSize: 24, fontWeight: 800 }}>{g.label}</b>
                <span style={{ fontSize: 15, opacity: 0.8 }}>{g.text}</span>
              </button>
            );
          })}
        </div>

        {CATEGORIES.map((c) => (
          <section key={c.id}>
            <p className="mono" style={{ margin: '30px 0 12px' }}>{c.label}</p>
            <div className="grid-food" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))' }}>
              {INGREDIENTS.filter((i) => i.cat === c.id).map((it) => {
                const hated = profile.dislikes.includes(it.id);
                return (
                  <button
                    key={it.id}
                    className={`tile${hated ? ' hated' : ''}`}
                    aria-pressed={hated}
                    aria-label={`${it.name}: ${hated ? 'no me gusta' : 'me vale'}`}
                    style={{ background: 'var(--paper)', touchAction: 'auto', cursor: 'pointer' }}
                    onClick={() => toggle(it.id)}
                  >
                    <img src={foodImg(it.id)} alt="" />
                    <span>{it.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        <p className="mono" style={{ marginTop: 30, lineHeight: 1.6, textTransform: 'none', letterSpacing: '.02em' }}>
          Sin cuentas ni contraseñas: tu perfil va ligado a este dispositivo.
        </p>
      </div>
    </div>
  );
}
