import { MigrationInterface, QueryRunner } from "typeorm";

export class EmailLoginCodes1795003381644 implements MigrationInterface {
    name = 'EmailLoginCodes1795003381644'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "email_login_codes" ("user_id" uuid NOT NULL, "code_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5fe6d51b21d179a7200e8488663" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`ALTER TABLE "email_login_codes" ADD CONSTRAINT "FK_email_login_codes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "email_login_codes" DROP CONSTRAINT "FK_email_login_codes_user"`);
        await queryRunner.query(`DROP TABLE "email_login_codes"`);
    }

}
