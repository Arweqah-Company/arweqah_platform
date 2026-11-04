import { Avatar } from '@/shared/ui';

/** Where an employee's photo is served; the version is the stored file, so a new photo is fetched again. */
export const employeePhotoUrl = (employeeId: string, photoFileId: string | null): string | null => (photoFileId ? `/api/employees/${employeeId}/photo?v=${photoFileId}` : null);

/** The employee's photo, or their first letter (FR-91). */
export function EmployeeAvatar({ employee, size }: { employee: { id: string; fullName: string; photoFileId: string | null }; size?: 'sm' | 'md' | 'lg' }) {
  return <Avatar name={employee.fullName} src={employeePhotoUrl(employee.id, employee.photoFileId)} size={size} />;
}
