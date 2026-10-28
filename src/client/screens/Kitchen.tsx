import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { amountsFor, BY_ID, foodImg, isAllergic, MAX_IN_POT, searchIngredients, SHELVES, type Category } from '../../shared/ingredients';
import { SLOTS, type Profile, type Recipe, type Slot } from '../../shared/types';
import { substitutes, suggestDishes } from '../../shared/chef';
import { Cazuela } from '../components/Cazuela';
import { CookMode } from '../components/CookMode';
import { MacroSplit } from '../components/Nutrition';
import { IconArrow, IconCheck, IconHeart, IconSearch, IconShare, IconTimer, IconX } from '../components/Icons';
import { Stepper } from '../components/Stepper';
import { shareRecipe } from '../lib/shareCard';
import { api } from '../lib/api';
import { haptic } from '../lib/haptics';
import { useCountUp } from '../lib/useCountUp';
import { SLOT_INFO } from './Onboarding';

const TURNS = 3;
const TARGET = TURNS * 2 * Math.PI;
export const TILE_BG: Record<Category, string> = {
  verdura: 'var(--t-verdura)',
  proteina: 'var(--t-proteina)',
  base: 'var(--t-base)',
  fruta: 'var(--t-fruta)',
  cereal: 'var(--t-cereal)',
  lacteo: 'var(--t-lacteo)',
  despensa: 'var(--t-despensa)'
};

type Phase = 'pick' | 'stir' | 'wait' | 'plato';

interface Props {
  cart: string[];
  setCart: (c: string[]) => void;
  slot: Slot;
  setSlot: (s: Slot) => void;
  profile: Profile;
  /** Plato a repetir desde el historial: abre directamente emplatado */
  replay?: Recipe | null;
  onSaved: (ingredients: string[]) => void;
  toast: (msg: string) => void;
}

interface Drag {
  id: string;
  pointerId: number;
  sx: number;
  sy: number;
  moved: boolean;
}

