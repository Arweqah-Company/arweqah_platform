import { createZodDto } from 'nestjs-zod';
import { saveCareerContentSchema } from '@arweqah-platform/shared';

export class SaveCareerContentDto extends createZodDto(saveCareerContentSchema) {}
