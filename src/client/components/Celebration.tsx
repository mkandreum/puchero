import { useMemo } from 'react';
import { foodImg } from '../../shared/ingredients';

/** Al guardar un plato, sus ingredientes saltan desde abajo y caen girando. */
export function Celebration({ ids, seed }: { ids: string[]; seed: number }) {
  const parts = useMemo(() => {
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: 18 }, (_, i) => ({
      id: ids[i % ids.length],
      dx: (rnd() - 0.5) * 520,
      up: 380 + rnd() * 260,
      rot: (rnd() - 0.5) * 720,
      delay: i * 18
    }));
  }, [ids, seed]);
  if (!ids.length) return null;
  return (
    <div className="party" aria-hidden="true">
      {parts.map((p, i) => (
        <span
          key={i}
          className="party-x"
          style={{ ['--dx' as string]: `${p.dx}px`, animationDelay: `${p.delay}ms` }}
        >
          <img
            src={foodImg(p.id)}
            alt=""
            style={{ ['--up' as string]: `${-p.up}px`, ['--rot' as string]: `${p.rot}deg`, animationDelay: `${p.delay}ms` }}
          />
        </span>
      ))}
    </div>
  );
}
