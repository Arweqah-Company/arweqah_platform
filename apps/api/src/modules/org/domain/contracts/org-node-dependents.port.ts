/**
 * Other modules that hang data on a unit (a ticket desk, open tickets) tell the org module which units must stay
 * where they are. Implemented by the tickets module, so org never depends on it.
 */
export abstract class OrgNodeDependentsPort {
  /** The ids, among the given units, that cannot be moved or deleted. */
  abstract unitsInUse(nodeIds: string[]): Promise<string[]>;
}
