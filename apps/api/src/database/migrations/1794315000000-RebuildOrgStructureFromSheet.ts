import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * ONE-TIME rebuild of the organization structure from the owner's sheet of 2026-11-11 (270 job titles, 64 units; decision 365).
 * The seed builds the structure only while the company has no units, so this empties it (same statements as `db:reset:org`) and the deploy's
 * seed, which runs right after the migrations, builds the new one. Employees stay but lose their unit and title («needs placement»);
 * units, titles with their roles, ticket desks and tickets are deleted. The owner confirmed the server's data is test data (decision 322).
 * A database with no units (a fresh one, the test ones) is not touched in any way that matters.
 */
export class RebuildOrgStructureFromSheet1794315000000 implements MigrationInterface {
    name = 'RebuildOrgStructureFromSheet1794315000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM employee_assignments WHERE field IN ('org_node', 'job_title')`);
        await queryRunner.query(`UPDATE employees SET org_node_id = NULL, job_title_id = NULL`);
        await queryRunner.query(`DELETE FROM tickets`);
        await queryRunner.query(`DELETE FROM job_titles`);
        await queryRunner.query(`DELETE FROM org_nodes`);
    }

    public async down(): Promise<void> {
        // Deleted data cannot come back; restore the backup taken before the deploy.
    }
}
