import { MigrationInterface, QueryRunner } from "typeorm";

export class PerformanceCycles1794300000700 implements MigrationInterface {
    name = 'PerformanceCycles1794300000700'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "performance_cycles" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fiscal_year" integer NOT NULL, "status" character varying(8) NOT NULL, "opened_by" uuid NOT NULL, "opened_at" TIMESTAMP WITH TIME ZONE NOT NULL, "closed_by" uuid, "closed_at" TIMESTAMP WITH TIME ZONE, "dates" jsonb NOT NULL DEFAULT '[]', "template_snapshot" jsonb NOT NULL, CONSTRAINT "PK_399ac4b3f00cb66c2802c9be882" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_performance_cycles_year" ON "performance_cycles"  ("fiscal_year") `);
        await queryRunner.query(`CREATE INDEX "IDX_performance_cycles_status" ON "performance_cycles"  ("status") `);
        await queryRunner.query(`CREATE TABLE "performance_catalog_items" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "cycle_id" uuid, "kind" character varying(8) NOT NULL, "title" character varying(160) NOT NULL, "points" integer NOT NULL, CONSTRAINT "PK_2c8d4bc99dba26cc0c55516b966" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_performance_catalog_items_cycle" ON "performance_catalog_items"  ("cycle_id") `);
        await queryRunner.query(`ALTER TABLE "performance_catalog_items" ADD CONSTRAINT "FK_performance_catalog_items_cycle" FOREIGN KEY ("cycle_id") REFERENCES "performance_cycles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "performance_catalog_items" DROP CONSTRAINT "FK_performance_catalog_items_cycle"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_performance_catalog_items_cycle"`);
        await queryRunner.query(`DROP TABLE "performance_catalog_items"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_performance_cycles_status"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_performance_cycles_year"`);
        await queryRunner.query(`DROP TABLE "performance_cycles"`);
    }

}
