import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { useActiveSection } from '@/shared/lib/use-active-section';

export const FORM_SECTIONS = ['work', 'contact', 'personal', 'contract', 'salary', 'notes'] as const;

/** Side menu of the long employee form: sticks while scrolling and highlights the section being read. */
export function SectionsNav({ sensitive }: { sensitive: boolean }) {
  const { t } = useTranslation('employees');
  const sections = FORM_SECTIONS.filter((s) => s !== 'salary' || sensitive);
  const active = useActiveSection(sections);
  return (
    <nav aria-label={t('sectionsNav')} className="hidden lg:block">
      <div className="sticky top-24 rounded-[var(--radius-panel)] border border-neutral-200 bg-white p-2 shadow-sm shadow-ink/5">
        <p className="px-3 pb-2 pt-2 text-xs text-muted">{t('sectionsNav')}</p>
        <ul className="flex flex-col gap-0.5 text-sm">
          {sections.map((s) => (
            <li key={s}>
              <a
                href={`#${s}`}
                aria-current={active === s ? 'location' : undefined}
                className={cn(
                  'block rounded-xl px-3 py-2.5 transition-colors',
                  active === s ? 'bg-primary font-medium text-on-primary' : 'text-fg hover:bg-neutral-50',
                )}
              >
                {t(`sections.${s}`)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
