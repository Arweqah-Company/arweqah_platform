/** A section of the manual as the build script writes it (`scripts/build-user-manual.mjs`). */
export interface ManualSection {
  id: string;
  group: number;
  title: string;
  /** Any of these permissions opens the section; none = every signed-in person. */
  permissions: string[];
  /** The page-visibility key: a role the page is hidden from does not see the section either. */
  page: string | null;
  /** The page works only while platform admin mode is on. */
  adminMode: boolean;
  blocks: Block[];
}

export type Inline = string | { code: string } | { bold: string } | { perm: { key: string; label: string } } | { img: { alt: string; src: string } };
export type Block =
  | { h: 3 | 4; i: Inline[] }
  | { p: Inline[] }
  | { ul: Inline[][] }
  | { ol: Inline[][] }
  | { table: { head: Inline[][]; rows: Inline[][][] } }
  | { note: Inline[][] };

export interface Manual {
  title: string;
  intro: Block[];
  groups: string[];
  sections: ManualSection[];
}

/** The sections a person may read: they hold one of the page's permissions and no role hides the page from them. */
export function visibleSections(sections: ManualSection[], can: (permission: string) => boolean, hiddenPages: readonly string[]): ManualSection[] {
  return sections.filter((s) => (s.permissions.length === 0 || s.permissions.some(can)) && !(s.page && hiddenPages.includes(s.page)));
}

const textOf = (nodes: Inline[]): string => nodes.map((n) => (typeof n === 'string' ? n : 'code' in n ? n.code : 'bold' in n ? n.bold : 'perm' in n ? n.perm.label : n.img.alt)).join('');

/** Plain text of one block (for the search box). */
function blockText(b: Block): string {
  if ('p' in b) return textOf(b.p);
  if ('h' in b) return textOf(b.i);
  if ('ul' in b) return b.ul.map(textOf).join(' ');
  if ('ol' in b) return b.ol.map(textOf).join(' ');
  if ('note' in b) return b.note.map(textOf).join(' ');
  return [...b.table.head, ...b.table.rows.flat()].map(textOf).join(' ');
}

/** Plain text of a section, lower case. */
export const plainText = (s: ManualSection): string => `${s.title} ${s.blocks.map(blockText).join(' ')}`.toLowerCase();
