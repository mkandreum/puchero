import { useCallback, useEffect, useRef, useState } from 'react';
import { surpriseCombo } from '../shared/chef';
import type { Dish } from '../shared/dishes';
import { slotForHour, type Meal, type PlanItem, type Profile, type Recipe, type Slot, type TodayData } from '../shared/types';
import { Celebration } from './components/Celebration';
import { IconCalendar, IconDice, IconFlame, IconPot, IconSun, IconUser } from './components/Icons';
import { api, auth } from './lib/api';
import { haptic } from './lib/haptics';
import { registerSW } from './lib/push';
import { Hoy } from './screens/Hoy';
import { Kitchen } from './screens/Kitchen';
import { Login } from './screens/Login';
import { Onboarding } from './screens/Onboarding';
import { Racha } from './screens/Racha';
import { Semana } from './screens/Semana';
import { Yo } from './screens/Yo';

type Tab = 'hoy' | 'cocina' | 'semana' | 'racha' | 'yo';

const TABS: { id: Tab; label: string; Icon: typeof IconSun }[] = [
  { id: 'hoy', label: 'Hoy', Icon: IconSun },
  { id: 'cocina', label: 'Cocina', Icon: IconPot },
  { id: 'semana', label: 'Semana', Icon: IconCalendar },
  { id: 'racha', label: 'Racha', Icon: IconFlame },
  { id: 'yo', label: 'Yo', Icon: IconUser }
];

const pick = <T,>(arr: T[], n: number) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

function readTab(): Tab {
  const h = location.hash.replace('#', '') as Tab;
  return TABS.some((t) => t.id === h) ? h : 'hoy';
}

type Gate = 'loading' | 'login' | 'onboarding' | 'app';

