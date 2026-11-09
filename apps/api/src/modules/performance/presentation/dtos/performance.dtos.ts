import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CYCLE_DATE_KEYS, catalogItemSchema, evalFileSchema, openCycleSchema, setCycleDateSchema } from '@arweqah-platform/shared';

export class EvalFileDto extends createZodDto(evalFileSchema) {}
export class OpenCycleDto extends createZodDto(openCycleSchema) {}
export class SetCycleDateDto extends createZodDto(setCycleDateSchema) {}
export class CatalogItemDto extends createZodDto(catalogItemSchema) {}
export class CycleDateKeyParam extends createZodDto(z.strictObject({ key: z.enum(CYCLE_DATE_KEYS) })) {}
