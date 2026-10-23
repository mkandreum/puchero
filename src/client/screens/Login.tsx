import { useState, type FormEvent } from 'react';
import { foodImg } from '../../shared/ingredients';
import type { Profile } from '../../shared/types';
import { IconArrow } from '../components/Icons';
import { api } from '../lib/api';
import { haptic } from '../lib/haptics';

type Mode = 'login' | 'register';

// Ingredientes que flotan sobre el titular: posición (%), tamaño (px), giro y retardo.
const FLOAT: [string, number, number, number, number, number][] = [
  ['tomate', 74, 4, 78, -14, 0],
  ['aguacate', 6, 30, 64, 12, 0.6],
  ['platano', 80, 40, 70, 22, 1.2],
  ['huevo', 50, 18, 52, -8, 0.3],
  ['brocoli', 30, 2, 58, 18, 0.9],
  ['fresa', 60, 58, 50, -20, 1.5],
  ['avena', 14, 64, 56, 8, 0.4]
];

export function Login({ onAuthed }: { onAuthed: (p: Profile) => void }) {
  const [mode, setMode] = useState<Mode>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popped, setPopped] = useState<string | null>(null);

  const isNew = mode === 'register';

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    haptic.tap();
    setMode(m);
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const p = isNew ? await api.register(name, email, password) : await api.login(email, password);
      haptic.success();
      onAuthed(p);
    } catch (err) {
      haptic.error();
      setError((err as Error).message || 'Algo ha fallado. Prueba otra vez.');
    } finally {
      setBusy(false);
    }
  };

  const pop = (id: string) => {
    haptic.drop();
    setPopped(null);
    requestAnimationFrame(() => setPopped(id));
  };

  return (
    <div className={`auth ${isNew ? 'is-new' : 'is-back'}`}>
      <section className="auth-hero" aria-hidden="true">
        <div className="auth-float">
          {FLOAT.map(([id, x, y, size, rot, delay]) => (
            <button
              key={id}
              type="button"
              tabIndex={-1}
              className={`auth-food${popped === id ? ' pop' : ''}`}
              style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, ['--r' as string]: `${rot}deg`, animationDelay: `${delay}s` }}
              onClick={() => pop(id)}
            >
              <img src={foodImg(id)} alt="" draggable={false} />
            </button>
          ))}
        </div>
        <p className="auth-word">PUCHERO</p>
        <p className="serif auth-slogan">
          come bien
          <br />
          sin drama.
        </p>
      </section>

      <section className="auth-card" aria-label={isNew ? 'Crear cuenta' : 'Entrar'}>
        <div className="auth-switch" role="tablist">
          <button role="tab" aria-selected={isNew} className={isNew ? 'on' : ''} onClick={() => switchMode('register')}>
            Soy nuevo
          </button>
          <button role="tab" aria-selected={!isNew} className={!isNew ? 'on' : ''} onClick={() => switchMode('login')}>
            Ya tengo cuenta
          </button>
        </div>

        <h1 className="auth-title">
          {isNew ? 'Abre tu' : 'Vuelve a'}
          <span className="serif">{isNew ? 'cazuela.' : 'la cocina.'}</span>
        </h1>

        <form className="auth-form" onSubmit={submit} noValidate>
          {isNew && (
            <label className="field">
              <span>Cómo te llamamos</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={40} required placeholder="Tu nombre" />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
            />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <div className="field-pass">
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete={isNew ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={isNew ? 8 : undefined}
                required
                placeholder={isNew ? 'Mínimo 8 caracteres' : '••••••••'}
              />
              <button type="button" className="field-eye" onClick={() => setShowPass((v) => !v)} aria-pressed={showPass}>
                {showPass ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </label>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button className="btn auth-go" disabled={busy || !email || !password || (isNew && !name.trim())}>
            {busy ? (isNew ? 'Encendiendo el fuego…' : 'Entrando…') : isNew ? 'Crear cuenta' : 'Entrar'}
            {!busy && <IconArrow width={22} height={22} />}
          </button>
        </form>

        <p className="auth-foot">
          {isNew ? 'Tu racha y tus manías, guardadas en cualquier móvil.' : 'Tu racha te estaba esperando.'}
        </p>
      </section>
    </div>
  );
}
