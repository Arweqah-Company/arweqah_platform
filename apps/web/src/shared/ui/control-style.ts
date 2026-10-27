/** Soft controls: gentle hover, a calm focus halo (the border still turns petrol, so focus never relies on the halo alone). */
export const controlBase =
  'w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-fg outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-muted hover:border-neutral-500 focus:border-link focus:ring-4 focus:ring-link/15 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-muted aria-[invalid=true]:border-danger-700 aria-[invalid=true]:focus:ring-danger-700/15';
export const control = `h-12 ${controlBase}`;
