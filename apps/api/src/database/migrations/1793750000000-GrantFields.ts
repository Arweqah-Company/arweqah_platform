import { MigrationInterface, QueryRunner } from "typeorm";

/** Each table of grants and the column that says who holds the grant. */
const TABLES: Record<string, string> = { role_permissions: 'role_id', role_group_permissions: 'group_id', user_group_permissions: 'group_id', user_permissions: 'user_id' };
/** The details of the structure group: they were HR's, so every grant that reaches beyond the person's own record keeps them. */
const STRUCTURE = ['companyId', 'orgNodeId', 'jobTitleId', 'managerId', 'relationTypeId', 'startDate', 'endDate', 'terminationReasonId', 'terminationReasonOther', 'employeeNumber'];

/**
 * The fields a holder of «edit employees» may change belong to each grant (FR-94), not to one table for everyone.
 * What the platform did until now is kept: a grant limited to the person's own record takes the fields the old rules gave a plain employee,
 * any wider grant takes the fields the old rules gave HR, plus the structure group. The old rules table, the old keys and the old page rule go.
 */
export class GrantFields1793750000000 implements MigrationInterface {
    name = 'GrantFields1793750000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const [table, holder] of Object.entries(TABLES)) {
            await queryRunner.query(`ALTER TABLE "${table}" ADD "fields" text array`);
            await queryRunner.query(`
                UPDATE "${table}" SET "fields" = CASE WHEN "scope" = 'own'
                    THEN ARRAY(SELECT "field" FROM "employee_field_rules" WHERE "editable_by_self" ORDER BY "field")
                    ELSE ARRAY(SELECT "field" FROM "employee_field_rules" WHERE "editable_by_hr" ORDER BY "field") || $1::text[] END
                WHERE "permission_key" = 'employees.update'`, [STRUCTURE]);
            // Whoever could choose who changes each field (the old key «employee_fields.edit») was never held back by the HR rules:
            // their wider grant of «edit employees» now lists every field.
            await queryRunner.query(`
                UPDATE "${table}" t SET "fields" = ARRAY(SELECT "field" FROM "employee_field_rules") || $1::text[]
                WHERE t."permission_key" = 'employees.update' AND t."scope" <> 'own'
                  AND EXISTS (SELECT 1 FROM "${table}" e WHERE e."${holder}" = t."${holder}" AND e."permission_key" = 'employee_fields.edit')`, [STRUCTURE]);
            await queryRunner.query(`DELETE FROM "${table}" WHERE "permission_key" IN ('employee_fields.view', 'employee_fields.edit', 'employee_fields.export')`);
        }
        await queryRunner.query(`DELETE FROM "page_visibility_rules" WHERE "page_key" = 'employee-fields'`);
        await queryRunner.query(`DROP TABLE "employee_field_rules"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "employee_field_rules" ("field" character varying(60) NOT NULL, "editable_by_self" boolean NOT NULL DEFAULT false, "editable_by_hr" boolean NOT NULL DEFAULT true, "updated_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_employee_field_rules" PRIMARY KEY ("field"))`);
        await queryRunner.query(`
            INSERT INTO "employee_field_rules" ("field", "editable_by_self") VALUES
            ('fullNameEn', true), ('gender', false), ('birthDate', false), ('nationalityId', false), ('maritalStatusId', false), ('residencyStatusId', false),
            ('workPhone', true), ('personalPhone', true), ('personalEmail', true), ('workLocation', false), ('workCountryId', false), ('workMode', false), ('profession', false),
            ('fullName', false), ('idTypeId', false), ('idNumber', false), ('idExpiryDate', false), ('contractTypeId', false), ('contractTypeOther', false), ('contractCompanyId', false),
            ('isGosiRegistered', false), ('gosiCompanyId', false), ('gosiRegistrationDate', false), ('gosiSystemId', false), ('isQiwaContract', false), ('hasMedicalInsurance', false),
            ('healthInsuranceCompanyId', false), ('monthlyGrossSalary', false), ('salaryCurrencyCountryId', false), ('iban', false), ('notes', false)`);
        for (const table of Object.keys(TABLES)) await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "fields"`);
    }

}
