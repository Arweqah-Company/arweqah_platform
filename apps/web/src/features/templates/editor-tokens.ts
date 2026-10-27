import { VARIABLE_PATTERN } from '@arweqah-platform/shared';

/**
 * The editor shows a variable as a chip (`@recipient name`); the stored text keeps `{{name}}`. These two functions
 * convert between them, so what is saved is the same plain text the server fills.
 */
export type EditorMode = 'rich' | 'plain' | 'line';

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** `labels` maps each variable the template can fill to the text its chip shows. */
export function chipHtml(name: string, label: string): string {
  return `<span data-type="mention" data-id="${escapeHtml(name)}" data-label="${escapeHtml(label)}">@${escapeHtml(label)}</span>`;
}

function withChips(html: string, labels: Record<string, string>): string {
  return html.replace(VARIABLE_PATTERN, (whole, name: string) => (name in labels ? chipHtml(name, labels[name]!) : whole));
}

/** Stored text → what the editor loads. Notifications are plain text (a line per paragraph); e-mail bodies are HTML. */
export function toEditorHtml(text: string, labels: Record<string, string>, mode: EditorMode): string {
  if (mode === 'rich') return withChips(text, labels);
  const lines = (mode === 'line' ? [text] : text.split('\n')).map((line) => `<p>${withChips(escapeHtml(line), labels)}</p>`);
  return lines.join('');
}

/** The text of a paragraph, as typed: a line break stays one, a non-breaking space is a space, and every entity is decoded once by the parser. */
function textOf(paragraph: Element): string {
  paragraph.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  return (paragraph.textContent ?? '').replace(/\u00a0/g, ' ');
}

/** What the editor holds → the stored text. */
export function fromEditorHtml(html: string, mode: EditorMode): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  doc.querySelectorAll('span[data-type="mention"]').forEach((chip) => chip.replaceWith(`{{${chip.getAttribute('data-id') ?? ''}}}`));
  if (mode === 'rich') return doc.body.innerHTML.replace(/<p><\/p>/g, '');
  const paragraphs = [...doc.body.querySelectorAll('p')].map(textOf);
  return (mode === 'line' ? paragraphs.slice(0, 1) : paragraphs).join('\n').replace(/\n+$/, '');
}
