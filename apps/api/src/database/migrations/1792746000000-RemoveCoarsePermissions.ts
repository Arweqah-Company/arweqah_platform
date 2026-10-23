import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Every page and every button has its own permission now: the coarse keys they replace are removed from the roles
 * (nothing is granted in their place; an administrator chooses, from the roles page, what each role gets).
 */
export class RemoveCoarsePermissions1792746000000 implements MigrationInterface {
    name = 'RemoveCoarsePermissions1792746000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_key" IN ('roles.manage', 'companies.manage', 'org.manage')`);
    }

    public async down(): Promise<void> {
        // The removed grants cannot be rebuilt: nobody chose what replaces them.
    }
}
