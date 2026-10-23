import { haptic } from '../lib/haptics';
import { IconMinus, IconPlus } from './Icons';

/** − 2 personas + : raciones, vasos de agua... */
export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  tone = 'dark'
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  label: (n: number) => string;
  tone?: 'dark' | 'light';
}) {
  const set = (n: number) => {
    if (n < min || n > max) return haptic.error();
    haptic.tap();
    onChange(n);
  };
  return (
    <div className={`stepper ${tone}`} role="group" aria-label={label(value)}>
      <button type="button" aria-label="Menos" disabled={value <= min} onClick={() => set(value - 1)}>
        <IconMinus width={18} height={18} />
      </button>
      <span key={value} className="stepper-v">
        {label(value)}
      </span>
      <button type="button" aria-label="Más" disabled={value >= max} onClick={() => set(value + 1)}>
        <IconPlus width={18} height={18} />
      </button>
    </div>
  );
}
