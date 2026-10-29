import { type TourId, type TourStepDef, type TourStepDto, type TourStepKey, type TourStepSettingDto } from '@arweqah-platform/shared';
import type { TourStepSetting } from '../../domain/entities/tour.entities';
import { defaultOrder } from '../../domain/rules/tour-steps.rules';

export function toStepDto(def: TourStepDef, row: TourStepSetting | undefined): TourStepDto {
  return { key: def.key as TourStepKey, titleAr: row?.titleAr ?? null, titleEn: row?.titleEn ?? null, bodyAr: row?.bodyAr ?? null, bodyEn: row?.bodyEn ?? null };
}

const isCustomised = (def: TourStepDef, row: TourStepSetting | undefined): boolean =>
  !!row && (!row.enabled || !!(row.titleAr || row.titleEn || row.bodyAr || row.bodyEn) || (row.sortOrder !== null && row.sortOrder !== defaultOrder(def.tour, def.key)));

export function toSettingDto(def: TourStepDef, row: TourStepSetting | undefined, position: number): TourStepSettingDto {
  return {
    ...toStepDto(def, row),
    tour: def.tour as TourId,
    order: position + 1,
    enabled: row?.enabled ?? true,
    permission: def.permission ?? null,
    page: def.page ?? null,
    customised: isCustomised(def, row),
    updatedAt: row ? row.updatedAt.toISOString() : null,
  };
}
