import { createZodDto } from 'nestjs-zod';
import { translateInputSchema } from '@arweqah-platform/shared';

export class TranslateInputDto extends createZodDto(translateInputSchema) {}
