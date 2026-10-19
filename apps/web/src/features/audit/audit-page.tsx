import type { AuditLogDto, Paginated } from '@arweqah-platform/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/core/api/api-client';
import { DataTable, Input, PageHeader } from '@/shared/ui';

export function AuditPage() {
  const { t, i18n } = useTranslation('audit');
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const logs = useQuery({
    queryKey: ['audit', page, action],
    queryFn: () => apiClient.get<Paginated<AuditLogDto>>('/audit-logs', { page, action: action || undefined }),
  });
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <Input className="mb-4 max-w-xs" dir="ltr" aria-label={t('filterAction')} placeholder="user.created" value={action} onChange={(e) => { setAction(e.target.value.trim()); setPage(1); }} />
      <DataTable<AuditLogDto>
        caption={t('title')}
        rows={logs.data?.items}
        page={logs.data}
        onPageChange={setPage}
        isLoading={logs.isPending}
        error={logs.error}
        rowKey={(l) => l.id}
        columns={[
          { id: 'when', header: t('when'), className: 'whitespace-nowrap text-muted', cell: (l) => new Date(l.createdAt).toLocaleString(i18n.language) },
          { id: 'actor', header: t('actor'), cell: (l) => l.actorName ?? t('system') },
          { id: 'action', header: t('action'), cell: (l) => <code className="font-latin text-sm" dir="ltr">{l.action}</code> },
          { id: 'target', header: t('target'), cell: (l) => <span className="font-latin text-sm text-muted" dir="ltr">{l.entityType}{l.entityId ? ` ${l.entityId.slice(0, 8)}` : ''}</span> },
        ]}
      />
    </>
  );
}
