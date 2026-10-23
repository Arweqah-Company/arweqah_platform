import { MigrationInterface, QueryRunner } from "typeorm";

export class IdRuleChecksum1792710254476 implements MigrationInterface {
    name = 'IdRuleChecksum1792710254476'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "id_type_rules" ADD "checksum" character varying(20)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "id_type_rules" DROP COLUMN "checksum"`);
    }

}
