/** Request DTO classes: the zod schemas of packages/shared wrapped for Nest validation (one contract for the API and the web). */
import { createZodDto } from 'nestjs-zod';
import { upsertCompanySchema } from '@arweqah-platform/shared';

export class CompanyBody extends createZodDto(upsertCompanySchema) {}
