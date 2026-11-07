import './seed-env';
import 'reflect-metadata';
import dataSource from '../data-source';

/**
 * Development only: empties the organization structure so the seed can build the owner's current file again
 * (`npm run db:reset:org`, then `npm run db:seed`). It deletes every unit, job title (with its role), ticket desk and ticket, and takes every
 * employee out of their unit and title (they stay, flagged «needs placement»). It refuses to run in production.
 */
async function resetOrgStructure(db: typeof dataSource): Promise<void> {
  await db.transaction(async (m) => {
    await m.query(`DELETE FROM employee_assignments WHERE field IN ('org_node', 'job_title')`);
    await m.query('UPDATE employees SET org_node_id = NULL, job_title_id = NULL');
    await m.query('DELETE FROM tickets');
    await m.query('DELETE FROM job_titles');
    await m.query('DELETE FROM org_nodes');
  });
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new Error('The organization reset is for development only');
  const db = await dataSource.initialize();
  try {
    await resetOrgStructure(db);
    console.log('Organization structure emptied: run npm run db:seed to build it again');
  } finally {
    await db.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
