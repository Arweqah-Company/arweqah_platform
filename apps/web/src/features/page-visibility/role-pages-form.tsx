import type { HideablePage, PageVisibilityRoleDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/shared/lib/error-message';
import { saveWithToast } from '@/shared/lib/use-save-toast';
import { Alert, Button, SectionCard } from '@/shared/ui';
import { useSaveRolePages } from './api';

interface Props {
  role: PageVisibilityRoleDto;
  pages: HideablePage[];
}

/** One role: a checkbox per page ("shown to this role"); saving replaces the role's hidden pages. */
export function RolePagesForm({ role, pages }: Props) {
  const { t } = useTranslation('pageVisibility');
  const { t: tc } = useTranslation();
  const save = useSaveRolePages(role.id);
  const [hidden, setHidden] = useState<HideablePage[]>(role.hiddenPages);
  const toggle = (page: HideablePage) => setHidden((now) => (now.includes(page) ? now.filter((p) => p !== page) : [...now, page]));
  const changed = hidden.length !== role.hiddenPages.length || hidden.some((p) => !role.hiddenPages.includes(p));
  const submit = saveWithToast(save.mutateAsync, t('saved'));
  return (
    <SectionCard id="pages" title={t('pagesTitle')} description={t('pagesIntro')}>
      <form className="flex flex-col gap-4 sm:col-span-2" onSubmit={(e) => { e.preventDefault(); void submit({ hiddenPages: hidden }); }} noValidate>
        {role.locked && <Alert tone="info">{t('locked')}</Alert>}
        {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
        <ul className="grid gap-2 sm:grid-cols-2">
          {pages.map((page) => (
            <li key={page}>
              <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-neutral-200 px-4 text-sm">
                <input type="checkbox" className="size-4 accent-petrol-800" checked={!hidden.includes(page)} disabled={role.locked} onChange={() => toggle(page)} />
                {t(`page.${page}`)}
              </label>
            </li>
          ))}
        </ul>
        <div><Button type="submit" disabled={save.isPending || !changed || role.locked}>{tc('actions.save')}</Button></div>
      </form>
    </SectionCard>
  );
}
