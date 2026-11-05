import type { LeaderEscalationDto, OrgLeaderCompanyDto, OrgNodeLeaderDto } from '@arweqah-platform/shared';
import { leaderStatus } from '../../domain/rules/org-leader.rules';
import type { LeaderRow } from '../../domain/types/org-leader.types';
import type { CompanyView } from '../../domain/types/org.types';

export interface LeaderNames {
  companies: ReadonlyMap<string, Pick<CompanyView, 'nameAr' | 'nameEn'>>;
  employees: ReadonlyMap<string, string>;
}

export const toLeaderDto = (r: LeaderRow, names: LeaderNames, today: string): OrgNodeLeaderDto => ({
  id: r.id,
  nodeId: r.nodeId,
  companyId: r.companyId,
  companyNameAr: names.companies.get(r.companyId)?.nameAr ?? '',
  companyNameEn: names.companies.get(r.companyId)?.nameEn ?? '',
  employeeId: r.employeeId,
  employeeName: names.employees.get(r.employeeId) ?? '',
  kind: r.kind,
  validFrom: r.validFrom,
  validTo: r.validTo,
  status: leaderStatus(r, today),
  reason: r.reason,
});

export interface CompanyRowsInput {
  nodeId: string;
  companyIds: ReadonlySet<string>;
  companies: LeaderNames['companies'];
  items: readonly OrgNodeLeaderDto[];
  staff: ReadonlyMap<string, number>;
  escalation: (nodeId: string, company: string) => LeaderEscalationDto | null;
}

/** One row per company of the unit: its people there, who leads for it and who acts, and where the manager goes when nobody leads. */
export function companyRows(input: CompanyRowsInput): OrgLeaderCompanyDto[] {
  const rows = [...input.companyIds].flatMap((id): OrgLeaderCompanyDto[] => {
    const company = input.companies.get(id);
    if (!company) return [];
    const current = (kind: OrgNodeLeaderDto['kind']) => input.items.find((i) => i.companyId === id && i.kind === kind && i.status === 'current') ?? null;
    const leader = current('leader');
    const count = input.staff.get(id) ?? 0;
    return [{ companyId: id, nameAr: company.nameAr, nameEn: company.nameEn, staffCount: count, leader, acting: current('acting'), escalatesTo: count > 0 && !leader ? input.escalation(input.nodeId, id) : null }];
  });
  return rows.sort((a, b) => a.nameEn.localeCompare(b.nameEn));
}
