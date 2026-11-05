/** The brand color of a card, a block or a badge in a chart; a structure gives one tone per type of unit, the root is `ink`. */
export type ChartTone = 'ink' | 'petrol' | 'green' | 'orange' | 'neutral' | 'beige';

/** Brand colors per tone: card, its badge and the legend swatch. Text stays dark or cream for contrast, in both themes. */
export const TONES: Record<ChartTone, { card: string; badge: string; solid: boolean }> = {
  ink: { card: 'border-ink bg-ink text-cream', badge: 'border-cream/50 text-cream', solid: true },
  petrol: { card: 'border-link bg-petrol-50 text-fg', badge: 'border-link bg-petrol-800 text-cream', solid: false },
  green: { card: 'border-green-400 bg-green-50 text-fg', badge: 'border-green-400 bg-green-400 text-ink', solid: false },
  orange: { card: 'border-orange-500 bg-orange-50 text-fg', badge: 'border-orange-700 bg-orange-700 text-cream', solid: false },
  neutral: { card: 'border-neutral-500 bg-white text-fg', badge: 'border-primary bg-primary text-on-primary', solid: false },
  beige: { card: 'border-beige-300 bg-beige-100 text-fg', badge: 'border-beige-300 bg-beige-300 text-ink', solid: false },
};

/** SVG fills of the icicle blocks and the text that stays readable on each. */
export const FILL: Record<ChartTone, string> = { ink: 'fill-ink', petrol: 'fill-petrol-800', green: 'fill-green-400', orange: 'fill-orange-700', neutral: 'fill-primary', beige: 'fill-beige-300' };
export const ON_FILL: Record<ChartTone, string> = { ink: 'fill-cream', petrol: 'fill-cream', green: 'fill-ink', orange: 'fill-cream', neutral: 'fill-on-primary', beige: 'fill-ink' };
