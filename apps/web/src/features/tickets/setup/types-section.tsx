import type { TicketDeskDto, TicketTypeDto } from '@arweqah-platform/shared';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Badge, Button, ConfirmDialog, SectionCard } from '@/shared/ui';
import { useRemoveType } from '../api';
import { TypeDialog } from './type-dialog';

/** The kinds of ticket this department takes: name, who handles it, how long it usually takes. */
export function TypesSection({ desk }: { desk: TicketDeskDto }) {
  const { t, i18n } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const ar = i18n.language === 'ar';
  const remove = useRemoveType(desk.orgNodeId);
  const [editing, setEditing] = useState<TicketTypeDto | 'new' | null>(null);
  const [removing, setRemoving] = useState<TicketTypeDto | null>(null);
  const confirm = async () => {
    try {
      const { deleted } = await remove.mutateAsync((removing as TicketTypeDto).id);
      toast.success(t(deleted ? 'setup.type.deleted' : 'setup.type.deactivated'));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
    setRemoving(null);
  };
  return (
    <SectionCard id="types" title={t('setup.typesTitle')} description={t('setup.typesIntro')}>
      <div className="flex flex-col gap-3 sm:col-span-2">
        {desk.types.length === 0 && <p className="text-sm text-muted">{t('setup.noTypes')}</p>}
        <ul className="flex flex-col gap-2">
          {desk.types.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 p-3">
              <span className="flex flex-col gap-0.5 text-sm">
                <span className="font-medium">{ar ? x.nameAr : x.nameEn} {x.isPersonal && <Badge>{t('flags.personal')}</Badge>} {!x.isActive && <Badge>{t('setup.type.inactive')}</Badge>}</span>
                <span className="text-xs text-muted">{x.defaultAssignee ? t('setup.type.handledBy', { name: x.defaultAssignee.name }) : t('setup.type.noAssignee')} · {t('setup.type.days', { count: x.dueDays ?? desk.settings.defaultDueDays })}</span>
              </span>
              <span className="flex gap-1">
                <Button size="icon" variant="ghost" aria-label={t('setup.type.edit', { name: ar ? x.nameAr : x.nameEn })} onClick={() => setEditing(x)}><Pencil className="size-4" aria-hidden /></Button>
                <Button size="icon" variant="ghost" className="text-danger-text" aria-label={t('setup.type.remove', { name: ar ? x.nameAr : x.nameEn })} onClick={() => setRemoving(x)}><Trash2 className="size-4" aria-hidden /></Button>
              </span>
            </li>
          ))}
        </ul>
        <Button variant="secondary" size="sm" className="self-start" onClick={() => setEditing('new')}><Plus className="size-4" aria-hidden />{t('setup.type.add')}</Button>
      </div>
      {editing && <TypeDialog deskId={desk.orgNodeId} type={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)} tone="danger" title={t('setup.type.removeTitle')} description={t('setup.type.removeBody')} confirmLabel={tc('actions.delete')} onConfirm={confirm} />
    </SectionCard>
  );
}
