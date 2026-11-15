import { MigrationInterface, QueryRunner } from "typeorm";

/** A ticket type has one or more handlers (employees of its unit) instead of one default assignee; the old value moves into the new table. */
export class TicketTypeHandlers1794321000000 implements MigrationInterface {
    name = 'TicketTypeHandlers1794321000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ticket_type_handlers" ("type_id" uuid NOT NULL, "user_id" uuid NOT NULL, CONSTRAINT "PK_ticket_type_handlers" PRIMARY KEY ("type_id", "user_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ticket_type_handlers_user" ON "ticket_type_handlers" ("user_id")`);
        await queryRunner.query(`ALTER TABLE "ticket_type_handlers" ADD CONSTRAINT "FK_ticket_type_handlers_type" FOREIGN KEY ("type_id") REFERENCES "ticket_types"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_type_handlers" ADD CONSTRAINT "FK_ticket_type_handlers_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`INSERT INTO "ticket_type_handlers" ("type_id", "user_id") SELECT "id", "default_assignee_user_id" FROM "ticket_types" WHERE "default_assignee_user_id" IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_types" DROP CONSTRAINT "FK_ticket_types_assignee"`);
        await queryRunner.query(`ALTER TABLE "ticket_types" DROP COLUMN "default_assignee_user_id"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_types" ADD "default_assignee_user_id" uuid`);
        await queryRunner.query(`UPDATE "ticket_types" t SET "default_assignee_user_id" = (SELECT h."user_id" FROM "ticket_type_handlers" h WHERE h."type_id" = t."id" ORDER BY h."user_id" LIMIT 1)`);
        await queryRunner.query(`ALTER TABLE "ticket_types" ADD CONSTRAINT "FK_ticket_types_assignee" FOREIGN KEY ("default_assignee_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`DROP TABLE "ticket_type_handlers"`);
    }
}
