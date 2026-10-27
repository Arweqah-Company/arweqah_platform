import { BRAND_COLORS, type BrandColor, type TemplateLang } from '@arweqah-platform/shared';
import { escapeHtml, isDarkColor, onColor } from './template-rules';

export interface EmailPage {
  lang: TemplateLang;
  /** Already-sanitized HTML. */
  bodyHtml: string;
  preheader: string;
  buttonText: string;
  link: string | null;
  colors: { band: BrandColor; button: BrandColor };
  appUrl: string;
}

/** Neutrals of the design system (theme `white`, `muted`, `neutral-200`): the card, the small footer text and its rule. */
const SURFACE = '#ffffff';
const MUTED = '#5b6671';
const RULE = '#e4e7eb';

const FOOTER = { ar: 'منصة أروقة الريادة', en: 'Arweqah Alreyadah Platform' } as const;

/**
 * The page every e-mail is built into: a band with the logo, the administrator's body, an optional button and a footer.
 * The layout is fixed and only brand colors enter it, so no edit can break the page or leave the palette.
 */
export function renderEmailPage(page: EmailPage): string {
  const { band, button } = page.colors;
  const rtl = page.lang === 'ar';
  const logo = `${page.appUrl}/brand/logo-${isDarkColor(band) ? 'white' : 'ink'}-horizontal.png`;
  const cta = page.link && page.buttonText
    ? `<p style="margin:24px 0"><a href="${escapeHtml(page.link)}" style="display:inline-block;background:${BRAND_COLORS[button]};color:${onColor(button)};padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700">${escapeHtml(page.buttonText)}</a></p>`
    : '';
  const hidden = page.preheader ? `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(page.preheader)}</div>` : '';
  return `<div dir="${rtl ? 'rtl' : 'ltr'}" style="font-family:Tajawal,Arial,sans-serif;background:${BRAND_COLORS.cream};color:${BRAND_COLORS.ink};padding:24px">${hidden}
<div style="max-width:560px;margin:0 auto;background:${SURFACE};border-radius:16px;overflow:hidden">
<div style="background:${BRAND_COLORS[band]};padding:20px 28px"><img src="${escapeHtml(logo)}" alt="Arweqah" width="150" style="display:block"></div>
<div style="padding:28px;line-height:1.8;font-size:16px">${page.bodyHtml}${cta}</div>
<div style="padding:16px 28px;font-size:13px;color:${MUTED};border-top:1px solid ${RULE}">${FOOTER[page.lang]}</div>
</div></div>`;
}
