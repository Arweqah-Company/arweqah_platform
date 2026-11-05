import { CorePermission, type OrgTreeDto } from '@arweqah-platform/shared';
import { ArrowRightLeft, Eye, Hash, Link2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { RowAction } from '@/shared/ui';
import { canHaveChildren, nodeName, type OrgNode } from './org-model';
import type { OrgDialog } from './use-org-page';

interface Props {
  tree: OrgTreeDto;
  node: OrgNode;
  onSelect: (id: string) => void;
  onDialog: (dialog: OrgDialog) => void;
}

/** Every action on a unit's row, as icons: view, add under it, change its management type, set its code, edit, move, delete; each only with its key. */
export function UnitRowActions({ tree, node, onSelect, onDialog }: Props) {
  const { t } = useTranslation('org');
  const { t: tc, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const label = nodeName(node, ar);
  const open = (action: 'edit' | 'mode' | 'code' | 'move' | 'delete') => () => onDialog({ kind: 'unit', action, nodeId: node.id });
  return (
    <>
      <RowAction label={`${tc('actions.view')}: ${label}`} icon={Eye} onClick={() => onSelect(node.id)} />
      {canHaveChildren(tree, node.levelKey) && <Can adminMode permission={CorePermission.OrgUnitCreate}><RowAction label={`${t('actions.addUnder')}: ${label}`} icon={Plus} onClick={() => onDialog({ kind: 'add', parentId: node.id })} /></Can>}
      <Can adminMode permission={CorePermission.OrgUnitShare}><RowAction label={`${t('actions.changeMode')}: ${label}`} icon={Link2} onClick={open('mode')} /></Can>
      {node.code === null && <Can adminMode permission={CorePermission.OrgUnitUpdate}><RowAction label={`${t('actions.setCode')}: ${label}`} icon={Hash} onClick={open('code')} /></Can>}
      <Can adminMode permission={CorePermission.OrgUnitUpdate}><RowAction label={`${tc('actions.edit')}: ${label}`} icon={Pencil} onClick={open('edit')} /></Can>
      {node.levelKey !== 'sector' && <Can adminMode permission={CorePermission.OrgUnitMove}><RowAction label={`${t('actions.move')}: ${label}`} icon={ArrowRightLeft} onClick={open('move')} /></Can>}
      <Can adminMode permission={CorePermission.OrgUnitDelete}><RowAction label={`${tc('actions.delete')}: ${label}`} icon={Trash2} danger onClick={open('delete')} /></Can>
    </>
  );
}
