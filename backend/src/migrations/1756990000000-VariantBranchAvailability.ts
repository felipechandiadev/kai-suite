import { MigrationInterface, QueryRunner } from 'typeorm';

export class VariantBranchAvailability1756990000000
  implements MigrationInterface
{
  name = 'VariantBranchAvailability1756990000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_variant_branch_availability (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL,
        product_variant_id uuid NOT NULL,
        branch_id uuid NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_variant_branch_availability" PRIMARY KEY (id)
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_pv_branch_availability"
      ON product_variant_branch_availability (product_variant_id, branch_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_pv_branch_availability_company"
      ON product_variant_branch_availability (company_id, product_variant_id);
    `);

    const ensureFk = async (conname: string, sql: string): Promise<void> => {
      const rows: Array<{ exists: boolean }> = await queryRunner.query(
        `SELECT EXISTS (
           SELECT 1
           FROM pg_constraint c
           JOIN pg_class t ON t.oid = c.conrelid
           JOIN pg_namespace n ON n.oid = t.relnamespace
           WHERE n.nspname = current_schema()
             AND t.relname = 'product_variant_branch_availability'
             AND c.conname = $1
             AND c.contype = 'f'
         ) AS exists`,
        [conname],
      );
      if (!rows[0]?.exists) {
        await queryRunner.query(sql);
      }
    };

    await ensureFk(
      'FK_pv_branch_avail_variant',
      `
        ALTER TABLE product_variant_branch_availability
        ADD CONSTRAINT "FK_pv_branch_avail_variant"
        FOREIGN KEY (product_variant_id) REFERENCES product_variants(id)
        ON DELETE CASCADE ON UPDATE NO ACTION;
      `,
    );
    await ensureFk(
      'FK_pv_branch_avail_branch',
      `
        ALTER TABLE product_variant_branch_availability
        ADD CONSTRAINT "FK_pv_branch_avail_branch"
        FOREIGN KEY (branch_id) REFERENCES branches(id)
        ON DELETE RESTRICT ON UPDATE NO ACTION;
      `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE product_variant_branch_availability DROP CONSTRAINT IF EXISTS "FK_pv_branch_avail_branch";`,
    );
    await queryRunner.query(
      `ALTER TABLE product_variant_branch_availability DROP CONSTRAINT IF EXISTS "FK_pv_branch_avail_variant";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_pv_branch_availability_company";`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_pv_branch_availability";`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS product_variant_branch_availability;`,
    );
  }
}
