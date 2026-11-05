import { parseTitleCode, type DevelopmentStageDto, type DevelopmentStageRuleDto, type JobTitleCardDto, type JobTitleListItemDto, type ManagementMode, type TitleChainDto, type TitleOccupantsDto, type TitleRefDto } from '@arweqah-platform/shared';
import { DEVELOPMENT_STAGES, type DevelopmentStage, type DevelopmentStageRule } from '../../domain/rules/development-stage.rules';
import type { TitleListRow } from '../../domain/contracts/job-title.repository';
import type { NodePath, NodeView, TitleDetail, TitleView } from '../../domain/types/org.types';

export const toStageDto = (stage: DevelopmentStage): DevelopmentStageDto => ({ code: stage.code, hoursPerYear: stage.hoursPerYear, budgetCap: stage.budgetCap });

export const toStageRuleDto = (rule: DevelopmentStageRule): DevelopmentStageRuleDto | null => {
  const stage = DEVELOPMENT_STAGES[rule.stage];
  return stage ? { grade: rule.grade, track: rule.track as DevelopmentStageRuleDto['track'], stage: toStageDto(stage) } : null;
};

export const toListItemDto = (row: TitleListRow, path: NodePath | undefined, occupants: number): JobTitleListItemDto => ({
  id: row.id,
  code: row.code,
  nameAr: row.nameAr,
  nameEn: row.nameEn,
  isActive: row.isActive,
  orgNodeId: row.orgNodeId,
  unitCode: row.unitCode,
  unitNameAr: row.unitNameAr,
  unitNameEn: row.unitNameEn,
  unitPathAr: path?.pathAr ?? row.unitNameAr,
  unitPathEn: path?.pathEn ?? row.unitNameEn,
  grade: row.grade,
  track: row.track,
  reportsToTitleId: row.reportsToTitleId,
  occupants,
});

export const toTitleRef = (t: Pick<TitleView, 'id' | 'code' | 'nameAr' | 'nameEn'>): TitleRefDto => ({ id: t.id, code: t.code, nameAr: t.nameAr, nameEn: t.nameEn });

export const codePartsOf = (code: string | null): JobTitleCardDto['codeParts'] => (code ? parseTitleCode(code) : null);

export const toOccupants = (byCompany: ReadonlyMap<string, number>, companies: ReadonlyMap<string, { nameAr: string; nameEn: string }>): TitleOccupantsDto[] =>
  [...byCompany]
    .filter(([id, count]) => count > 0 && companies.has(id))
    .map(([id, count]) => ({ companyId: id, companyNameAr: companies.get(id)?.nameAr ?? '', companyNameEn: companies.get(id)?.nameEn ?? '', count }))
    .sort((a, b) => a.companyNameEn.localeCompare(b.companyNameEn));

export const contentOf = (t: TitleDetail) => ({ responsibilities: t.responsibilities, qualifications: t.qualifications, kpis: t.kpis, contentVersion: t.contentVersion });

/** What a card shows besides the title itself. */
export interface CardParts {
  path: NodePath | undefined;
  mode: ManagementMode;
  up: TitleView | null;
  chain: TitleChainDto | null;
  stage: DevelopmentStage | null;
  occupants: TitleOccupantsDto[];
}

export function toCardDto(title: TitleDetail, node: NodeView, parts: CardParts): JobTitleCardDto {
  return {
    id: title.id,
    code: title.code,
    codeParts: codePartsOf(title.code),
    nameAr: title.nameAr,
    nameEn: title.nameEn,
    isActive: title.isActive,
    unit: { id: node.id, code: node.code, nameAr: node.nameAr, nameEn: node.nameEn, pathAr: parts.path?.pathAr ?? node.nameAr, pathEn: parts.path?.pathEn ?? node.nameEn, effectiveMode: parts.mode },
    grade: title.grade,
    track: title.track,
    developmentStage: parts.stage ? toStageDto(parts.stage) : null,
    developmentStageReason: stageReason(title, parts.stage),
    reportsTo: parts.up ? toTitleRef(parts.up) : null,
    ...contentOf(title),
    occupants: parts.occupants,
    chain: parts.chain,
  };
}

/** No stage: the title has no grade and track yet, or no rule covers them (HR decides; nothing is guessed). */
const stageReason = (title: TitleDetail, stage: DevelopmentStage | null): JobTitleCardDto['developmentStageReason'] => {
  if (stage) return null;
  return title.grade === null ? 'no_grade' : 'no_rule';
};
