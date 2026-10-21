import { useTranslation } from 'react-i18next';
import { cn } from '../lib/cn';

/**
 * Official Arweqah logo files in /brand (served from public/).
 * - color:   full-color mark, ink wordmark. Light backgrounds (cream, beige).
 * - on-dark: full-color mark, cream wordmark. Dark `ink` backgrounds ONLY (on petrol the mark's petrol quarter disappears).
 * - ink:     single color. One-color uses on light backgrounds.
 * - white:   single color. Dark or saturated backgrounds (ink, petrol).
 */
export type LogoTone = 'color' | 'on-dark' | 'ink' | 'white';
export type LogoLayout = 'horizontal' | 'vertical' | 'mark';

const SIZES: Record<LogoLayout, { width: number; height: number }> = {
  horizontal: { width: 785, height: 261 },
  vertical: { width: 477, height: 463 },
  mark: { width: 251, height: 250 },
};

export function logoSrc(tone: LogoTone, layout: LogoLayout): string {
  if (layout === 'mark') return `/brand/mark-${tone === 'on-dark' ? 'color' : tone}.png`;
  return `/brand/logo-${tone === 'on-dark' ? 'color-on-dark' : tone}-${layout}.png`;
}

interface BrandLogoProps {
  tone?: LogoTone;
  layout?: LogoLayout;
  /** Rendered width in px; the height follows the file's aspect ratio. */
  width: number;
  /** Set when the brand name is already visible next to the logo, or the area is aria-hidden. */
  decorative?: boolean;
  className?: string;
}

export function BrandLogo({ tone = 'color', layout = 'horizontal', width, decorative = false, className }: BrandLogoProps) {
  const { t } = useTranslation();
  const natural = SIZES[layout];
  return (
    <img
      src={logoSrc(tone, layout)}
      alt={decorative ? '' : t('brand.logoAlt')}
      width={width}
      height={Math.round((width * natural.height) / natural.width)}
      className={cn('h-auto max-w-full select-none', className)}
      draggable={false}
    />
  );
}
