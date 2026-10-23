import { useState } from 'react';
import { ALLERGIES, CATEGORIES, foodImg, INGREDIENTS } from '../../shared/ingredients';
import { SLOTS, type Goal, type Profile, type Skill, type Slot } from '../../shared/types';
import { IconArrow } from '../components/Icons';
import { haptic } from '../lib/haptics';

const GOALS: { id: Goal; label: string; text: string; img: string }[] = [
  { id: 'verde', label: 'Más verde', text: 'Verdura camuflada en todo', img: 'brocoli' },
  { id: 'proteina', label: 'Más proteína', text: 'Platos que llenan de verdad', img: 'pollo' },
  { id: 'rapido', label: 'Rapidísimo', text: 'Pocos pasos, cero excusas', img: 'huevo' }
];

export const SLOT_INFO: Record<Slot, { label: string; img: string; text: string }> = {
  desayuno: { label: 'Desayuno', img: 'avena', text: 'Avena, fruta, tostadas' },
  comida: { label: 'Comida', img: 'plato', text: 'El plato fuerte' },
  merienda: { label: 'Merienda', img: 'manzana', text: 'Algo rico a media tarde' },
  cena: { label: 'Cena', img: 'pescado', text: 'Ligera y sin líos' }
};

const SKILLS: { id: Skill; label: string; text: string }[] = [
  { id: 'cero', label: 'Cero patatero', text: 'Te lo explico todo, paso a paso' },
  { id: 'apano', label: 'Me apaño', text: 'Lo normal: sé encender un fuego' },
  { id: 'chef', label: 'Chef en potencia', text: 'Dame algo con más gracia' }
];

type Step = 'hola' | 'goal' | 'slots' | 'skill' | 'allergies' | 'dislikes';
const STEPS: Step[] = ['hola', 'goal', 'slots', 'skill', 'allergies', 'dislikes'];
const BG: Record<Step, string> = {
  hola: 'var(--tomato)',
  goal: 'var(--ink)',
  slots: 'var(--lilac)',
  skill: 'var(--butter)',
  allergies: 'var(--ink)',
  dislikes: 'var(--lime)'
};
const LIGHT = new Set<Step>(['hola', 'slots', 'skill', 'dislikes']);

