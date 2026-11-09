import type { ApproverUsers } from '../rules/development-request.rules';

/** Who holds the posts a development request goes through for one employee (implemented by the employees module over the structure). */
export abstract class CareerApproverPort {
  /** The users of the employee's direct manager, of the head of their sector and of the head of the root of the structure (each null when nobody holds the post). */
  abstract usersFor(employeeId: string): Promise<ApproverUsers>;
}
