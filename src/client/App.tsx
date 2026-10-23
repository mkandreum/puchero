import { useCallback, useEffect, useRef, useState } from 'react';
import { INGREDIENTS } from '../shared/ingredients';
import type { Profile, TodayData } from '../shared/types';
import { IconDice, IconFlame, IconPot, IconSun, IconUser } from './components/Icons';
import { api } from './lib/api';
import { haptic } from './lib/haptics';
import { Hoy } from './screens/Hoy';
import { Kitchen } from './screens/Kitchen';
import { Racha } from './screens/Racha';
import { Yo } from './screens/Yo';

type Tab = 'hoy' | 'cocina' | 'racha' | 'yo';

const TABS: { id: Tab; label: string; Icon: typeof IconSun }[] = [
  { id: 'hoy', label: 'Hoy', Icon: IconSun },
  { id: 'cocina', label: 'Cocina', Icon: IconPot },
  { id: 'racha', label: 'Racha', Icon: IconFlame },
  { id: 'yo', label: 'Yo', Icon: IconUser }
];

const pick = <T,>(arr: T[], n: number) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

function readTab(): Tab {
  const h = location.hash.replace('#', '') as Tab;
  return TABS.some((t) => t.id === h) ? h : 'hoy';
}

export function App() {
  const [tab, setTabState] = useState<Tab>(readTab);
  const [cart, setCart] = useState<string[]>([]);
  const [profile, setProfile] = useState<Profile>({ dislikes: [], goal: 'verde' });
  const [today, setToday] = useState<TodayData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [kitchenKey, setKitchenKey] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number>();
  const saveTimer = useRef<number>();

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
      setToday((prev) => prev ?? { date: new Date().toISOString().slice(0, 10), challenge: 'Mete algo verde en cada comida de hoy.', streak: 0, best: 0, total: 0, week: [], meals: [] })
    );
  }, []);

  useEffect(() => {
    loadToday();
    api.me().then(setProfile).catch(() => undefined);
    const onHash = () => setTabState(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [loadToday]);

  const changeProfile = (p: Profile) => {
    setProfile(p);
    clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      api.saveMe(p).catch(() => toast('Sin conexión: no se ha guardado tu perfil'));
    }, 500);
  };

  const surprise = () => {
    haptic.drop();
    const ok = INGREDIENTS.filter((i) => !profile.dislikes.includes(i.id));
    const by = (c: string) => ok.filter((i) => i.cat === c);
    const greens = by('verdura').filter((i) => i.green);
    const choice = [
      ...pick(by('base').filter((i) => ['arroz', 'pasta', 'patata', 'pan'].includes(i.id)), 1),
      ...pick(by('proteina'), 1),
      ...pick(greens.length ? greens : by('verdura'), 1),
      ...pick(by('verdura').filter((i) => !i.green), 1)
    ].map((i) => i.id);
    setCart([...new Set(choice)]);
    setKitchenKey((k) => k + 1);
    setTab('cocina');
    toast('Cazuela sorpresa. ¡A remover!');
  };

  const saved = () => {
    loadToday();
    setRefreshKey((k) => k + 1);
    setTab('hoy');
  };

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
        {tab === 'hoy' && <Hoy data={today} onCook={() => setTab('cocina')} />}
        {tab === 'cocina' && <Kitchen key={kitchenKey} cart={cart} setCart={setCart} dislikes={profile.dislikes} onSaved={saved} toast={toast} />}
        {tab === 'racha' && <Racha data={today} refreshKey={refreshKey} onChanged={() => { loadToday(); }} />}
        {tab === 'yo' && <Yo profile={profile} onChange={changeProfile} />}
      </main>

      <nav className="pill-nav" aria-label="Navegación">
        <div className="pill">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} className={`pill-tab${tab === id ? ' on' : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
              <Icon width={21} height={21} /> {label}
            </button>
          ))}
        </div>
        <button className="pill-fab" aria-label="Sorpréndeme: cazuela al azar" onClick={surprise}>
          <IconDice width={26} height={26} />
        </button>
      </nav>

      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </div>
  );
}
