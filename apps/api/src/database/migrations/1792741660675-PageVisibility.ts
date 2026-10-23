import { MigrationInterface, QueryRunner } from "typeorm";

export class PageVisibility1792741660675 implements MigrationInterface {
    name = 'PageVisibility1792741660675'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "page_visibility_rules" ("role_id" uuid NOT NULL, "page_key" character varying(40) NOT NULL, CONSTRAINT "PK_82f177cfb624e50ffaf43cc936c" PRIMARY KEY ("role_id", "page_key"))`);
        await queryRunner.query(`ALTER TABLE "page_visibility_rules" ADD CONSTRAINT "FK_page_visibility_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "page_visibility_rules" DROP CONSTRAINT "FK_page_visibility_role"`);
        await queryRunner.query(`DROP TABLE "page_visibility_rules"`);
    }

}
