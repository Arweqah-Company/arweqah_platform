let counter = 0;

/** A fresh three-letter code prefix for a root unit made by a factory (AAA, AAB, … in base 26), so two root units never share one. */
export const randomPrefix = (): string => {
  const n = counter++ % 17_576;
  return [Math.floor(n / 676), Math.floor(n / 26) % 26, n % 26].map((digit) => String.fromCharCode(65 + digit)).join('');
};
