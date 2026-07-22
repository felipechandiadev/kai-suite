import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Comisión de adquirente (%) en medios tarjeta (débito/crédito) del catálogo empresa.
 */
export class CompanyPaymentMethodFeePercent1757330000000
  implements MigrationInterface
{
  name = 'CompanyPaymentMethodFeePercent1757330000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE company_payment_methods
      ADD COLUMN IF NOT EXISTS fee_percent numeric(5,2) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE company_payment_methods
      DROP COLUMN IF EXISTS fee_percent
    `);
  }
}
