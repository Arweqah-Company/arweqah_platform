import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Link2, List, ListOrdered, Underline as UnderlineIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/cn';

interface Props {
  /** Formatted text as HTML (the API sanitizes it again before saving). */
  value: string;
  onChange: (html: string) => void;
  label: string;
  lang: 'ar' | 'en';
  id?: string;
}

const KIT = StarterKit.configure({ strike: false, code: false, codeBlock: false, blockquote: false, heading: false, horizontalRule: false, link: { openOnClick: false, autolink: false, protocols: ['http', 'https', 'mailto'] } });

function Toolbar({ editor }: { editor: Editor }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const button = (label: string, Icon: typeof Bold, active: boolean, run: () => void) => (
    <button key={label} type="button" aria-label={label} title={label} aria-pressed={active} onClick={run} className={cn('grid size-11 place-items-center rounded-lg text-fg transition-colors hover:bg-neutral-50 sm:size-9', active && 'bg-petrol-50 text-link')}>
      <Icon className="size-4" aria-hidden />
    </button>
  );
  const applyLink = () => {
    const chain = editor.chain().focus().extendMarkRange('link');
    (url ? chain.setLink({ href: url }) : chain.unsetLink()).run();
    setUrl(null);
  };
  return (
    <div className="border-b border-neutral-200 p-1">
      <div className="flex flex-wrap gap-1" role="toolbar" aria-label={t('richText.toolbar')}>
        {button(t('richText.bold'), Bold, editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
        {button(t('richText.italic'), Italic, editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
        {button(t('richText.underline'), UnderlineIcon, editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run())}
        {button(t('richText.bullets'), List, editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
        {button(t('richText.numbers'), ListOrdered, editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
        {button(t('richText.link'), Link2, editor.isActive('link'), () => setUrl(editor.getAttributes('link').href ?? 'https://'))}
      </div>
      {url !== null && (
        <div className="mt-1 flex gap-2 p-1">
          <input dir="ltr" aria-label={t('richText.linkAddress')} className="min-h-9 flex-1 rounded-lg border border-neutral-200 bg-white px-2 text-sm" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyLink())} />
          <button type="button" className="rounded-lg px-3 text-sm font-medium text-link hover:bg-petrol-50" onClick={applyLink}>{t('richText.apply')}</button>
        </div>
      )}
    </div>
  );
}

/** Formatted text (bold, italic, underline, lists, links) in the brand's field style. An empty editor reports an empty string. */
export function RichTextEditor({ value, onChange, label, lang, id }: Props) {
  const editor = useEditor({
    extensions: [KIT],
    content: value,
    editorProps: { attributes: { ...(id ? { id } : {}), dir: lang === 'ar' ? 'rtl' : 'ltr', lang, role: 'textbox', 'aria-multiline': 'true', 'aria-label': label, class: 'min-h-32 px-3 py-2 text-base outline-none' } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
  });
  return (
    <div className="rounded-xl border border-neutral-200 bg-white focus-within:border-link focus-within:ring-2 focus-within:ring-petrol-50">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} className="[&_a]:text-link [&_a]:underline [&_ol]:list-decimal [&_ol]:ps-6 [&_p]:my-1 [&_ul]:list-disc [&_ul]:ps-6" />
    </div>
  );
}
