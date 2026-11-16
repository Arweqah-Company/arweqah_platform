import { MigrationInterface, QueryRunner } from "typeorm";

/** What the sender must put in a ticket of a type to make it easy to answer (formatted text, Arabic and English). */
export class TicketTypeInstructions1794322000000 implements MigrationInterface {
    name = 'TicketTypeInstructions1794322000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_types" ADD "instructions_ar" text`);
        await queryRunner.query(`ALTER TABLE "ticket_types" ADD "instructions_en" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_types" DROP COLUMN "instructions_en"`);
        await queryRunner.query(`ALTER TABLE "ticket_types" DROP COLUMN "instructions_ar"`);
    }
}
