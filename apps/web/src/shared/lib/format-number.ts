/** A number for display: Latin digits in Arabic and in English alike (never the browser's Arabic-Indic digits), thousands separated by a comma. */
const NUMBER = new Intl.NumberFormat('en-US');

export const formatNumber = (value: number): string => NUMBER.format(value);
