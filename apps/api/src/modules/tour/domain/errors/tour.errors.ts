import { BusinessRuleError } from '../../../../common/domain/domain-error';

export class TourOrderInvalidError extends BusinessRuleError {
  override readonly code = 'TOUR_ORDER_INVALID';
  constructor() {
    super('The order must list every step of the tour exactly once');
  }
}
