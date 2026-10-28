import { energySplit } from '../../shared/nutrition';

interface N {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

/** Cómo se reparten las calorías: barra de una sola serie partida en proteína, hidratos y grasas. */
export function MacroSplit({ n }: { n: N }) {
  const e = energySplit(n);
  const parts = [
    { k: 'p', label: 'Proteína', g: n.protein, pct: e.protein },
    { k: 'c', label: 'Hidratos', g: n.carbs, pct: e.carbs },
    { k: 'f', label: 'Grasas', g: n.fat, pct: e.fat }
  ];
  return (
    <div className="macro-split" role="img" aria-label={parts.map((p) => `${p.label} ${p.g} g, ${p.pct}% de la energía`).join('; ')}>
      <div className="macro-bar">
        {parts.map((p) => (
          <span key={p.k} className={`seg-${p.k}`} style={{ flexGrow: Math.max(p.pct, 1) }} />
        ))}
      </div>
      <ul className="macro-legend">
        {parts.map((p) => (
          <li key={p.k}>
            <i className={`dot-${p.k}`} />
            <span>{p.label}</span>
            <b>{p.g} g</b>
            <small>{p.pct}%</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barra de progreso hacia un objetivo diario (kcal, proteína). */
export function GoalBar({ label, value, goal, unit }: { label: string; value: number; goal: number; unit: string }) {
  const pct = Math.min(100, Math.round((value / goal) * 100));
  const over = value > goal;
  return (
    <div className="goal" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={goal} aria-valuenow={value}>
      <div className="goal-top">
        <span className="mono">{label}</span>
        <span>
          <b>{value}</b> / {goal} {unit}
        </span>
      </div>
      <div className="goal-track">
        <span className={over ? 'over' : ''} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
