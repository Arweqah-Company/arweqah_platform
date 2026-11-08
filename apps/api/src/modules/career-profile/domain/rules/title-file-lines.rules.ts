/** Buttons of the page the file was copied from; they are not content. */
export const PAGE_NOISE: readonly string[] = ['التالي', 'السابق', 'طباعة', 'رجوع'];

/** The lines of a pasted file: trimmed, with the empty ones left out. */
export function fileLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** The text after the first colon of a line such as «مخرجه الموثق في هذا المستوى: …». */
export function afterColon(line: string): string {
  return line.replace(/^[^:]*:\s*/, '');
}

/** The line `offset` places after `index`, or an empty string past the end. */
export function lineAt(lines: readonly string[], index: number): string {
  return lines[index] ?? '';
}
