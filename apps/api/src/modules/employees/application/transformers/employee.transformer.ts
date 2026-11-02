import { Injectable } from '@nestjs/common';
import type { EmployeeDto, EmployeeListItemDto } from '@arweqah-platform/shared';
import { todayIso } from '@arweqah-platform/shared';
import { FieldCipher } from '../../../../common/application/field-cipher';
import { UserAccessService } from '../../../../core/access/application/user-access.service';
import { AuthenticatorService } from '../../../../core/auth/application/authenticator.service';
import { OrgDirectoryService, type NamedRef } from '../../../org/application/services/org-directory.service';
import { EmployeePlacementPort } from '../../../org/domain/contracts/employee-placement.port';
import type { Employee } from '../../domain/entities/employee.entity';

const SOON_DAYS = 30;
const UNKNOWN: NamedRef = { id: '', nameAr: '', nameEn: '' };

/** The entry of `map` for an optional id, or null. */
const pick = <T>(map: Map<string, T>, id: string | null): T | null => (id ? (map.get(id) ?? null) : null);

const maskTail = (value: string): string => `••••${value.slice(-4)}`;

const needsPlacement = (e: Employee): boolean => !e.isSystemAccount && (!e.orgNodeId || !e.jobTitleId);

/** A date within the next SOON_DAYS; `fromPast` also counts dates already passed (an expired document needs attention too). */
function isWithin(date: string | null, today: string, options: { fromPast: boolean }): boolean {
  if (!date) return false;
  const days = daysFromToday(date, today);
  return days <= SOON_DAYS && (options.fromPast || days >= 0);
}

const daysFromToday = (date: string, today: string): number => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);

const isoOrNull = (date: Date | null): string | null => (date ? date.toISOString() : null);

/** The roles of a person with the last day of each that has one. */
const roleRefs = (roles: { id: string; nameAr: string; nameEn: string }[] = [], expiries: Map<string, string> = new Map()) =>
  roles.map((r) => ({ id: r.id, nameAr: r.nameAr, nameEn: r.nameEn, expiresAt: expiries.get(r.id) ?? null }));

/** Turns employee rows into API shapes: names resolved, roles attached, sensitive values decrypted only for those allowed. */
@Injectable()
export class EmployeeTransformer {
  constructor(
    private readonly org: OrgDirectoryService,
    private readonly access: UserAccessService,
    private readonly authenticator: AuthenticatorService,
    private readonly placement: EmployeePlacementPort,
    private readonly cipher: FieldCipher,
  ) {}

  async toDto(e: Employee, view: { isActive: boolean; sensitive: boolean }): Promise<EmployeeDto> {
    const [companies, nodes, titles, managers, roles, groups, authenticatorEnabled, expiries] = await Promise.all([
      this.org.describeCompanies([e.companyId]),
      this.org.describeNodes(e.orgNodeId ? [e.orgNodeId] : []),
      this.org.describeTitles(e.jobTitleId ? [e.jobTitleId] : []),
      this.placement.namesOf(e.managerId ? [e.managerId] : []),
      this.access.rolesOf([e.userId]),
      this.access.groupsOf([e.userId]),
      this.authenticator.isEnabled(e.userId),
      this.access.roleExpiriesOf([e.userId]),
    ]);
    return {
      id: e.id,
      userId: e.userId,
      isActive: view.isActive,
      isSystemAccount: e.isSystemAccount,
      authenticatorEnabled,
      accessEndedAt: isoOrNull(e.accessEndedAt),
      company: companies.get(e.companyId) ?? UNKNOWN,
      relationTypeId: e.relationTypeId,
      orgNode: pick(nodes, e.orgNodeId),
      jobTitle: pick(titles, e.jobTitleId),
      manager: e.managerId ? { id: e.managerId, fullName: managers.get(e.managerId) ?? '' } : null,
      ...this.plainFields(e),
      ...this.sensitiveFields(e, view.sensitive),
      roles: roleRefs(roles.get(e.userId), expiries.get(e.userId)),
      groups: groups.get(e.userId) ?? [],
      sensitiveHidden: !view.sensitive,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  }

  async toListItems(items: Employee[], states: Map<string, boolean>): Promise<EmployeeListItemDto[]> {
    const [companies, nodes, titles] = await Promise.all([
      this.org.describeCompanies([...new Set(items.map((e) => e.companyId))]),
      this.org.describeNodes(items.flatMap((e) => (e.orgNodeId ? [e.orgNodeId] : []))),
      this.org.describeTitles(items.flatMap((e) => (e.jobTitleId ? [e.jobTitleId] : []))),
    ]);
    const today = todayIso();
    return items.map((e) => ({
      id: e.id,
      employeeNumber: e.employeeNumber,
      fullName: e.fullName,
      workEmail: e.workEmail,
      company: companies.get(e.companyId) ?? UNKNOWN,
      orgNode: pick(nodes, e.orgNodeId),
      jobTitle: pick(titles, e.jobTitleId),
      isActive: states.get(e.userId) ?? false,
      needsPlacement: needsPlacement(e),
      idExpiresSoon: isWithin(e.idExpiryDate, today, { fromPast: true }),
      contractEndsSoon: isWithin(e.endDate, today, { fromPast: false }),
    }));
  }

  private sensitiveFields(e: Employee, allowed: boolean): Pick<EmployeeDto, 'idNumber' | 'iban' | 'monthlyGrossSalary'> {
    const idNumber = e.idNumberEnc ? this.cipher.decrypt(e.idNumberEnc) : null;
    const iban = e.ibanEnc ? this.cipher.decrypt(e.ibanEnc) : null;
    if (allowed) return { idNumber, iban, monthlyGrossSalary: e.monthlyGrossSalaryEnc ? Number(this.cipher.decrypt(e.monthlyGrossSalaryEnc)) : null };
    return { idNumber: idNumber ? maskTail(idNumber) : null, iban: iban ? maskTail(iban) : null, monthlyGrossSalary: null };
  }

  private plainFields(e: Employee) {
    return {
      workLocation: e.workLocation,
      workCountryId: e.workCountryId,
      workMode: e.workMode as 0 | 1 | 2 | null,
      workEmail: e.workEmail,
      personalEmail: e.personalEmail,
      workPhone: e.workPhone,
      personalPhone: e.personalPhone,
      employeeNumber: e.employeeNumber,
      fullName: e.fullName,
      fullNameEn: e.fullNameEn,
      gender: e.gender as 0 | 1 | null,
      birthDate: e.birthDate,
      nationalityId: e.nationalityId,
      maritalStatusId: e.maritalStatusId,
      residencyStatusId: e.residencyStatusId,
      idTypeId: e.idTypeId,
      idExpiryDate: e.idExpiryDate,
      startDate: e.startDate,
      endDate: e.endDate,
      contractTypeId: e.contractTypeId,
      contractTypeOther: e.contractTypeOther,
      contractCompanyId: e.contractCompanyId,
      gosiCompanyId: e.gosiCompanyId,
      healthInsuranceCompanyId: e.healthInsuranceCompanyId,
      isGosiRegistered: e.isGosiRegistered,
      gosiRegistrationDate: e.gosiRegistrationDate,
      gosiSystemId: e.gosiSystemId,
      profession: e.profession,
      isQiwaContract: e.isQiwaContract,
      hasMedicalInsurance: e.hasMedicalInsurance,
      terminationReasonId: e.terminationReasonId,
      terminationReasonOther: e.terminationReasonOther,
      salaryCurrencyCountryId: e.salaryCurrencyCountryId,
      notes: e.notes,
    };
  }
}
