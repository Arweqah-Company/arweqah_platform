import type { BasicRequestDto, BilingualName, LookupItemDto, LookupsDto } from '@arweqah-platform/shared';
import type { EmployeeBasicRequest } from '../../domain/entities/employee-basic-request.entity';

const nameOf = (list: LookupItemDto[], id: string | undefined): BilingualName | null => {
  const item = id ? list.find((i) => i.id === id) : undefined;
  return item ? { nameAr: item.nameAr, nameEn: item.nameEn } : null;
};

/** A request as the screens read it: what was asked for, with the names behind the lookup ids. */
export function basicRequestDto(row: EmployeeBasicRequest, lookups: LookupsDto): BasicRequestDto {
  return {
    id: row.id,
    employeeId: row.employeeId,
    status: row.status,
    values: row.changes,
    names: { nationality: nameOf(lookups.countries, row.changes.nationalityId), maritalStatus: nameOf(lookups.maritalStatuses, row.changes.maritalStatusId) },
    rejectionReason: row.rejectionReason,
    submittedAt: row.submittedAt.toISOString(),
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
  };
}
