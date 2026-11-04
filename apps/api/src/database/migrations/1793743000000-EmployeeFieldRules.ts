import { MigrationInterface, QueryRunner } from "typeorm";

/** Who may change each detail of an employee (FR-94). It begins as the rule the code had: a plain employee changes only their phones, personal e-mail and English name; HR changes everything. */
export class EmployeeFieldRules1793743000000 implements MigrationInterface {
    name = 'EmployeeFieldRules1793743000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "employee_field_rules" ("field" character varying(60) NOT NULL, "editable_by_self" boolean NOT NULL DEFAULT false, "editable_by_hr" boolean NOT NULL DEFAULT true, "updated_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_employee_field_rules" PRIMARY KEY ("field"))`);
        await queryRunner.query(`
            INSERT INTO "employee_field_rules" ("field", "editable_by_self") VALUES
            ('fullNameEn', true),
            ('gender', false),
            ('birthDate', false),
            ('nationalityId', false),
            ('maritalStatusId', false),
            ('residencyStatusId', false),
            ('workPhone', true),
            ('personalPhone', true),
            ('personalEmail', true),
            ('workLocation', false),
            ('workCountryId', false),
            ('workMode', false),
            ('profession', false),
            ('fullName', false),
            ('idTypeId', false),
            ('idNumber', false),
            ('idExpiryDate', false),
            ('contractTypeId', false),
            ('contractTypeOther', false),
            ('contractCompanyId', false),
            ('isGosiRegistered', false),
            ('gosiCompanyId', false),
            ('gosiRegistrationDate', false),
            ('gosiSystemId', false),
            ('isQiwaContract', false),
            ('hasMedicalInsurance', false),
            ('healthInsuranceCompanyId', false),
            ('monthlyGrossSalary', false),
            ('salaryCurrencyCountryId', false),
            ('iban', false),
            ('notes', false)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "employee_field_rules"`);
    }

}
