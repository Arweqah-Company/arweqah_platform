import { CorePermission } from '@arweqah-platform/shared';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useMe } from '@/core/auth/session';
import { usePermissions } from '@/core/permissions/can';

export const ASSIGN_LEADER_PARAM = 'assign';
export const ASSIGN_LEADER_VALUE = 'leader';

/**
 * A link may open the leaders tab with the assignment form already open: `?unit=<id>&tab=leaders&assign=leader` (the ticket setup page uses it for a
 * unit without a manager). It applies once (the parameter is removed from the address) and only for who may assign, in platform admin mode, like the button.
 */
export function useAssignFromLink(open: () => void) {
  const [params, setParams] = useSearchParams();
  const me = useMe();
  const allowed = usePermissions().can(CorePermission.OrgLeadersManage) && me.data?.adminMode.active === true;
  const asked = params.get(ASSIGN_LEADER_PARAM) === ASSIGN_LEADER_VALUE;
  useEffect(() => {
    if (!asked || !allowed) return;
    open();
    setParams((current) => { const next = new URLSearchParams(current); next.delete(ASSIGN_LEADER_PARAM); return next; }, { replace: true });
  }, [asked, allowed, open, setParams]);
}
