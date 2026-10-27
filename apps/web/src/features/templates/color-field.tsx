import { BRAND_COLOR_KEYS, type BrandColor } from '@arweqah-platform/shared';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';

const SWATCH: Record<BrandColor, string> = { cream: 'bg-cream', green: 'bg-green-400', ink: 'bg-ink', orange: 'bg-orange-500', beige: 'bg-beige-300', petrol: 'bg-petrol-800', yellow: 'bg-yellow-300' };

/** The seven brand colors and nothing else; the chosen one carries a check mark so color is never the only sign. */
export function ColorField({ label, value, onChange }: { label: string; value: BrandColor; onChange: (color: BrandColor) => void }) {
  const { t } = useTranslation('templates');
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap gap-2">
        {BRAND_COLOR_KEYS.map((color) => (
          <button key={color} type="button" role="radio" aria-checked={value === color} aria-label={t(`colors.${color}`)} title={t(`colors.${color}`)} onClick={() => onChange(color)} className={cn('grid size-11 place-items-center rounded-full border-2 border-neutral-200', SWATCH[color], value === color && 'border-link ring-2 ring-petrol-50')}>
            {value === color && <Check className={cn('size-4', color === 'cream' || color === 'beige' || color === 'yellow' || color === 'green' ? 'text-ink' : 'text-cream')} aria-hidden />}
          </button>
        ))}
      </div>
    </div>
  );
}
