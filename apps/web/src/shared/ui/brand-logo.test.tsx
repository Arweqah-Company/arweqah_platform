import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandLogo, logoSrc } from './brand-logo';

describe('BrandLogo', () => {
  it('picks the file for each tone and layout', () => {
    expect(logoSrc('color', 'horizontal')).toBe('/brand/logo-color-horizontal.png');
    expect(logoSrc('on-dark', 'vertical')).toBe('/brand/logo-color-on-dark-vertical.png');
    expect(logoSrc('ink', 'vertical')).toBe('/brand/logo-ink-vertical.png');
    expect(logoSrc('white', 'horizontal')).toBe('/brand/logo-white-horizontal.png');
    expect(logoSrc('on-dark', 'mark')).toBe('/brand/mark-color.png');
  });

  it('has an accessible name unless decorative, and keeps the aspect ratio', () => {
    const { rerender } = render(<BrandLogo width={157} />);
    const logo = screen.getByRole('img', { name: 'أروقة الريادة' });
    expect(logo).toHaveAttribute('height', '52');
    rerender(<BrandLogo width={157} decorative />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
