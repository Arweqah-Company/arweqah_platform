/** Request DTO classes: the zod schemas of packages/shared wrapped for Nest validation (one contract for the API and the web). */
import { createZodDto } from 'nestjs-zod';
import { assignEmployeeRolesSchema, assignGroupsSchema, createEmployeeSchema, employeesQuerySchema, managerSearchSchema, ownProfileSchema, terminateEmployeeSchema, updateEmployeeSchema } from '@arweqah-platform/shared';

export class EmployeesQueryDto extends createZodDto(employeesQuerySchema) {}
export class ManagerSearchDto extends createZodDto(managerSearchSchema) {}
export class CreateEmployeeDto extends createZodDto(createEmployeeSchema) {}
export class UpdateEmployeeDto extends createZodDto(updateEmployeeSchema) {}
export class TerminateEmployeeDto extends createZodDto(terminateEmployeeSchema) {}
export class AssignRolesDto extends createZodDto(assignEmployeeRolesSchema) {}
export class AssignGroupsDto extends createZodDto(assignGroupsSchema) {}
export class UpdateOwnProfileDto extends createZodDto(ownProfileSchema) {}
