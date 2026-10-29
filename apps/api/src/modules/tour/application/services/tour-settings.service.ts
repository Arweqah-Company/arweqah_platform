import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TOUR_IDS, tourStepDef, type TourOrderInput, type TourStepEditInput, type TourStepSettingDto, type TourStepsDto } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { TourRepository } from '../../domain/contracts/tour.repository';
import { TourOrderInvalidError } from '../../domain/errors/tour.errors';
import { isCompleteOrder, sortedSteps, storedOrder } from '../../domain/rules/tour-steps.rules';
import { AUDIT, AUDIT_ENTITY } from '../messages/tour.messages';
import { toSettingDto } from '../transformers/tour.transformer';

/** The administrator's side of the tour: change a step's wording, switch it on or off, reorder, go back to the code's wording. */
@Injectable()
export class TourSettingsService {
  constructor(
    private readonly repo: TourRepository,
    private readonly events: EventEmitter2,
  ) {}

  async list(): Promise<TourStepsDto> {
    const rows = new Map((await this.repo.settings()).map((r) => [r.stepKey, r]));
    const order = new Map([...rows].map(([key, r]) => [key, r.sortOrder]));
    const steps = TOUR_IDS.flatMap((tour) => sortedSteps(tour, order).map((def, i) => toSettingDto(def, rows.get(def.key), i)));
    return { steps };
  }

  async edit(key: string, input: TourStepEditInput, actorId: string): Promise<TourStepSettingDto> {
    this.known(key);
    await this.repo.saveSettings([{ stepKey: key, ...input, updatedBy: actorId }]);
    this.audit(actorId, AUDIT.edited, key, { enabled: input.enabled });
    return this.one(key);
  }

  async reorder(input: TourOrderInput, actorId: string): Promise<TourStepsDto> {
    if (!isCompleteOrder(input.tour, input.keys)) throw new TourOrderInvalidError();
    await this.repo.saveSettings(input.keys.map((stepKey, i) => ({ stepKey, sortOrder: storedOrder(i), updatedBy: actorId })));
    this.audit(actorId, AUDIT.reordered, input.tour, { tour: input.tour });
    return this.list();
  }

  async reset(key: string, actorId: string): Promise<TourStepSettingDto> {
    this.known(key);
    await this.repo.deleteSetting(key);
    this.audit(actorId, AUDIT.reset, key);
    return this.one(key);
  }

  private known(key: string): void {
    if (!tourStepDef(key)) throw new NotFoundError('Tour step', key);
  }

  private async one(key: string): Promise<TourStepSettingDto> {
    const found = (await this.list()).steps.find((s) => s.key === key);
    if (!found) throw new NotFoundError('Tour step', key);
    return found;
  }

  private audit(actorId: string, action: string, entityId: string, changes: Record<string, unknown> = {}): void {
    const event: AuditEvent = { actorId, action, entityType: AUDIT_ENTITY, entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}

