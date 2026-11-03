import { MigrationInterface, QueryRunner } from "typeorm";

export class AllowedEmailDomains1793625301621 implements MigrationInterface {
    name = 'AllowedEmailDomains1793625301621'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "allowed_email_domains" ("domain" character varying(120) NOT NULL, "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f08b808af7da731be9f86884a00" PRIMARY KEY ("domain"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "allowed_email_domains"`);
    }

}
