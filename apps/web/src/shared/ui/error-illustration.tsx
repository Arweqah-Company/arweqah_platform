import type { ErrorCode } from './error-page';

const ICONS: Record<ErrorCode, string> = {
  // magnifier: nothing found
  404: 'M-14 -14a22 22 0 1 0 0.1 0zM3 3l22 22',
  // padlock: no permission
  403: 'M-18 -2h36v28h-36zM-11 -2v-10a11 11 0 0 1 22 0v10',
  // key: sign in
  401: 'M-22 0a10 10 0 1 0 0.1 0zM-12 0h34M12 0v10M22 0v8',
};

/** The three-digit picture of an error page, drawn with brand colors only: the middle digit is an icon badge. */
export function ErrorIllustration({ code }: { code: ErrorCode }) {
  const digits = String(code);
  return (
    <svg viewBox="0 0 440 340" role="img" aria-hidden="true" className="h-auto w-full max-w-md">
      <circle cx="220" cy="170" r="150" className="fill-neutral-50" />
      <g className="stroke-neutral-200" fill="none" strokeWidth="14">
        <circle cx="86" cy="86" r="34" strokeDasharray="14 10" />
        <circle cx="362" cy="270" r="26" strokeDasharray="12 9" />
      </g>
      <circle cx="372" cy="70" r="9" className="fill-green-400" />
      <circle cx="64" cy="268" r="6" className="fill-green-400" />
      <text x="96" y="236" textAnchor="middle" className="fill-petrol-800 font-heading text-[150px] font-bold">{digits[0]}</text>
      <g transform="translate(220 176)">
        <rect x="-62" y="-92" width="124" height="148" rx="62" className="fill-ink" />
        <g transform="translate(0 -18)" className="stroke-cream" fill="none" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
          <path d={ICONS[code]} />
        </g>
      </g>
      <text x="344" y="236" textAnchor="middle" className="fill-petrol-800 font-heading text-[150px] font-bold">{digits[2]}</text>
      <ellipse cx="220" cy="300" rx="120" ry="9" className="fill-neutral-200" />
    </svg>
  );
}