export function App() {
  const [gate, setGate] = useState<Gate>(auth.token ? 'loading' : 'login');
  const [tab, setTabState] = useState<Tab>(readTab);
  const [cart, setCart] = useState<string[]>([]);
  const [slot, setSlot] = useState<Slot>(() => slotForHour(new Date().getHours()));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [today, setToday] = useState<TodayData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [kitchenKey, setKitchenKey] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [party, setParty] = useState<{ n: number; ids: string[] } | null>(null);
  const [diceSpin, setDiceSpin] = useState(0);
  /** Plato que se repite desde el historial: la cocina abre directamente en el plato */
  const [replay, setReplay] = useState<Recipe | null>(null);
  const partyTimer = useRef<number | undefined>(undefined);
  const toastTimer = useRef<number | undefined>(undefined);
  const saveTimer = useRef<number | undefined>(undefined);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const setTab = (t: Tab) => {
    if (t !== tab) haptic.tap();
    setTabState(t);
    history.replaceState(null, '', `#${t}`);
  };

  const loadToday = useCallback(() => {
    api.today().then(setToday).catch(() =>
      setToday(
        (prev) =>
          prev ?? { date: new Date().toISOString().slice(0, 10), challenge: 'Mete algo verde en cada comida de hoy.', streak: 0, best: 0, total: 0, week: [], meals: [], water: 0, freezes: 1, plan: [] }
      )
    );
  }, []);

  const enter = useCallback(
    (p: Profile) => {
      setProfile(p);
      setGate(p.onboarded ? 'app' : 'onboarding');
      if (p.onboarded) loadToday();
    },
    [loadToday]
  );

  const logout = useCallback(() => {
    auth.set(null);
    setProfile(null);
    setToday(null);
    setCart([]);
    setGate('login');
  }, []);

  const boot = useCallback(() => {
    if (!auth.token) return;
    setOffline(false);
    api.me().then(enter).catch(() => {
      // Sin conexión con sesión guardada: no echamos al usuario, le dejamos reintentar.
      if (!auth.token) setGate('login');
      else setOffline(true);
    });
  }, [enter]);

  useEffect(() => {
    registerSW();
    boot();
    const offExpired = auth.onExpired(() => {
      logout();
      toast('Tu sesión ha caducado. Vuelve a entrar.');
    });
    const onHash = () => setTabState(readTab());
    window.addEventListener('hashchange', onHash);
    return () => {
      offExpired();
      window.removeEventListener('hashchange', onHash);
    };
  }, [boot, logout, toast]);

  const changeProfile = (p: Profile) => {
    setProfile(p);
    clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      api.saveMe(p).catch(() => toast('Sin conexión: no se ha guardado tu perfil'));
    }, 500);
  };

  const finishOnboarding = async (p: Profile) => {
    setProfile(p);
    setGate('app');
    loadToday();
    const first = p.slots.includes(slot) ? slot : p.slots[0] ?? slot;
    setSlot(first);
    setTab('cocina');
    try {
      setProfile(await api.saveMe(p));
    } catch {
      toast('Sin conexión: no se ha guardado tu perfil');
    }
  };

  const cook = (s?: Slot) => {
    if (s && s !== slot) {
      setSlot(s);
      setCart([]);
      setKitchenKey((k) => k + 1);
    }
    setTab('cocina');
  };

  const surprise = () => {
    if (!profile) return;
    haptic.drop();
    setDiceSpin((n) => n + 1);
    const choice = surpriseCombo(slot, { pantry: profile.pantry, goal: profile.goal, allergies: profile.allergies, dislikes: profile.dislikes });
    setCart(choice);
    setReplay(null);
    setKitchenKey((k) => k + 1);
    setTab('cocina');
    toast('Cazuela sorpresa. ¡A remover!');
  };

  /** Cocinar lo que toca del plan: misma comida e ingredientes, a remover. */
  const cookPlan = (it: PlanItem) => {
    setSlot(it.slot);
    setCart(it.ingredients);
    setReplay(null);
    setKitchenKey((k) => k + 1);
    setTab('cocina');
  };

  /** Cocinar un plato del recetario: la cazuela se llena sola. */
  const cookDish = (dish: Dish, ids: string[]) => {
    if (!dish.slots.includes(slot)) setSlot(dish.slots[0]);
    setCart(ids);
    setReplay(null);
    setKitchenKey((k) => k + 1);
    setTab('cocina');
  };

  /** Repetir un plato guardado: se abre ya emplatado, listo para "Me lo como". */
  const repeat = (m: Meal) => {
    haptic.drop();
    setSlot(m.slot);
    setCart(m.ingredients);
    setReplay({ ...m, servings: m.servings || profile?.servings || 1 });
    setKitchenKey((k) => k + 1);
    setTab('cocina');
  };

  const saved = (ids: string[] = []) => {
    setReplay(null);
    setParty((p) => ({ n: (p?.n ?? 0) + 1, ids }));
    clearTimeout(partyTimer.current);
    partyTimer.current = window.setTimeout(() => setParty(null), 1900);
    loadToday();
    setRefreshKey((k) => k + 1);
    setTab('hoy');
  };

  if (gate === 'login') return <Login onAuthed={enter} />;
  if (gate === 'loading' || !profile)
    return (
      <div className="splash" aria-busy="true">
        <b>PUCHERO</b>
        <span className="serif">{offline ? 'sin conexión.' : 'calentando…'}</span>
        {offline && (
          <button className="btn btn-lime" style={{ marginTop: 24 }} onClick={boot}>
            Reintentar
          </button>
        )}
      </div>
    );
  if (gate === 'onboarding') return <Onboarding profile={profile} onDone={finishOnboarding} />;

  return (
    <div className="app">
      <aside className="sidebar" aria-label="Menú">
        <div className="brand">
          <b>PUCHERO</b>
          <span>come bien sin drama.</span>
        </div>
        <nav className="side-nav">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} className={`side-item${tab === id ? ' on' : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
              <Icon width={24} height={24} /> {label}
            </button>
          ))}
        </nav>
        <div className="side-streak">
          <IconFlame width={22} height={22} style={{ color: 'var(--tomato)' }} />
          <strong>{today?.streak ?? 0}</strong>
          <span style={{ fontWeight: 700 }}>{today?.streak === 1 ? 'día seguido' : 'días seguidos'}</span>
        </div>
        <button className="side-cta" onClick={surprise}>
          <IconDice width={22} height={22} /> Sorpréndeme
        </button>
      </aside>

      <main className="main">
        {tab === 'hoy' && (
          <Hoy
            data={today}
            profile={profile}
            onCook={cook}
            onCookPlan={cookPlan}
            onWater={(glasses) => setToday((d) => (d ? { ...d, water: glasses } : d))}
            onRated={loadToday}
            toast={toast}
          />
        )}
        {tab === 'cocina' && (
          <Kitchen
            key={kitchenKey}
            cart={cart}
            setCart={setCart}
            slot={slot}
            setSlot={setSlot}
            profile={profile}
            replay={replay}
            onSaved={saved}
            toast={toast}
          />
        )}
        {tab === 'semana' && <Semana profile={profile} onChange={changeProfile} onCookPlan={cookPlan} onCookDish={cookDish} toast={toast} />}
        {tab === 'racha' && <Racha data={today} refreshKey={refreshKey} onChanged={loadToday} onRepeat={repeat} toast={toast} />}
        {tab === 'yo' && <Yo profile={profile} onChange={changeProfile} onLogout={logout} toast={toast} />}
      </main>

      <nav className="pill-nav" aria-label="Navegación">
        <div className="pill" style={{ ['--i' as string]: TABS.findIndex((t) => t.id === tab) }}>
          <span className="pill-ind" aria-hidden="true" />
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} className={`pill-tab${tab === id ? ' on' : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
              <Icon width={21} height={21} /> {label}
            </button>
          ))}
        </div>
        <button className="pill-fab" aria-label="Sorpréndeme: cazuela al azar" onClick={surprise}>
          <IconDice key={diceSpin} className={diceSpin ? 'dice-roll' : undefined} width={26} height={26} />
        </button>
      </nav>

      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
      {party && <Celebration key={party.n} seed={party.n} ids={party.ids} />}
    </div>
  );
}
