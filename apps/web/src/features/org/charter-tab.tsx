import { CorePermission, type OrgCharter } from '@arweqah-platform/shared';
import { FileText, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { pickLines, pickText } from '@/shared/lib/lines';
import { Alert, Button, EmptyState, LineList } from '@/shared/ui';
import { useNodeVersions } from './api';
import { CharterDialog } from './charter-dialog';
import type { DetailsContext } from './details-tabs';

const LISTS = ['outputs', 'inScope', 'outOfScope', 'limits'] as const;

/** A charter with no text at all counts as «no charter yet». */
export const isEmptyCharter = (charter: OrgCharter | null): boolean => !charter || (!charter.purpose.ar && !charter.purpose.en && LISTS.every((k) => charter[k].ar.length === 0 && charter[k].en.length === 0));

function WriteButton({ onClick, label, icon: Icon }: { onClick: () => void; label: string; icon: typeof Pencil }) {
  return (
    <Can adminMode permission={CorePermission.OrgCharterEdit}>
      <Button size="sm" variant="secondary" className="self-start" onClick={onClick}><Icon className="size-4" aria-hidden />{label}</Button>
    </Can>
  );
}

function CharterView({ charter, onEdit }: { charter: OrgCharter; onEdit: () => void }) {
  const { t, i18n } = useTranslation('org');
  const ar = i18n.language === 'ar';
  const purpose = pickText(charter.purpose, ar);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted">{t('charter.note')}</p>
      <section><h3 className="mb-1 text-sm font-bold">{t('charter.purpose')}</h3>{purpose ? <p className="text-sm">{purpose}</p> : <p className="text-sm text-muted">{t('charter.sectionEmpty')}</p>}</section>
      {LISTS.map((key) => {
        const lines = pickLines(charter[key], ar);
        return <section key={key}><h3 className="mb-1 text-sm font-bold">{t(`charter.${key}`)}</h3>{lines.length > 0 ? <LineList items={lines} /> : <p className="text-sm text-muted">{t('charter.sectionEmpty')}</p>}</section>;
      })}
      <WriteButton onClick={onEdit} label={t('charter.edit')} icon={Pencil} />
    </div>
  );
}

/** The charter of the unit (FR-99): purpose, outputs, what is in and out of its scope, and its limits; empty, it offers to write one. */
export function CharterTab({ node }: DetailsContext) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  const [editing, setEditing] = useState(false);
  const query = useNodeVersions(node.id);
  if (query.isPending) return <p role="status" className="text-sm text-muted">{t('charter.loading')}</p>;
  if (query.isError) return <Alert>{errorMessage(tc, query.error)}</Alert>;
  const charter = query.data.charter;
  return (
    <>
      {isEmptyCharter(charter)
        ? <EmptyState icon={FileText} title={t('charter.emptyTitle')} description={t('charter.emptyHint')} action={<WriteButton onClick={() => setEditing(true)} label={t('charter.write')} icon={Pencil} />} />
        : <CharterView charter={charter as OrgCharter} onEdit={() => setEditing(true)} />}
      {editing && <CharterDialog node={node} charter={charter} onClose={() => setEditing(false)} />}
    </>
  );
}
