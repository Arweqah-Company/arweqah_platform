import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

/**
 * Sending and following your own tickets needs no permission (every employee may). Seeing a ticket follows the person's
 * relation to it (sender, assignee, desk manager). The one key here lets a platform manager administer every desk.
 */
export const TICKET_PERMISSIONS: PermissionDefinition[] = [
  {
    key: CorePermission.TicketsAdminister,
    module: 'tickets',
    labelAr: 'إدارة تذاكر كل الإدارات (إعداد وأرقام)',
    labelEn: 'Administer the tickets of every department (setup and figures)',
    scopes: ['all'],
  },
];