export function Kitchen({ cart, setCart, slot, setSlot, profile, replay, onSaved, toast }: Props) {
  const { dislikes, allergies } = profile;
  const pantryOk = profile.pantry.filter((id) => !isAllergic(id, allergies));
  const [phase, setPhase] = useState<Phase>(replay ? 'plato' : 'pick');
  const [shelfId, setShelfId] = useState(pantryOk.length ? 'nevera' : SHELVES[slot][0].id);
  const [query, setQuery] = useState('');
  const [over, setOver] = useState(false);
  const [bump, setBump] = useState(0);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [ghost, setGhost] = useState<string | null>(null);
  const [stir, setStir] = useState({ total: 0, angle: 0, spoon: null as number | null });
  const [recipe, setRecipe] = useState<Recipe | null>(replay ?? null);
  const [saving, setSaving] = useState(false);

  const potRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const recipeP = useRef<Promise<Recipe> | null>(null);
  const quarter = useRef(0);
  const stirRef = useRef({ total: 0, angle: 0 });

  // Si "Sorpréndeme" rellena la cazuela desde fuera, vuelve a la fase de elegir.
  const skipReset = useRef(false);
  const [swapping, setSwapping] = useState(false);
  useEffect(() => {
    if (skipReset.current) {
      skipReset.current = false;
      return;
    }
    if (phase === 'plato' && cart.length && recipe && cart.join() !== recipe.ingredients.join()) reset(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

  /** "No tengo X": cambia un ingrediente (o lo quita) y vuelve a escribir la receta. */
  const substitute = async (oldId: string, newId: string | null) => {
    if (!recipe || swapping) return;
    const ids = recipe.ingredients.flatMap((id) => (id !== oldId ? [id] : newId ? [newId] : []));
    if (ids.length < 2) {
      haptic.error();
      return toast('Con menos de 2 ingredientes no hay plato.');
    }
    haptic.drop();
    skipReset.current = true;
    setCart(ids);
    setSwapping(true);
    try {
      const r = await api.recipe(ids, dislikes, slot, recipe.servings);
      setRecipe(r);
      toast(newId ? `Hecho: ${BY_ID[newId].name.toLowerCase()} en vez de ${BY_ID[oldId].name.toLowerCase()}` : `Sin ${BY_ID[oldId].name.toLowerCase()}`);
    } finally {
      setSwapping(false);
    }
  };

  const add = (id: string) => {
    if (cart.includes(id)) return;
    if (cart.length >= MAX_IN_POT) {
      haptic.error();
      toast(`Máximo ${MAX_IN_POT} cosas. Esto es una cazuela, no un bufé.`);
      return;
    }
    haptic.drop();
    setCart([...cart, id]);
    setLastAdded(id);
    setBump((b) => b + 1);
  };

  const remove = (id: string) => {
    haptic.tap();
    setCart(cart.filter((c) => c !== id));
    setLastAdded(null);
  };

  // ── Arrastrar del súper a la cazuela ────────────────────
  const overPot = (x: number, y: number) => {
    const el = potRef.current;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const nx = ((x - r.left) / r.width) * 400;
    const ny = ((y - r.top) / r.height) * 300;
    return ((nx - 200) / 190) ** 2 + ((ny - 140) / 100) ** 2 <= 1;
  };
  const placeGhost = (x: number, y: number) => {
    if (ghostRef.current) ghostRef.current.style.transform = `translate(${x - 46}px, ${y - 46}px)`;
  };

  const tileDown = (e: RPointerEvent<HTMLButtonElement>, id: string) => {
    if (phase !== 'pick' || cart.includes(id) || e.button > 0) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* puntero ya liberado: seguimos sin captura */ }
    drag.current = { id, pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false };
  };
  const tileMove = (e: RPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6) {
      d.moved = true;
      haptic.pick();
      setGhost(d.id);
    }
    if (d.moved) {
      placeGhost(e.clientX, e.clientY);
      const o = overPot(e.clientX, e.clientY);
      setOver((prev) => (prev !== o ? o : prev));
    }
  };
  const tileUp = (e: RPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    setGhost(null);
    setOver(false);
    if (!d.moved || overPot(e.clientX, e.clientY)) add(d.id); // un toque también vale
  };
  const tileCancel = () => {
    drag.current = null;
    setGhost(null);
    setOver(false);
  };
  useEffect(() => {
    if (ghost && drag.current) placeGhost(drag.current.sx, drag.current.sy);
  }, [ghost]);

  // ── Remover girando el dedo ─────────────────────────────
  const startStir = () => {
    if (cart.length < 2) return;
    haptic.tap();
    quarter.current = 0;
    stirRef.current = { total: 0, angle: 0 };
    setStir({ total: 0, angle: 0, spoon: null });
    setRecipe(null);
    recipeP.current = api.recipe(cart, dislikes, slot, profile.servings);
    setPhase('stir');
  };

  const onStir = (delta: number, angle: number) => {
    if (phase !== 'stir') return;
    const s = stirRef.current;
    const total = Math.min(TARGET, s.total + Math.abs(delta));
    const q = Math.floor(total / (Math.PI / 2));
    if (q > quarter.current) {
      quarter.current = q;
      // Cada cuarto un toque; cada vuelta completa, un golpe más marcado
      if (q % 4 === 0 && total < TARGET) haptic.drop();
      else haptic.stir();
      setBump((b) => b + 1);
    }
    const next = { total, angle: s.angle + delta * 0.9 };
    stirRef.current = next;
    setStir({ ...next, spoon: angle });
    if (total >= TARGET && s.total < TARGET) finish();
  };

  const finish = () => {
    haptic.success();
    setPhase('wait');
    const p = recipeP.current ?? api.recipe(cart, dislikes, slot, profile.servings);
    Promise.all([p, new Promise((r) => setTimeout(r, 650))]).then(([r]) => {
      setRecipe(r as Recipe);
      setPhase('plato');
    });
  };

  const reset = (clear = true) => {
    setPhase('pick');
    setRecipe(null);
    stirRef.current = { total: 0, angle: 0 };
    setStir({ total: 0, angle: 0, spoon: null });
    setLastAdded(null);
    if (clear) setCart([]);
  };

  const eat = async (favorite: boolean) => {
    if (!recipe || saving) return;
    setSaving(true);
    try {
      await api.saveMeal(recipe, slot, favorite);
      haptic.success();
      toast('¡A la saca! +1 a tu racha');
      reset();
      onSaved(recipe.ingredients);
    } catch (err) {
      haptic.error();
      toast((err as Error).message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const progress = stir.total / TARGET;
  const pct = useCountUp(Math.round(progress * 100), 180);
  const turn = Math.min(TURNS, Math.floor(stir.total / (2 * Math.PI)) + 1);
  const shelves = pantryOk.length ? [{ id: 'nevera', label: 'En tu nevera', ids: pantryOk }, ...SHELVES[slot]] : SHELVES[slot];
  const current = shelves.find((s) => s.id === shelfId) ?? shelves[0];
  const searching = query.trim().length > 0;
  const sugg = useMemo(
    () => (pantryOk.length >= 2 ? suggestDishes(pantryOk, slot, { allergies, dislikes }, 6) : []),
    [pantryOk.join(), slot, allergies.join(), dislikes.join()] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const shelf = (searching ? searchIngredients(query) : current.ids.map((id) => BY_ID[id])).filter((it) => !isAllergic(it.id, allergies));

  const changeSlot = (s: Slot) => {
    if (s === slot) return;
    haptic.tap();
    setSlot(s);
    setShelfId(pantryOk.length ? 'nevera' : SHELVES[s][0].id);
  };
  const stirring = phase === 'stir' || phase === 'wait';

  return (
    <div className="kitchen">
      <header className="k-head">
        <div style={{ minWidth: 0, flex: 1 }}>
          {!stirring && (
            <div className="slot-switch" role="tablist" aria-label="Qué comida">
              {SLOTS.map((s) => (
                <button key={s} role="tab" aria-selected={slot === s} className={slot === s ? 'on' : ''} onClick={() => changeSlot(s)}>
                  {SLOT_INFO[s].label}
                </button>
              ))}
            </div>
          )}
          <p className="mono">{stirring ? `Paso 2/2 · Remueve · ${SLOT_INFO[slot].label}` : 'Paso 1/2 · Elige'}</p>
          <h1 className="h-lg k-title" style={{ marginTop: 8 }}>
            {stirring ? 'Gira el dedo' : 'Arrastra'}
            <span className="serif">{stirring ? 'dentro de la cazuela.' : 'a la cazuela.'}</span>
          </h1>
        </div>
      </header>

      <div className="k-pot">
        <Cazuela
          ref={potRef}
          items={cart}
          mode={stirring ? 'stir' : 'pick'}
          over={over}
          bump={bump}
          lastAdded={phase === 'pick' ? lastAdded : null}
          angle={stir.angle}
          spoon={stir.spoon}
          progress={progress}
          onRemove={remove}
          onStir={onStir}
          onStirEnd={() => setStir((s) => ({ ...s, spoon: null }))}
        />
      </div>

      <div className="k-actions">
        {stirring ? (
          <>
            <p className="k-count">
              VUELTA <b>{turn}</b> DE {TURNS}
            </p>
            {phase === 'wait' ? (
              <p className="cooking-wait">emplatando…</p>
            ) : (
              <button className="btn btn-line" style={{ height: 44, color: 'var(--muted)' }} onClick={() => { haptic.tap(); reset(false); }}>
                Volver
              </button>
            )}
          </>
        ) : (
          <>
            <p className="k-count">
              <b>{cart.length}</b> / {MAX_IN_POT} EN LA CAZUELA
            </p>
            <button className="btn btn-lime" disabled={cart.length < 2} onClick={startStir}>
              {cart.length < 2 ? 'Mete 2 o más' : 'Cocinar'} <IconArrow width={20} height={20} />
            </button>
          </>
        )}
      </div>

      {!stirring && (
        <section className="k-shelf" aria-label="Súper">
          <label className="search">
            <IconSearch width={18} height={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca: garbanzos, salmón, fresas…"
              aria-label="Buscar alimento"
              enterKeyHint="search"
            />
            {searching && (
              <button type="button" aria-label="Borrar búsqueda" onClick={() => { haptic.tap(); setQuery(''); }}>
                <IconX width={16} height={16} />
              </button>
            )}
          </label>
          {!searching && cart.length === 0 && sugg.length > 0 && (
            <div className="sugg" aria-label="Con lo que tienes">
              <p className="mono">Con lo que tienes</p>
              <div className="sugg-row">
                {sugg.map((s) => (
                  <button
                    key={s.dish.id}
                    className="sugg-card"
                    onClick={() => {
                      haptic.drop();
                      setCart(s.ids);
                      toast(s.missing.length ? `Te falta ${s.missing.map((id) => BY_ID[id].name.toLowerCase()).join(' y ')}: ya está en la cazuela` : '¡Tienes todo! A remover');
                    }}
                  >
                    <b className="serif">{s.title}</b>
                    <span className="thumbs">{s.ids.slice(0, 4).map((id) => <img key={id} src={foodImg(id)} alt="" />)}</span>
                    <small>{s.missing.length ? `Falta ${s.missing.map((id) => BY_ID[id].name.toLowerCase()).join(' y ')}` : '¡Ya puedes!'} · {s.dish.minutes} min</small>
                  </button>
                ))}
              </div>
            </div>
          )}
          {!searching && (
            <div className="chips" role="tablist">
              {shelves.map((c) => (
                <button key={c.id} role="tab" aria-selected={current.id === c.id} className={`chip${current.id === c.id ? ' on' : ''}${c.id === 'nevera' ? ' fridge' : ''}`} onClick={() => { haptic.tap(); setShelfId(c.id); }}>
                  {c.label}
                </button>
              ))}
            </div>
          )}
          {searching && shelf.length === 0 && <p className="serif" style={{ fontSize: 26, color: '#cfc8bc', margin: '6px 0' }}>Nada con “{query.trim()}”.</p>}
          <div className="grid-food">
            {shelf.map((it) => {
              const inPot = cart.includes(it.id);
              return (
                <button
                  key={it.id}
                  type="button"
                  className={`tile${inPot ? ' in' : ''}`}
                  style={{ background: TILE_BG[it.cat] }}
                  aria-label={inPot ? `${it.name}, ya en la cazuela` : `Añadir ${it.name} a la cazuela`}
                  aria-disabled={inPot}
                  onPointerDown={(e) => tileDown(e, it.id)}
                  onPointerMove={tileMove}
                  onPointerUp={tileUp}
                  onPointerCancel={tileCancel}
                  onClick={(e) => { if (e.detail === 0) add(it.id); }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <img src={foodImg(it.id)} alt="" draggable={false} />
                  <span>{it.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {stirring && (
        <section className="k-shelf" aria-live="polite">
          <p className="stir-count">{pct}%</p>
          <p className="mono" style={{ marginTop: 10 }}>
            {progress === 0 ? 'Pon el dedo en la cazuela y gira' : progress < 1 ? 'Sigue, sigue… huele que alimenta' : 'Listo'}
          </p>
          <div className="thumbs" style={{ marginTop: 16 }}>
            {cart.map((id) => (
              <img key={id} src={foodImg(id)} alt={BY_ID[id].name} />
            ))}
          </div>
        </section>
      )}

      {ghost && (
        <div ref={ghostRef} className="ghost" style={{ background: TILE_BG[BY_ID[ghost].cat] }} aria-hidden="true">
          <img src={foodImg(ghost)} alt="" />
        </div>
      )}

      {phase === 'plato' && recipe && (
        <Plato recipe={recipe} setRecipe={setRecipe} profile={profile} slot={slot} swapping={swapping} onSubstitute={substitute} saving={saving} replay={!!replay} onEat={eat} onAgain={() => reset()} toast={toast} />
      )}
    </div>
  );
}

function Plato({
  recipe,
  setRecipe,
  profile,
  slot,
  swapping,
  onSubstitute,
  saving,
  replay,
  onEat,
  onAgain,
  toast
}: {
  recipe: Recipe;
  setRecipe: (r: Recipe) => void;
  profile: Profile;
  slot: Slot;
  swapping: boolean;
  onSubstitute: (oldId: string, newId: string | null) => void;
  saving: boolean;
  replay: boolean;
  onEat: (favorite: boolean) => void;
  onAgain: () => void;
  toast: (msg: string) => void;
}) {
  const dislikes = profile.dislikes;
  const [openId, setOpenId] = useState<string | null>(null);
  const sub = useMemo(
    () => (openId ? substitutes(recipe.ingredients, openId, slot, { allergies: profile.allergies, dislikes: profile.dislikes, pantry: profile.pantry }) : null),
    [openId, recipe.ingredients, slot, profile.allergies, profile.dislikes, profile.pantry]
  );
  const [fav, setFav] = useState(false);
  const [cooking, setCooking] = useState(false);
  const [sharing, setSharing] = useState(false);
  const orbit = recipe.ingredients.slice(0, 6);
  const servings = recipe.servings || 1;

  const setServings = (n: number) => setRecipe({ ...recipe, servings: n, amounts: amountsFor(recipe.ingredients, n) });
  const share = async () => {
    haptic.tap();
    setSharing(true);
    try {
      const r = await shareRecipe(recipe);
      if (r === 'downloaded') toast('Tarjeta descargada: compártela donde quieras');
      if (r === 'shared') haptic.success();
    } catch {
      toast('No se ha podido crear la tarjeta');
    } finally {
      setSharing(false);
    }
  };

  return (
    <section className="plato" aria-label="Tu plato">
      <div className="plato-grid">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <p className="mono">{replay ? 'Otra vez' : 'Listo'} · {recipe.source === 'ia' ? 'receta de la IA' : 'receta de la casa'}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`icon-btn ink${fav ? ' fav' : ''}`} aria-pressed={fav} aria-label={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'} onClick={() => { haptic[fav ? 'tap' : 'drop'](); setFav(!fav); }}>
                <IconHeart width={20} height={20} filled={fav} />
              </button>
              <button className="icon-btn ink" aria-label="Compartir receta" disabled={sharing} onClick={share}>
                <IconShare width={20} height={20} />
              </button>
            </div>
          </div>
          <h1 className="serif plato-title">{recipe.title}</h1>
          <p style={{ margin: '14px 0 0', fontSize: 22, fontWeight: 700, lineHeight: 1.15 }}>{recipe.tagline}</p>
          <div className="plato-hero">
            <img className="hero-img" src={foodImg('plato')} alt="" />
            {orbit.map((id, i) => {
              const a = (i / orbit.length) * Math.PI * 2 - Math.PI / 2;
              return (
                <img
                  key={id}
                  className="orbit"
                  src={foodImg(id)}
                  alt={BY_ID[id].name}
                  style={{ left: `${37 + Math.cos(a) * 60}%`, top: `${37 + Math.sin(a) * 60}%`, animationDelay: `${0.45 + i * 0.08}s` }}
                />
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div className="macro">
            <div><b>{recipe.kcal}</b><p className="mono">kcal / persona</p></div>
            <div><b>{recipe.protein}g</b><p className="mono">proteína</p></div>
            <div><b>{recipe.minutes}'</b><p className="mono">minutos</p></div>
          </div>
          <div>
            <MacroSplit n={recipe} />
            <p className="mono" style={{ marginTop: 10, textTransform: 'none', letterSpacing: '.02em' }}>
              Fibra: {recipe.fiber} g · Valores aproximados por persona
            </p>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <p className="mono">Ingredientes</p>
              <Stepper tone="light" value={servings} min={1} max={12} onChange={setServings} label={(n) => `${n} ${n === 1 ? 'persona' : 'personas'}`} />
            </div>
            <ul className={`ings${swapping ? ' busy' : ''}`}>
              {recipe.ingredients.map((id, i) => (
                <li key={id} className={openId === id ? 'open' : ''}>
                  <button className="ing-btn" aria-expanded={openId === id} aria-label={`${BY_ID[id]?.name}: cambiar o quitar`} onClick={() => { haptic.tap(); setOpenId(openId === id ? null : id); }}>
                    <img src={foodImg(id)} alt="" />
                    <span>{BY_ID[id]?.name}</span>
                    <b key={recipe.amounts[i]}>{recipe.amounts[i]}</b>
                  </button>
                  {openId === id && sub && (
                    <div className="sub" role="group" aria-label={`Sin ${BY_ID[id]?.name}`}>
                      <p className="mono">¿No tienes {BY_ID[id]?.name.toLowerCase()}?</p>
                      <div className="sub-row">
                        {sub.alternatives.map((alt) => (
                          <button key={alt} className="sub-chip" onClick={() => { setOpenId(null); onSubstitute(id, alt); }}>
                            <img src={foodImg(alt)} alt="" /> {BY_ID[alt].name}
                          </button>
                        ))}
                        {sub.removable && (
                          <button className="sub-chip quit" onClick={() => { setOpenId(null); onSubstitute(id, null); }}>
                            Quitar
                          </button>
                        )}
                        {!sub.alternatives.length && !sub.removable && <span className="sub-none">Es lo que hace este plato: sin eso, mejor otra receta.</span>}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="tip">
            <p className="mono">{recipe.ingredients.some((i) => dislikes.includes(i)) ? 'Truco anti-manías' : 'Truco'}</p>
            <p style={{ margin: '8px 0 0', fontSize: 19, lineHeight: 1.3, fontWeight: 600 }}>{recipe.tip}</p>
          </div>
          <ol className="steps">
            {recipe.steps.map((s, i) => (
              <li key={i}>
                <i>{String(i + 1).padStart(2, '0')}</i>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <button className="btn btn-line" style={{ height: 58, color: 'var(--ink)' }} onClick={() => { haptic.drop(); setCooking(true); }}>
            <IconTimer width={20} height={20} /> Cocinar paso a paso
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ink" style={{ flex: 1, height: 58 }} onClick={() => onEat(fav)} disabled={saving}>
              <IconCheck width={20} height={20} /> {saving ? 'Guardando…' : 'Me lo como'}
            </button>
            <button className="btn btn-line" style={{ height: 58 }} onClick={() => { haptic.tap(); onAgain(); }}>
              Otra
            </button>
          </div>
        </div>
      </div>
      {cooking && <CookMode recipe={recipe} onClose={() => setCooking(false)} onDone={() => setCooking(false)} />}
    </section>
  );
}
