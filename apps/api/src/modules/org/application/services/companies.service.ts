import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CompanyDto, UpsertCompanyInput } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { ORG_CHANGED } from '../../../../core/access/application/access.events';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { CompanyCodeTakenError, CompanyInUseError } from '../../domain/errors/org.errors';
import { EmployeePlacementPort } from '../../domain/contracts/employee-placement.port';
import type { CompanyView } from '../../domain/types/org.types';
import { OrgRepository } from '../../domain/contracts/org.repository';
import { toCompanyDto } from '../transformers/org.transformer';
import { ORG_AUDIT } from '../messages/org.messages';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly repo: OrgRepository,
    private readonly employees: EmployeePlacementPort,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  async list(): Promise<CompanyDto[]> {
    const companies = await this.repo.companies();
    const counts = await this.employees.countByCompanies(companies.map((c) => c.id));
    return companies.map((c) => toCompanyDto(c, counts.get(c.id) ?? 0));
  }

  async get(id: string): Promise<CompanyView> {
    const company = await this.repo.company(id);
    if (!company) throw new NotFoundError('Company', id);
    return company;
  }

  /** A new company needs nothing more: the structure is one for the whole group. */
  async create(input: UpsertCompanyInput, actorId: string | null): Promise<CompanyDto> {
    if (await this.repo.companyCodeTaken(input.code)) throw new CompanyCodeTakenError();
    const id = await this.tx.run((tx) => this.repo.insertCompany(input, tx));
    this.audit(actorId, ORG_AUDIT.companyCreated, id, { code: input.code });
    await this.events.emitAsync(ORG_CHANGED);
    return toCompanyDto(await this.get(id), 0);
  }

  async update(id: string, input: UpsertCompanyInput, actorId: string): Promise<CompanyDto> {
    await this.get(id);
    if (await this.repo.companyCodeTaken(input.code, id)) throw new CompanyCodeTakenError();
    await this.tx.run((tx) => this.repo.updateCompany(id, input, tx));
    this.audit(actorId, ORG_AUDIT.companyUpdated, id, { code: input.code, isActive: input.isActive });
    const counts = await this.employees.countByCompanies([id]);
    return toCompanyDto(await this.get(id), counts.get(id) ?? 0);
  }

  async remove(id: string, actorId: string): Promise<void> {
    await this.get(id);
    const employees = (await this.employees.countByCompanies([id])).get(id) ?? 0;
    if (employees > 0 || (await this.repo.unitsCountOfCompany(id)) > 0) throw new CompanyInUseError();
    await this.tx.run((tx) => this.repo.softDeleteCompany(id, tx));
    this.audit(actorId, ORG_AUDIT.companyDeleted, id, {});
  }

  private audit(actorId: string | null, action: string, entityId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'company', entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
