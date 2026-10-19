import { createZodDto } from 'nestjs-zod';
import { uuidParamSchema } from '@arweqah-platform/shared';

/** `@Param() { id }: IdParam` validates a UUID route parameter once for every module. */
export class IdParam extends createZodDto(uuidParamSchema) {}
