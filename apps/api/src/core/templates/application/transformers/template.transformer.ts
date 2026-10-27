import type { TemplateDto, TemplateStatus } from '@arweqah-platform/shared';
import type { MessageTemplate } from '../../domain/entities/message-template.entity';
import type { TemplateDefinition } from '../../domain/types/template.types';

interface Input {
  def: TemplateDefinition;
  row: MessageTemplate | null;
  /** Who submitted the pending change, by name. */
  submitterName: string;
}

const statusOf = (row: MessageTemplate | null): TemplateStatus => (row?.pending ? 'pending' : row?.content ? 'custom' : 'default');

function pendingOf(row: MessageTemplate | null, submitterName: string): TemplateDto['pending'] {
  if (!row?.pending || !row.pendingBy || !row.pendingAt) return null;
  return { content: row.pending, submittedById: row.pendingBy, submittedByName: submitterName, submittedAt: row.pendingAt.toISOString() };
}

const variablesOf = (def: TemplateDefinition): TemplateDto['variables'] =>
  def.variables.map((v) => ({ name: v.name, descriptionAr: v.descriptionAr, descriptionEn: v.descriptionEn, exampleAr: v.exampleAr, exampleEn: v.exampleEn, required: v.required ?? false }));

export function toTemplateDto({ def, row, submitterName }: Input): TemplateDto {
  return {
    key: def.key,
    kind: def.kind,
    area: def.area,
    nameAr: def.nameAr,
    nameEn: def.nameEn,
    descriptionAr: def.descriptionAr,
    descriptionEn: def.descriptionEn,
    variables: variablesOf(def),
    status: statusOf(row),
    defaults: def.defaults,
    content: row?.content ?? def.defaults,
    pending: pendingOf(row, submitterName),
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}
