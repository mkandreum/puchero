import { useEffect, useRef, useState } from 'react';

/** Número que cuenta hasta su valor con frenada suave (rachas, totales, porcentajes). */
export function useCountUp(target: number, ms = 700): number {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return setValue(target);
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const v = Math.round(a + (target - a) * (1 - Math.pow(1 - t, 4)));
      setValue(v);
      from.current = v;
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}
