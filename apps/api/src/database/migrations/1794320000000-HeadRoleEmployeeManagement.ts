import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The head role of every unit manages the people of the unit and below (standing rule 17): adds employees to the unit, edits every detail
 * (the list of fields of «edit employees» becomes all of them), changes unit / title / manager from a date, edits many at once, exports and imports,
 * and sees «my team» with its export. Only keys a head role lacks are inserted; the fields are widened only where they still are the basic data
 * (or empty), so a list an administrator narrowed by hand stays.
 */
export class HeadRoleEmployeeManagement1794320000000 implements MigrationInterface {
    name = 'HeadRoleEmployeeManagement1794320000000'

    private readonly subtree = ['employees.create', 'employees.assign_change', 'employees.bulk_update', 'employees.export', 'employees.import'];
    private readonly everyone = ['directory.view', 'directory.export'];
    private readonly allFields = ['fullNameEn', 'gender', 'birthDate', 'nationalityId', 'maritalStatusId', 'residencyStatusId', 'workPhone', 'personalPhone', 'personalEmail', 'workLocation', 'workCountryId', 'workMode', 'profession', 'fullName', 'idTypeId', 'idNumber', 'idExpiryDate', 'contractTypeId', 'contractTypeOther', 'contractCompanyId', 'isGosiRegistered', 'gosiCompanyId', 'gosiRegistrationDate', 'gosiSystemId', 'isQiwaContract', 'hasMedicalInsurance', 'healthInsuranceCompanyId', 'monthlyGrossSalary', 'salaryCurrencyCountryId', 'iban', 'notes', 'companyId', 'orgNodeId', 'jobTitleId', 'managerId', 'relationTypeId', 'startDate', 'endDate', 'terminationReasonId', 'terminationReasonOther', 'employeeNumber'];
    private readonly basicFields = ['fullNameEn', 'gender', 'birthDate', 'nationalityId', 'maritalStatusId', 'residencyStatusId', 'workPhone', 'personalPhone', 'personalEmail'];

    public async up(queryRunner: QueryRunner): Promise<void> {
        const insert = `
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, k.key, $2 FROM roles r CROSS JOIN unnest($1::text[]) AS k(key)
            WHERE r.auto_rule = 'node_head'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k.key)`;
        await queryRunner.query(insert, [this.subtree, 'subtree']);
        await queryRunner.query(insert, [this.everyone, 'all']);
        await queryRunner.query(`
            UPDATE role_permissions p SET fields = $1::text[]
            FROM roles r WHERE r.id = p.role_id AND r.auto_rule = 'node_head' AND p.permission_key = 'employees.update' AND p.scope = 'subtree'
            AND (p.fields IS NULL OR (p.fields <@ $2::text[] AND $2::text[] <@ p.fields))`,
            [this.allFields, this.basicFields]);
    }

    public async down(): Promise<void> {
        // Nothing to undo: a delete could take away keys an administrator had given the head role before this migration.
    }
}
