import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Nuevos valores en `transactions.paymentMethod`:
 * - CUSTOMER_CREDIT_NOTE (pago con NC del cliente)
 * - ORDER_ADVANCE (abono por encargo)
 */
export class AddCustomerCreditNoteAndOrderAdvancePaymentMethods1756060000000
  implements MigrationInterface
{
  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const value of ['CUSTOMER_CREDIT_NOTE', 'ORDER_ADVANCE']) {
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TYPE "transactions_paymentmethod_enum"
          ADD VALUE '${value}';
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
    }
  }

  public async down(): Promise<void> {
    // PostgreSQL no permite eliminar valores de enum de forma portable.
  }
}
