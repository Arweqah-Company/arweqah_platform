import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { tourIdSchema, tourOrderSchema, tourStepEditSchema, tourStepKeySchema } from '@arweqah-platform/shared';

export class TourParamDto extends createZodDto(z.strictObject({ tour: tourIdSchema })) {}
export class TourStepParamDto extends createZodDto(z.strictObject({ key: tourStepKeySchema })) {}
export class TourStepEditDto extends createZodDto(tourStepEditSchema) {}
export class TourOrderDto extends createZodDto(tourOrderSchema) {}
