import { useState, type FormEvent } from 'react';
import { ALLERGIES, CATEGORIES, foodImg, INGREDIENTS } from '../../shared/ingredients';
import { SLOTS, type Goal, type Profile, type Skill } from '../../shared/types';
import { api } from '../lib/api';
import { haptic } from '../lib/haptics';
import { SLOT_INFO } from './Onboarding';

const GOALS: { id: Goal; label: string; text: string }[] = [
  { id: 'verde', label: 'Más verde', text: 'Verdura camuflada en todo' },
  { id: 'proteina', label: 'Más proteína', text: 'Platos que llenan de verdad' },
  { id: 'rapido', label: 'Rapidísimo', text: 'Pocos pasos, cero excusas' }
];

const SKILLS: { id: Skill; label: string }[] = [
  { id: 'cero', label: 'Cero patatero' },
  { id: 'apano', label: 'Me apaño' },
  { id: 'chef', label: 'Chef en potencia' }
];

interface Props {
  profile: Profile;
  onChange: (p: Profile) => void;
  onLogout: () => void;
  toast: (msg: string) => void;
}

export function Yo({ profile, onChange, onLogout, toast }: Props) {
  const toggle = (id: string) => {
    haptic.tap();
    const dislikes = profile.dislikes.includes(id) ? profile.dislikes.filter((d) => d !== id) : [...profile.dislikes, id];
    onChange({ ...profile, dislikes });
  };
  const flip = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="screen">
      <div className="wrap rise">
        <p className="mono">Tu perfil{profile.name ? ` · ${profile.name}` : ''}</p>
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

        <p className="mono" style={{ margin: '30px 0 12px' }}>Mis comidas</p>
        <div className="chips wrap-chips">
          {SLOTS.map((s) => {
            const on = profile.slots.includes(s);
            return (
              <button
                key={s}
                className={`chip${on ? ' on' : ''}`}
                aria-pressed={on}
                onClick={() => {
                  const slots = flip(profile.slots, s);
                  if (!slots.length) return toast('Deja al menos una comida.');
                  haptic.tap();
                  onChange({ ...profile, slots });
                }}
              >
                {SLOT_INFO[s].label}
              </button>
            );
          })}
        </div>

        <p className="mono" style={{ margin: '30px 0 12px' }}>En la cocina soy</p>
        <div className="chips wrap-chips">
          {SKILLS.map((s) => (
            <button key={s.id} className={`chip${profile.skill === s.id ? ' on' : ''}`} aria-pressed={profile.skill === s.id} onClick={() => { haptic.tap(); onChange({ ...profile, skill: s.id }); }}>
              {s.label}
            </button>
          ))}
        </div>

        <p className="mono" style={{ margin: '30px 0 12px' }}>Alergias e intolerancias</p>
        <div className="chips wrap-chips">
          {ALLERGIES.map((a) => {
            const on = profile.allergies.includes(a.id);
            return (
              <button key={a.id} className={`chip${on ? ' on danger' : ''}`} aria-pressed={on} onClick={() => { haptic.tap(); onChange({ ...profile, allergies: flip(profile.allergies, a.id) }); }}>
                {a.label}
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

        <Account profile={profile} onLogout={onLogout} toast={toast} />
      </div>
    </div>
  );
}

function Account({ profile, onLogout, toast }: { profile: Profile; onLogout: () => void; toast: (m: string) => void }) {
  const [open, setOpen] = useState<'pass' | 'delete' | null>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const show = (o: 'pass' | 'delete') => {
    haptic.tap();
    setOpen(open === o ? null : o);
    setCurrent('');
    setNext('');
    setError(null);
  };

  const run = async (e: FormEvent, fn: () => Promise<unknown>, ok: string, after?: () => void) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fn();
      haptic.success();
      toast(ok);
      setOpen(null);
      after?.();
    } catch (err) {
      haptic.error();
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="account">
      <p className="mono" style={{ margin: '40px 0 12px' }}>Tu cuenta</p>
      <div className="account-card">
        <div style={{ minWidth: 0 }}>
          <p className="serif" style={{ fontSize: 34, margin: 0, lineHeight: 1 }}>{profile.name || 'Cocinillas'}</p>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.email}</p>
        </div>
        <button className="btn btn-lime" onClick={() => { haptic.tap(); onLogout(); }}>
          Salir
        </button>
      </div>

      <div className="chips wrap-chips" style={{ marginTop: 12 }}>
        <button className={`chip${open === 'pass' ? ' on' : ''}`} onClick={() => show('pass')}>Cambiar contraseña</button>
        <button
          className="chip"
          onClick={async () => {
            try {
              await api.logoutAll();
              toast('Sesión cerrada en el resto de dispositivos.');
            } catch (err) {
              toast((err as Error).message);
            }
          }}
        >
          Cerrar sesión en todos
        </button>
        <button className={`chip${open === 'delete' ? ' on danger' : ''}`} onClick={() => show('delete')}>Borrar cuenta</button>
      </div>

      {open === 'pass' && (
        <form className="account-form" onSubmit={(e) => run(e, () => api.changePassword(current, next), 'Contraseña cambiada.')}>
          <label className="field dark">
            <span>Contraseña actual</span>
            <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </label>
          <label className="field dark">
            <span>Nueva (mínimo 8)</span>
            <input type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="btn btn-lime" disabled={busy || !current || next.length < 8}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
        </form>
      )}

      {open === 'delete' && (
        <form className="account-form" onSubmit={(e) => run(e, () => api.deleteAccount(current), 'Cuenta borrada. Hasta pronto.', onLogout)}>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.35 }}>
            Se borran tu cuenta, tu racha y todos tus platos. No se puede deshacer.
          </p>
          <label className="field dark">
            <span>Escribe tu contraseña para confirmar</span>
            <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="btn" style={{ background: 'var(--tomato)', color: 'var(--ink)' }} disabled={busy || !current}>
            {busy ? 'Borrando…' : 'Borrar mi cuenta para siempre'}
          </button>
        </form>
      )}
    </section>
  );
}
