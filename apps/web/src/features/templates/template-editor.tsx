import Mention from '@tiptap/extension-mention';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Link2, List, ListOrdered, Underline as UnderlineIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { fromEditorHtml, toEditorHtml, type EditorMode } from './editor-tokens';
import { suggestionFor, type VariableItem } from './variable-suggestion';

interface Props {
  /** Stored text with `{{variables}}`. */
  value: string;
  onChange: (value: string) => void;
  mode: EditorMode;
  lang: 'ar' | 'en';
  /** What the code can fill into this template; typing `@` offers exactly these. */
  variables: VariableItem[];
  label: string;
  /** Someone who may only view: the text cannot be typed into (a disabled fieldset does not stop an editable area). */
  readOnly?: boolean;
}

const CHIP = 'rounded-md bg-petrol-50 px-1.5 py-0.5 text-sm font-medium text-link';

function extensionsFor(mode: EditorMode, variables: VariableItem[]) {
  const plain = mode !== 'rich';
  const kit = StarterKit.configure(
    plain
      ? { bold: false, italic: false, underline: false, strike: false, code: false, codeBlock: false, blockquote: false, bulletList: false, orderedList: false, listItem: false, heading: false, horizontalRule: false, link: false }
      : { strike: false, code: false, codeBlock: false, blockquote: false, heading: false, horizontalRule: false, link: { openOnClick: false, autolink: false, protocols: ['http', 'https', 'mailto'] } },
  );
  const chip = Mention.configure({
    HTMLAttributes: { class: CHIP },
    renderText: ({ node }) => `{{${String(node.attrs.id)}}}`,
    suggestion: suggestionFor(variables),
  });
  return [kit, chip];
}

function Toolbar({ editor }: { editor: Editor }) {
  const { t } = useTranslation('templates');
  const [url, setUrl] = useState<string | null>(null);
  const button = (label: string, icon: typeof Bold, active: boolean, run: () => void) => {
    const Icon = icon;
    return (
      <button key={label} type="button" aria-label={label} title={label} aria-pressed={active} onClick={run} className={cn('grid size-11 place-items-center rounded-lg text-fg sm:size-9 transition-colors hover:bg-neutral-50', active && 'bg-petrol-50 text-link')}>
        <Icon className="size-4" aria-hidden />
      </button>
    );
  };
  const applyLink = () => {
    if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    else editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setUrl(null);
  };
  return (
    <div className="border-b border-neutral-200 p-1">
      <div className="flex flex-wrap gap-1" role="toolbar" aria-label={t('editor.toolbar')}>
        {button(t('editor.bold'), Bold, editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
        {button(t('editor.italic'), Italic, editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
        {button(t('editor.underline'), UnderlineIcon, editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run())}
        {button(t('editor.bullets'), List, editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
        {button(t('editor.numbers'), ListOrdered, editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
        {button(t('editor.link'), Link2, editor.isActive('link'), () => setUrl(editor.getAttributes('link').href ?? 'https://'))}
      </div>
      {url !== null && (
        <div className="mt-1 flex gap-2 p-1">
          <input dir="ltr" aria-label={t('editor.linkAddress')} className="min-h-9 flex-1 rounded-lg border border-neutral-200 bg-white px-2 text-sm" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyLink())} />
          <button type="button" className="rounded-lg px-3 text-sm font-medium text-link hover:bg-petrol-50" onClick={applyLink}>{t('editor.apply')}</button>
        </div>
      )}
    </div>
  );
}

/** One piece of wording: formatted text for an e-mail body, plain paragraphs for a notification, a single line for a title. Typing `@` offers the template's variables. */
export function TemplateEditor({ value, onChange, mode, lang, variables, label, readOnly = false }: Props) {
  const labels = useMemo(() => Object.fromEntries(variables.map((v) => [v.id, v.label])), [variables]);
  const editor = useEditor({
    extensions: extensionsFor(mode, variables),
    editable: !readOnly,
    content: toEditorHtml(value, labels, mode),
    editorProps: {
      attributes: { dir: lang === 'ar' ? 'rtl' : 'ltr', lang, role: 'textbox', 'aria-multiline': String(mode !== 'line'), 'aria-label': label, class: cn('prose-none min-h-11 px-3 py-2 text-base outline-none', mode === 'rich' ? 'min-h-40' : mode === 'plain' ? 'min-h-24' : '') },
      handleKeyDown: (_view, event) => mode === 'line' && event.key === 'Enter',
    },
    onUpdate: ({ editor: e }) => onChange(fromEditorHtml(e.getHTML(), mode)),
  });
  return (
    <div className="rounded-xl border border-neutral-200 bg-white focus-within:border-link focus-within:ring-2 focus-within:ring-petrol-50">
      {editor && mode === 'rich' && !readOnly && <Toolbar editor={editor} />}
      <EditorContent editor={editor} className="[&_a]:text-link [&_a]:underline [&_ol]:list-decimal [&_ol]:ps-6 [&_p]:my-1 [&_ul]:list-disc [&_ul]:ps-6" />
    </div>
  );
}
