import { haptic } from '../lib/haptics';
import { IconMinus, IconPlus } from './Icons';

/** − 2 personas + : raciones, vasos de agua... */
export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  step = 1,
  tone = 'dark'
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  label: (n: number) => string;
  step?: number;
  tone?: 'dark' | 'light';
}) {
  const set = (n: number) => {
    if (n < min || n > max) return haptic.error();
    haptic.tap();
    onChange(n);
  };
  return (
    <div className={`stepper ${tone}`} role="group" aria-label={label(value)}>
      <button type="button" aria-label="Menos" disabled={value <= min} onClick={() => set(value - step)}>
        <IconMinus width={18} height={18} />
      </button>
      <span key={value} className="stepper-v">
        {label(value)}
      </span>
      <button type="button" aria-label="Más" disabled={value >= max} onClick={() => set(value + step)}>
        <IconPlus width={18} height={18} />
      </button>
    </div>
  );
}
