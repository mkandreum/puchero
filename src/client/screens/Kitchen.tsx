import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { BY_ID, CATEGORIES, foodImg, INGREDIENTS, MAX_IN_POT, type Category } from '../../shared/ingredients';
import type { Recipe } from '../../shared/types';
import { Cazuela } from '../components/Cazuela';
import { IconArrow, IconCheck } from '../components/Icons';
import { api } from '../lib/api';
import { haptic } from '../lib/haptics';

const TURNS = 3;
const TARGET = TURNS * 2 * Math.PI;
const TILE_BG: Record<Category, string> = { verdura: 'var(--t-verdura)', proteina: 'var(--t-proteina)', base: 'var(--t-base)' };

type Phase = 'pick' | 'stir' | 'wait' | 'plato';

interface Props {
  cart: string[];
  setCart: (c: string[]) => void;
  dislikes: string[];
  onSaved: () => void;
  toast: (msg: string) => void;
}

interface Drag {
  id: string;
  pointerId: number;
  sx: number;
  sy: number;
  moved: boolean;
}

export function Kitchen({ cart, setCart, dislikes, onSaved, toast }: Props) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [cat, setCat] = useState<Category>('verdura');
  const [over, setOver] = useState(false);
  const [bump, setBump] = useState(0);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [ghost, setGhost] = useState<string | null>(null);
  const [stir, setStir] = useState({ total: 0, angle: 0, spoon: null as number | null });
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [saving, setSaving] = useState(false);

  const potRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const recipeP = useRef<Promise<Recipe> | null>(null);
  const quarter = useRef(0);
  const stirRef = useRef({ total: 0, angle: 0 });

  // Si "Sorpréndeme" rellena la cazuela desde fuera, vuelve a la fase de elegir.
  useEffect(() => {
    if (phase === 'plato' && cart.length && recipe && cart.join() !== recipe.ingredients.join()) reset(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

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
    e.currentTarget.setPointerCapture(e.pointerId);
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
    recipeP.current = api.recipe(cart, dislikes);
    setPhase('stir');
  };

  const onStir = (delta: number, angle: number) => {
    if (phase !== 'stir') return;
    const s = stirRef.current;
    const total = Math.min(TARGET, s.total + Math.abs(delta));
    const q = Math.floor(total / (Math.PI / 2));
    if (q > quarter.current) {
      quarter.current = q;
      haptic.stir();
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
    const p = recipeP.current ?? api.recipe(cart, dislikes);
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

  const eat = async () => {
    if (!recipe || saving) return;
    setSaving(true);
    try {
      await api.saveMeal(recipe);
      haptic.success();
      toast('¡A la saca! +1 a tu racha');
      reset();
      onSaved();
    } catch (err) {
      haptic.error();
      toast((err as Error).message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const progress = stir.total / TARGET;
  const turn = Math.min(TURNS, Math.floor(stir.total / (2 * Math.PI)) + 1);
  const shelf = INGREDIENTS.filter((i) => i.cat === cat);
  const stirring = phase === 'stir' || phase === 'wait';

  return (
    <div className="kitchen">
      <header className="k-head">
        <div>
          <p className="mono">{stirring ? 'Paso 2/2 · Remueve' : 'Paso 1/2 · Elige'}</p>
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
              <button className="btn btn-line" style={{ height: 44, color: 'var(--muted)' }} onClick={() => reset(false)}>
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
          <div className="chips" role="tablist">
            {CATEGORIES.map((c) => (
              <button key={c.id} role="tab" aria-selected={cat === c.id} className={`chip${cat === c.id ? ' on' : ''}`} onClick={() => { haptic.tap(); setCat(c.id); }}>
                {c.label}
              </button>
            ))}
          </div>
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
          <p className="stir-count">{Math.round(progress * 100)}%</p>
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

      {phase === 'plato' && recipe && <Plato recipe={recipe} dislikes={dislikes} saving={saving} onEat={eat} onAgain={() => reset()} />}
    </div>
  );
}

function Plato({ recipe, dislikes, saving, onEat, onAgain }: { recipe: Recipe; dislikes: string[]; saving: boolean; onEat: () => void; onAgain: () => void }) {
  const orbit = recipe.ingredients.slice(0, 6);
  return (
    <section className="plato" aria-label="Tu plato">
      <div className="plato-grid">
        <div>
          <p className="mono">Listo · {recipe.source === 'ia' ? 'receta de la IA' : 'receta de la casa'}</p>
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
            <div><b>{recipe.kcal}</b><p className="mono">kcal aprox.</p></div>
            <div><b>{recipe.protein}g</b><p className="mono">proteína</p></div>
            <div><b>{recipe.minutes}'</b><p className="mono">minutos</p></div>
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
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="btn btn-ink" style={{ flex: 1, height: 58 }} onClick={onEat} disabled={saving}>
              <IconCheck width={20} height={20} /> {saving ? 'Guardando…' : 'Me lo como'}
            </button>
            <button className="btn btn-line" style={{ height: 58 }} onClick={onAgain}>
              Otra
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