export function Onboarding({ profile, onDone }: { profile: Profile; onDone: (p: Profile) => void }) {
  const [i, setI] = useState(0);
  const [p, setP] = useState<Profile>(profile);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  const go = (d: number) => {
    haptic.tap();
    setI((n) => Math.max(0, Math.min(STEPS.length - 1, n + d)));
  };
  const finish = (skipped = false) => {
    haptic.success();
    onDone({ ...(skipped ? profile : p), onboarded: true });
  };
  const set = (patch: Partial<Profile>) => {
    haptic.tap();
    setP((cur) => ({ ...cur, ...patch }));
  };
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const canNext = step !== 'slots' || p.slots.length > 0;

  return (
    <div className={`ob${LIGHT.has(step) ? ' light' : ''}`} style={{ background: BG[step] }}>
      <header className="ob-top">
        <div className="ob-bars" aria-label={`Paso ${i + 1} de ${STEPS.length}`}>
          {STEPS.map((s, n) => (
            <span key={s} className={n <= i ? 'on' : ''} />
          ))}
        </div>
        <button className="ob-skip" onClick={() => finish(true)}>
          Saltar
        </button>
      </header>

      <main className="ob-body" key={step}>
        {step === 'hola' && (
          <>
            <h1 className="ob-title ob-huge">
              Hola,
              <span className="serif">{p.name || 'cocinillas'}.</span>
            </h1>
            <p className="ob-lead">Cinco preguntas rápidas y la cazuela ya sabe lo que te gusta, lo que odias y lo que no puedes comer.</p>
            <div className="ob-plate">
              {['tomate', 'avena', 'pollo', 'fresa', 'brocoli'].map((id, n) => (
                <img key={id} src={foodImg(id)} alt="" style={{ animationDelay: `${0.15 + n * 0.08}s` }} />
              ))}
            </div>
          </>
        )}

        {step === 'goal' && (
          <>
            <h1 className="ob-title">
              ¿Qué buscas
              <span className="serif">en el plato?</span>
            </h1>
            <div className="ob-list">
              {GOALS.map((g) => (
                <button key={g.id} className={`ob-opt${p.goal === g.id ? ' on' : ''}`} aria-pressed={p.goal === g.id} onClick={() => set({ goal: g.id })}>
                  <img src={foodImg(g.img)} alt="" />
                  <span>
                    <b>{g.label}</b>
                    <small>{g.text}</small>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'slots' && (
          <>
            <h1 className="ob-title">
              ¿Qué comidas
              <span className="serif">te cuestan más?</span>
            </h1>
            <p className="ob-lead">Marca todas las que quieras resolver con PUCHERO.</p>
            <div className="ob-grid2">
              {SLOTS.map((s) => {
                const on = p.slots.includes(s);
                return (
                  <button key={s} className={`ob-slot${on ? ' on' : ''}`} aria-pressed={on} onClick={() => set({ slots: toggle(p.slots, s) })}>
                    <img src={foodImg(SLOT_INFO[s].img)} alt="" />
                    <b>{SLOT_INFO[s].label}</b>
                    <small>{SLOT_INFO[s].text}</small>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 'skill' && (
          <>
            <h1 className="ob-title">
              En la cocina
              <span className="serif">eres…</span>
            </h1>
            <div className="ob-list">
              {SKILLS.map((s) => (
                <button key={s.id} className={`ob-opt${p.skill === s.id ? ' on' : ''}`} aria-pressed={p.skill === s.id} onClick={() => set({ skill: s.id })}>
                  <span>
                    <b>{s.label}</b>
                    <small>{s.text}</small>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'allergies' && (
          <>
            <h1 className="ob-title">
              ¿Algo que
              <span className="serif" style={{ color: 'var(--tomato)' }}>no puedes comer?</span>
            </h1>
            <p className="ob-lead">Alergias o intolerancias. Esos alimentos no aparecerán en tu súper.</p>
            <div className="ob-chips">
              <button className={`ob-chip${p.allergies.length === 0 ? ' on' : ''}`} aria-pressed={p.allergies.length === 0} onClick={() => set({ allergies: [] })}>
                Nada, como de todo
              </button>
              {ALLERGIES.map((a) => {
                const on = p.allergies.includes(a.id);
                return (
                  <button key={a.id} className={`ob-chip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => set({ allergies: toggle(p.allergies, a.id) })}>
                    {a.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 'dislikes' && (
          <>
            <h1 className="ob-title">
              Y lo que
              <span className="serif">no soportas.</span>
            </h1>
            <p className="ob-lead">Sin vergüenza. Si acaba en la cazuela, la receta lo esconde.</p>
            {CATEGORIES.map((c) => (
              <section key={c.id}>
                <p className="mono ob-cat">{c.label}</p>
                <div className="grid-food ob-food">
                  {INGREDIENTS.filter((it) => it.cat === c.id).map((it) => {
                    const hated = p.dislikes.includes(it.id);
                    return (
                      <button
                        key={it.id}
                        className={`tile${hated ? ' hated' : ''}`}
                        aria-pressed={hated}
                        aria-label={`${it.name}: ${hated ? 'no me gusta' : 'me vale'}`}
                        style={{ background: 'var(--paper)', touchAction: 'auto', cursor: 'pointer' }}
                        onClick={() => set({ dislikes: toggle(p.dislikes, it.id) })}
                      >
                        <img src={foodImg(it.id)} alt="" />
                        <span>{it.name}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </>
        )}
      </main>

      <footer className="ob-foot">
        {i > 0 && (
          <button className="btn btn-line ob-back" onClick={() => go(-1)}>
            Atrás
          </button>
        )}
        <button className="btn ob-next" disabled={!canNext} onClick={() => (last ? finish() : go(1))}>
          {i === 0 ? 'Vamos' : last ? 'A la cazuela' : 'Siguiente'} <IconArrow width={20} height={20} />
        </button>
      </footer>
    </div>
  );
}
