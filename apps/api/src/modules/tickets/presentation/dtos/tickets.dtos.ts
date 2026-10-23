import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  createTicketSchema,
  ticketActionSchema,
  ticketDeskSettingsSchema,
  ticketFiguresQuerySchema,
  ticketReplySchema,
  ticketTypeInputSchema,
  ticketsQuerySchema,
} from '@arweqah-platform/shared';

export class CreateTicketBody extends createZodDto(createTicketSchema) {}
export class TicketReplyBody extends createZodDto(ticketReplySchema) {}
export class TicketActionBody extends createZodDto(ticketActionSchema) {}
export class TicketsQueryDto extends createZodDto(ticketsQuerySchema) {}
export class DeskSettingsBody extends createZodDto(ticketDeskSettingsSchema) {}
export class TicketTypeBody extends createZodDto(ticketTypeInputSchema) {}
export class FiguresQueryDto extends createZodDto(ticketFiguresQuerySchema) {}

export class DeskParam extends createZodDto(z.strictObject({ deskId: z.uuid() })) {}
export class TypeParam extends createZodDto(z.strictObject({ deskId: z.uuid(), typeId: z.uuid() })) {}
export class AttachmentParam extends createZodDto(z.strictObject({ id: z.uuid(), fileId: z.uuid() })) {}
export class AssigneeSearchDto extends createZodDto(z.strictObject({ q: z.string().trim().max(100).optional() })) {}
