import type { MentionNodeAttrs } from '@tiptap/extension-mention';
import type { SuggestionKeyDownProps, SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';

export interface VariableItem {
  /** The variable's name, as the code knows it. */
  id: string;
  /** What a person reads: the description in the language being edited. */
  label: string;
}

type Props = SuggestionProps<VariableItem, MentionNodeAttrs>;

const BOX = 'pointer-events-auto fixed z-[60] max-h-60 min-w-48 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-xl';
const ROW = 'block w-full rounded-lg px-3 py-2 text-start text-sm';

/** The small list under the cursor: drawn with plain DOM, moved with the arrows, chosen with Enter, Tab or the mouse. */
class PickList {
  private readonly box = document.createElement('div');
  private selected = 0;

  constructor(private props: Props) {
    this.box.setAttribute('role', 'listbox');
    this.box.className = BOX;
    document.body.appendChild(this.box);
    this.draw();
  }

  update(props: Props): void {
    this.props = props;
    this.selected = Math.min(this.selected, Math.max(props.items.length - 1, 0));
    this.draw();
  }

  /** True when the key was used by the list (so the editor must not also act on it). */
  key({ event }: SuggestionKeyDownProps): boolean {
    const { items } = this.props;
    if (event.key === 'Escape') return true;
    if (!items.length) return false;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      this.selected = (this.selected + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      this.draw();
      return true;
    }
    if (event.key !== 'Enter' && event.key !== 'Tab') return false;
    const item = items[this.selected];
    if (item) this.props.command(item);
    return true;
  }

  close(): void {
    this.box.remove();
  }

  private draw(): void {
    const rect = this.props.clientRect?.();
    if (rect) Object.assign(this.box.style, { left: `${rect.left}px`, top: `${rect.bottom + 4}px` });
    this.box.replaceChildren(...this.props.items.map((item, index) => this.row(item, index === this.selected)));
  }

  private row(item: VariableItem, active: boolean): HTMLButtonElement {
    const row = document.createElement('button');
    row.type = 'button';
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', String(active));
    row.className = `${ROW} ${active ? 'bg-petrol-50 text-link' : 'text-fg hover:bg-neutral-50'}`;
    row.textContent = `@${item.label}`;
    row.onmousedown = (event) => {
      event.preventDefault();
      this.props.command(item);
    };
    return row;
  }
}

/**
 * The `@` pick list: offers only the variables of the template being edited, so the editor can never insert a name the
 * code does not fill.
 */
export function suggestionFor(variables: VariableItem[]): Omit<SuggestionOptions<VariableItem, MentionNodeAttrs>, 'editor'> {
  return {
    char: '@',
    allowSpaces: false,
    items: ({ query }) => variables.filter((v) => `${v.id} ${v.label}`.toLowerCase().includes(query.toLowerCase())),
    command: ({ editor, range, props }) => {
      editor.chain().focus().insertContentAt(range, [{ type: 'mention', attrs: { id: props.id, label: props.label } }, { type: 'text', text: ' ' }]).run();
    },
    render: () => {
      let list: PickList | null = null;
      return {
        onStart: (props) => (list = new PickList(props)),
        onUpdate: (props) => list?.update(props),
        onKeyDown: (props) => list?.key(props) ?? false,
        onExit: () => {
          list?.close();
          list = null;
        },
      };
    },
  };
}
