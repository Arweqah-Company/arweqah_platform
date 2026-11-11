import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The owner's country list has no Israel and names Palestine «فلسطين» / «Palestine» (it was «الأراضي الفلسطينية» / «Palestinian Territories»);
 * its shekel is named «شيكل جديد» / «New Shekel». Israel is deleted when nothing refers to it (employees, ID rules) and only switched off when something does,
 * so no employee loses their nationality.
 */
export class PalestineNotIsrael1794314000000 implements MigrationInterface {
    name = 'PalestineNotIsrael1794314000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE country_translations t
            SET name = CASE t.lang WHEN 'ar' THEN 'فلسطين' ELSE 'Palestine' END,
                currency_name = CASE t.lang WHEN 'ar' THEN 'شيكل جديد' ELSE 'New Shekel' END
            FROM countries c WHERE c.id = t.country_id AND c.iso_code = 'PS'`);
        await queryRunner.query(`
            DELETE FROM countries c WHERE c.iso_code = 'IL'
            AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.nationality_id = c.id OR e.work_country_id = c.id OR e.salary_currency_country_id = c.id)
            AND NOT EXISTS (SELECT 1 FROM id_type_rules r WHERE r.country_id = c.id)`);
        await queryRunner.query(`UPDATE countries SET is_active = false WHERE iso_code = 'IL'`);
    }

    public async down(): Promise<void> {
        // The names and the removal are the owner's decision; the seed would bring the old list back only by changing the data file.
    }
}
