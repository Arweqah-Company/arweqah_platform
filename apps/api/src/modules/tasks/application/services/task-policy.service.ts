import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TASK_POLICY_DEFAULTS, type TaskPolicyDto, type TaskPolicyInput } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { OrgDirectoryService } from '../../../org/application/services/org-directory.service';
import { TaskPolicyRepository } from '../../domain/contracts/task-policy.repository';
import { TaskPolicyCompanyError } from '../../domain/errors/task.errors';
import type { PolicyRecord } from '../../domain/types/task.types';
import { TASK_AUDIT } from '../messages/task.messages';

/** The rules of tasks for a company: what an administrator saved, else the defaults. */
@Injectable()
export class TaskPolicyService {
  constructor(
    private readonly policies: TaskPolicyRepository,
    private readonly org: OrgDirectoryService,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  async forCompany(companyId: string | null): Promise<PolicyRecord> {
    return (companyId ? await this.policies.find(companyId) : null) ?? { companyId: companyId ?? '', ...TASK_POLICY_DEFAULTS };
  }

  /** The policy of the company named in the request, else the administrator's own company. */
  async dto(companyId: string | null | undefined, ownCompanyId: string | null): Promise<TaskPolicyDto> {
    return this.forCompany(await this.companyOf(companyId, ownCompanyId));
  }

  async update(actorId: string, companyId: string | null | undefined, ownCompanyId: string | null, input: TaskPolicyInput): Promise<TaskPolicyDto> {
    const company = await this.companyOf(companyId, ownCompanyId);
    await this.tx.run((tx) => this.policies.save(company, input, tx));
    const event: AuditEvent = { actorId, action: TASK_AUDIT.policyUpdated, entityType: 'task_policy', entityId: company, changes: { ...input } };
    this.events.emit(AUDIT_EVENT, event);
    return this.forCompany(company);
  }

  private async companyOf(companyId: string | null | undefined, ownCompanyId: string | null): Promise<string> {
    const company = companyId ?? ownCompanyId;
    if (!company) throw new TaskPolicyCompanyError();
    if (!(await this.org.companyExists(company))) throw new NotFoundError('Company');
    return company;
  }
}
