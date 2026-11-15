/** One person placed directly in a unit, as the «unit employees» tab shows them (active employees only). */
export interface OrgUnitEmployeeDto {
  id: string;
  employeeNumber: string;
  fullName: string;
  workEmail: string;
  /** The direct manager in force; null for a person without one. */
  managerName: string | null;
}
