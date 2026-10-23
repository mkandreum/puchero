import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BY_ID, CATEGORIES, foodImg, INGREDIENTS } from '../../shared/ingredients';
import { SLOT_LABEL, type Plan, type PlanItem, type Profile, type ShoppingItem } from '../../shared/types';
import { IconArrow, IconCamera, IconCart, IconCheck, IconPlus, IconSwap, IconX } from '../components/Icons';
import { api } from '../lib/api';
import { haptic } from '../lib/haptics';

type Section = 'plan' | 'compra' | 'nevera';

const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' });

/** Reduce una foto a ~1280 px en JPEG para mandarla a la IA sin gastar datos. */
async function photoToDataUrl(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.8);
}

interface Props {
  profile: Profile;
  onChange: (p: Profile) => void;
  onCookPlan: (item: PlanItem) => void;
  toast: (msg: string) => void;
}

export function Semana({ profile, onChange, onCookPlan, toast }: Props) {
  const [section, setSection] = useState<Section>('plan');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [shopping, setShopping] = useState<ShoppingItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const today = new Date().toLocaleDateString('en-CA');

  useEffect(() => {
    api.plan().then(setPlan).catch(() => toast('Sin conexión: no se ha cargado el plan'));
    api.shopping().then(setShopping).catch(() => setShopping([]));
  }, [toast]);

  const pick = (s: Section) => {
    if (s === section) return;
    haptic.tap();
    setSection(s);
  };

  const regenerate = async () => {
    haptic.drop();
    setBusy(true);
    try {
      setPlan(await api.newPlan());
      toast('Plan nuevo. ¡Que aproveche la semana!');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const swap = async (it: PlanItem) => {
    haptic.tap();
    try {
      setPlan(await api.swapPlan(it.date, it.slot));
    } catch (e) {
      toast((e as Error).message);
    }
  };

  // ── Lista de la compra ──
  const persist = (items: ShoppingItem[]) => {
    setShopping(items);
    clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => api.saveShopping(items).catch(() => toast('Sin conexión: la lista no se ha guardado')), 400);
  };
  const toggleItem = (id: string) => {
    if (!shopping) return;
    const items = shopping.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
    const it = items.find((i) => i.id === id);
    haptic[it?.done ? 'drop' : 'tap']();
    persist(items);
    // Lo comprado pasa a la nevera
    if (it?.done && BY_ID[id] && !profile.pantry.includes(id)) onChange({ ...profile, pantry: [...profile.pantry, id] });
  };
  const fromPlan = async () => {
    haptic.drop();
    setBusy(true);
    try {
      setShopping(await api.shoppingFromPlan());
      toast('Lista hecha con lo que te falta del plan');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const addManual = (e: FormEvent) => {
    e.preventDefault();
    const label = draft.trim();
    if (!label || !shopping) return;
    haptic.tap();
    persist([...shopping, { id: `x-${Date.now().toString(36)}`, label, done: false }]);
    setDraft('');
  };
  const clearDone = () => {
    if (!shopping) return;
    haptic.tap();
    persist(shopping.filter((i) => !i.done));
  };

  // ── Nevera ──
  const togglePantry = (id: string) => {
    haptic.tap();
    const pantry = profile.pantry.includes(id) ? profile.pantry.filter((p) => p !== id) : [...profile.pantry, id];
    onChange({ ...profile, pantry });
  };
  const scan = async (file: File | undefined) => {
    if (!file) return;
    setScanning(true);
    try {
      const { ids } = await api.scanFridge(await photoToDataUrl(file));
      const fresh = ids.filter((id) => !profile.pantry.includes(id));
      if (!ids.length) {
        haptic.error();
        toast('No he reconocido nada. Prueba con más luz y más cerca.');
      } else {
        haptic.success();
        onChange({ ...profile, pantry: [...profile.pantry, ...fresh] });
        toast(fresh.length ? `He visto ${ids.length}: ${fresh.length} nuevos en tu nevera` : 'Todo eso ya estaba en tu nevera');
      }
    } catch (e) {
      haptic.error();
      toast((e as Error).message);
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const byDay = new Map<string, PlanItem[]>();
  plan?.items.forEach((it) => byDay.set(it.date, [...(byDay.get(it.date) ?? []), it]));
  const pending = shopping?.filter((i) => !i.done).length ?? 0;

  return (
    <div className="screen">
      <div className="wrap">
        <p className="mono">Tu semana</p>
        <h1 className="h-lg" style={{ marginTop: 10, fontSize: 'clamp(56px, 15vw, 120px)' }}>
          SIN PENSAR
          <span className="serif" style={{ display: 'block', color: 'var(--lime)', letterSpacing: '-.01em' }}>qué comer.</span>
        </h1>

        <div className="seg" role="tablist" style={{ marginTop: 22 }}>
          {([
            ['plan', 'Plan'],
            ['compra', pending ? `Compra · ${pending}` : 'Compra'],
            ['nevera', profile.pantry.length ? `Nevera · ${profile.pantry.length}` : 'Nevera']
          ] as [Section, string][]).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={section === id} className={section === id ? 'on' : ''} onClick={() => pick(id)}>
              {label}
            </button>
          ))}
        </div>

        {section === 'plan' && (
          <section className="rise" key="plan">
            <p style={{ margin: '18px 0 0', fontSize: 17, color: '#cfc8bc', lineHeight: 1.4, maxWidth: 520 }}>
              Un menú para tus comidas, sin lo que odias ni lo que no puedes comer y tirando de lo que tienes en casa.
            </p>
            <div style={{ display: 'flex', gap: 10, margin: '18px 0 8px', flexWrap: 'wrap' }}>
              <button className="btn btn-lime" disabled={busy} onClick={regenerate}>
                <IconSwap width={20} height={20} /> Otro plan
              </button>
              <button className="btn btn-line" disabled={busy} onClick={() => { pick('compra'); fromPlan(); }}>
                <IconCart width={20} height={20} /> Hacer la compra
              </button>
            </div>
            {!plan && [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 120, marginTop: 10 }} />)}
            {[...byDay.entries()].map(([date, items]) => (
              <div key={date} className={`plan-day${date === today ? ' today' : ''}${date < today ? ' past' : ''}`}>
                <p className="plan-date">
                  {dayLabel(date)}
                  {date === today && <span className="badge" style={{ background: 'var(--lime)', color: 'var(--ink)', marginLeft: 10 }}>HOY</span>}
                </p>
                {items.map((it) => (
                  <div key={it.slot} className={`plan-row${it.done ? ' done' : ''}`}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p className="mono" style={{ fontSize: 11 }}>{SLOT_LABEL[it.slot]}{it.done ? ' · hecho' : ''}</p>
                      <p className="plan-title">{it.title}</p>
                      <div className="thumbs" style={{ marginTop: 8 }}>
                        {it.ingredients.map((id) => <img key={id} src={foodImg(id)} alt="" />)}
                      </div>
                    </div>
                    <div className="plan-acts">
                      {it.done ? (
                        <span className="plan-check" aria-label="Hecho"><IconCheck width={20} height={20} /></span>
                      ) : (
                        <>
                          {date >= today && (
                            <button className="btn btn-lime plan-cook" onClick={() => { haptic.tap(); onCookPlan(it); }}>
                              Cocinar
                            </button>
                          )}
                          <button className="icon-btn" aria-label={`Cambiar ${it.title}`} onClick={() => swap(it)}>
                            <IconSwap width={18} height={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </section>
        )}

        {section === 'compra' && (
          <section className="rise" key="compra">
            <div style={{ display: 'flex', gap: 10, margin: '18px 0 14px', flexWrap: 'wrap' }}>
              <button className="btn btn-lime" disabled={busy} onClick={fromPlan}>
                <IconCart width={20} height={20} /> Desde el plan
              </button>
              {shopping?.some((i) => i.done) && (
                <button className="btn btn-line" onClick={clearDone}>Quitar tachados</button>
              )}
            </div>
            <form className="add-row" onSubmit={addManual}>
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Añadir algo más…" maxLength={60} aria-label="Añadir a la lista" />
              <button className="icon-btn lime" aria-label="Añadir" disabled={!draft.trim()}>
                <IconPlus width={20} height={20} />
              </button>
            </form>
            {shopping?.length === 0 && (
              <p className="serif" style={{ fontSize: 30, color: '#cfc8bc', margin: '20px 0 0' }}>Lista vacía. Hazla desde el plan.</p>
            )}
            <ul className="shop">
              {shopping?.map((it) => (
                <li key={it.id} className={it.done ? 'done' : ''}>
                  <button className="shop-item" onClick={() => toggleItem(it.id)} aria-pressed={it.done}>
                    <span className="shop-box">{it.done && <IconCheck width={16} height={16} />}</span>
                    {BY_ID[it.id] && <img src={foodImg(it.id)} alt="" />}
                    <span className="shop-name">{BY_ID[it.id]?.name ?? it.label}</span>
                    {it.amount && <span className="shop-amt">{it.amount}</span>}
                  </button>
                  <button className="icon-btn" aria-label="Quitar" onClick={() => { haptic.tap(); persist(shopping.filter((i) => i.id !== it.id)); }}>
                    <IconX width={16} height={16} />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mono" style={{ marginTop: 18, textTransform: 'none', letterSpacing: '.02em', lineHeight: 1.6 }}>
              Lo que taches pasa solo a tu nevera.
            </p>
          </section>
        )}

        {section === 'nevera' && (
          <section className="rise" key="nevera">
            <p style={{ margin: '18px 0 0', fontSize: 17, color: '#cfc8bc', lineHeight: 1.4, maxWidth: 520 }}>
              Marca lo que tienes en casa. La cazuela sorpresa y el plan tirarán de aquí primero.
            </p>
            <div style={{ display: 'flex', gap: 10, margin: '18px 0 4px', flexWrap: 'wrap' }}>
              <button className="btn btn-lime" disabled={scanning} onClick={() => fileRef.current?.click()}>
                <IconCamera width={20} height={20} /> {scanning ? 'Mirando la foto…' : 'Foto de la nevera'}
              </button>
              {profile.pantry.length > 0 && (
                <button className="btn btn-line" onClick={() => { haptic.tap(); onChange({ ...profile, pantry: [] }); }}>
                  Vaciar
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => scan(e.target.files?.[0])} />
            </div>
            {CATEGORIES.map((c) => (
              <section key={c.id}>
                <p className="mono" style={{ margin: '26px 0 12px' }}>{c.label}</p>
                <div className="grid-food" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))' }}>
                  {INGREDIENTS.filter((i) => i.cat === c.id).map((it) => {
                    const has = profile.pantry.includes(it.id);
                    return (
                      <button
                        key={it.id}
                        className={`tile${has ? ' have' : ' off'}`}
                        aria-pressed={has}
                        aria-label={`${it.name}: ${has ? 'lo tengo' : 'no lo tengo'}`}
                        style={{ background: has ? 'var(--lime)' : 'var(--ink-2)', color: has ? 'var(--ink)' : 'var(--paper)', touchAction: 'auto', cursor: 'pointer' }}
                        onClick={() => togglePantry(it.id)}
                      >
                        <img src={foodImg(it.id)} alt="" />
                        <span>{it.name}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </section>
        )}

        {section === 'plan' && plan && (
          <button className="btn btn-line" style={{ marginTop: 24 }} onClick={() => pick('compra')}>
            Ver la compra <IconArrow width={18} height={18} />
          </button>
        )}
      </div>
    </div>
  );
}
