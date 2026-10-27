import { createZodDto } from 'nestjs-zod';
import { saveProviderInputSchema, testProviderInputSchema } from '@arweqah-platform/shared';

export class SaveProviderDto extends createZodDto(saveProviderInputSchema) {}
export class TestProviderDto extends createZodDto(testProviderInputSchema) {}
