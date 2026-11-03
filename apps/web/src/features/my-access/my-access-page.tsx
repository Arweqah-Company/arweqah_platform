import type { MyAccessDto, MyAccessGrantDto } from '@arweqah-platform/shared';
import { CorePermission } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { AdminModeToggle } from '@/core/admin-mode/admin-mode-toggle';
import { useAccess } from '@/core/permissions/use-access';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { useListPage } from '@/shared/lib/use-list-page';
import { useScopeLabel } from '@/shared/lib/use-scope-label';
import { Alert, Badge, DataTable, ListToolbar, PageHeader } from '@/shared/ui';
import { grantExportColumns, grantFilterFields, labelOf, matchesGrantFilters, sourceName } from './my-access-list';

/** The roles the person holds, as badges. */
function RolesStrip({ roles }: { roles: MyAccessDto['roles'] }) {
  const { t, i18n } = useTranslation('my-access');
  return (
    <section aria-labelledby="my-roles">
      <h2 id="my-roles" className="mb-2 text-sm font-bold">{t('roles')}</h2>
      <ul className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <li key={r.id}><Badge tone={r.assignment === 'auto' ? 'neutral' : 'info'}>{i18n.language === 'ar' ? r.nameAr : r.nameEn} · {t(`assignment.${r.assignment}`)}</Badge></li>
        ))}
      </ul>
    </section>
  );
}

/** What the signed-in person may do now and where each permission comes from. Read once after sign-in and again when admin mode changes. */
export function MyAccessPage() {
  const { t, i18n } = useTranslation('my-access');
  const { t: tr } = useTranslation('roles');
  const access = useAccess();
  const scopeLabel = useScopeLabel();
  const list = useListPage('my-access');
  const moduleName = (module: string) => tr(`module.${module}`, { defaultValue: module });
  const grants = access.data?.grants ?? [];
  const rows = grants.filter((g) => matchesGrantFilters(g, { term: list.term, filters: list.filters.values, language: i18n.language, moduleName }));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('title')} description={t('description')} />
      {access.data && <RolesStrip roles={access.data.roles} />}
      {access.data?.adminRolesHidden && (
        <Alert tone="info">
          <div className="flex flex-wrap items-center justify-between gap-3"><span>{t('adminHidden')}</span><AdminModeToggle /></div>
        </Alert>
      )}
      <DataTable<MyAccessGrantDto>
        listKey="my-access"
        caption={t('title')}
        view={list.view}
        toolbar={<ListToolbar listKey="my-access" {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder') }, grantFilterFields(t, grants, moduleName, scopeLabel))} actions={<ExchangeButtons permissions={{ export: CorePermission.MyAccessExport }} exporting={{ columns: grantExportColumns(t, i18n.language, moduleName, scopeLabel), filename: 'my-access', pageRows: rows, total: rows.length, loadAll: async () => rows }} />} />}
        rows={access.isPending ? undefined : rows}
        isLoading={access.isPending}
        error={access.error}
        rowKey={(g) => g.key}
        groupOf={(g) => moduleName(g.module)}
        columns={[
          { id: 'permission', header: t('permission'), cell: (g) => <span className="font-medium">{labelOf(g, i18n.language)}</span> },
          { id: 'module', header: t('module'), cell: (g) => moduleName(g.module) },
          { id: 'scope', header: t('scope'), cell: (g) => scopeLabel(g.scope) },
          { id: 'source', header: t('source'), cell: (g) => <span className="flex flex-wrap gap-1">{g.sources.map((s) => <Badge key={`${s.kind}:${s.nameEn}`} tone="neutral">{sourceName(s, i18n.language)}</Badge>)}</span> },
        ]}
      />
    </div>
  );
}
