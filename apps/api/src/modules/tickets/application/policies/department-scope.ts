import type { AccessContext } from '../../../../core/access/domain/access-context';
import type { TicketDirectory } from '../../domain/contracts/ticket-directory.port';
import type { DepartmentFacts } from '../../domain/types/ticket.types';

/**
 * The departments a person may reach with a permission: the ones they manage (the narrowest scope), plus the ones inside the
 * scope they were given (their unit, their unit and below, their company, or every department).
 */
export async function departmentsFor(ctx: AccessContext, key: string, directory: TicketDirectory): Promise<DepartmentFacts[]> {
  const all = await directory.departments();
  return all.filter((d) => d.managerUserId === ctx.userId || ctx.reaches(key, { orgNodeId: d.orgNodeId, companyId: d.companyId }));
}
