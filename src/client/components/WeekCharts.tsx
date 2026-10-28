import { useState } from 'react';
import { MacroSplit } from './Nutrition';
import { BY_ID, COLOR_HEX, foodImg, type FoodColor } from '../../shared/ingredients';
import type { DaySummary, Summary } from '../../shared/types';

const COLOR_LABEL: Record<FoodColor, string> = {
  verde: 'Verde',
  rojo: 'Rojo',
  naranja: 'Naranja',
  amarillo: 'Amarillo',
  morado: 'Morado',
  blanco: 'Blanco',
  marron: 'Marrón'
};

/**
 * Columnas de una sola serie (kcal o proteína por día): un tono, barras finas con la punta
 * redondeada, valor solo en el máximo y en hoy, y el resto al tocar/pasar por encima.
 */
function Columns({ days, value, unit, title }: { days: DaySummary[]; value: (d: DaySummary) => number; unit: string; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const vals = days.map(value);
  const max = Math.max(1, ...vals);
  const top = vals.indexOf(Math.max(...vals));
  const last = days.length - 1;
  return (
    <figure className="cols">
      <figcaption className="mono">{title}</figcaption>
      <div className="cols-plot" onPointerLeave={() => setHover(null)}>
        {days.map((d, i) => {
          const v = vals[i];
          const show = hover === i || (hover === null && v > 0 && (i === top || i === last));
          return (
            <div
              key={d.date}
              className={`col${hover === i ? ' on' : ''}`}
              onPointerEnter={() => setHover(i)}
              onPointerDown={() => setHover(i)}
              aria-label={`${d.letter}: ${v} ${unit}`}
            >
              <span className={`col-v${show ? ' show' : ''}`}>{v ? `${v}${unit === 'g' ? 'g' : ''}` : ''}</span>
              <span className="col-bar" style={{ height: `${Math.max(v ? 3 : 0, (v / max) * 82)}%` }} />
              <span className={`col-l${i === last ? ' today' : ''}`}>{d.letter}</span>
            </div>
          );
        })}
      </div>
      {/* Tabla para lectores de pantalla */}
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {days.map((d, i) => (
            <tr key={d.date}>
              <th>{d.date}</th>
              <td>
                {vals[i]} {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function WeekCharts({ data }: { data: Summary }) {
  return (
    <div className="summary">
      <div className="sum-tiles">
        <div className="sum-tile">
          <b>{data.kcalAvg}</b>
          <span className="mono">kcal / día</span>
        </div>
        <div className="sum-tile">
          <b>{data.proteinAvg}g</b>
          <span className="mono">proteína / día</span>
        </div>
        <div className="sum-tile">
          <b>{data.foods.length}</b>
          <span className="mono">alimentos</span>
        </div>
      </div>
      <div className="sum-tiles">
        <div className="sum-tile">
          <b>{data.carbsAvg}g</b>
          <span className="mono">hidratos / día</span>
        </div>
        <div className="sum-tile">
          <b>{data.fatAvg}g</b>
          <span className="mono">grasas / día</span>
        </div>
        <div className="sum-tile">
          <b>{data.fiberAvg}g</b>
          <span className="mono">fibra / día</span>
        </div>
      </div>
      <MacroSplit n={{ kcal: data.kcalAvg, protein: data.proteinAvg, carbs: data.carbsAvg, fat: data.fatAvg, fiber: data.fiberAvg }} />
      <Columns days={data.days} value={(d) => d.kcal} unit="kcal" title="Kcal por día (por persona)" />
      <Columns days={data.days} value={(d) => d.protein} unit="g" title="Proteína por día (g)" />

      <p className="mono" style={{ margin: '22px 0 10px' }}>Colores de la semana · {data.colors.length} de 7</p>
      <div className="sum-colors">
        {(Object.keys(COLOR_HEX) as FoodColor[]).map((c) => {
          const on = data.colors.includes(c);
          return (
            <span key={c} className={`sum-color${on ? ' on' : ''}`}>
              <i style={{ background: on ? COLOR_HEX[c] : 'transparent', borderColor: COLOR_HEX[c] }} />
              {COLOR_LABEL[c]}
            </span>
          );
        })}
      </div>

      {data.topFoods.length > 0 && (
        <>
          <p className="mono" style={{ margin: '22px 0 10px' }}>Lo que más has comido</p>
          <ol className="sum-top">
            {data.topFoods.map((f) => (
              <li key={f.id}>
                <img src={foodImg(f.id)} alt="" />
                <span>{BY_ID[f.id]?.name}</span>
                <b>×{f.count}</b>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
