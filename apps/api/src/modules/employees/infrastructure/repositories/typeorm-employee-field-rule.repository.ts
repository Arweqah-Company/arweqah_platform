import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeFieldRule } from '../../domain/entities/employee-field-rule.entity';
import { EmployeeFieldRuleRepository } from '../../domain/contracts/employee-field-rule.repository';

@Injectable()
export class TypeOrmEmployeeFieldRuleRepository extends EmployeeFieldRuleRepository {
  constructor(@InjectRepository(EmployeeFieldRule) private readonly repo: Repository<EmployeeFieldRule>) {
    super();
  }

  all(): Promise<EmployeeFieldRule[]> {
    return this.repo.find({ order: { field: 'ASC' } });
  }

  async save(rules: { field: string; editableBySelf: boolean; editableByHr: boolean }[], updatedBy: string): Promise<void> {
    await this.repo.manager.transaction(async (manager) => {
      for (const rule of rules) await manager.getRepository(EmployeeFieldRule).update({ field: rule.field }, { editableBySelf: rule.editableBySelf, editableByHr: rule.editableByHr, updatedBy });
    });
  }
}
