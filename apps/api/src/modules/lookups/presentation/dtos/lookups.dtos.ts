import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/** Query DTOs of the lookup endpoints: ids are UUIDs, unknown keys are refused. */
export class CompanyQueryDto extends createZodDto(z.strictObject({ companyId: z.uuid() })) {}
export class OrgNodeQueryDto extends createZodDto(z.strictObject({ orgNodeId: z.uuid() })) {}
