import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Estado `CANCELLED` en cuotas. Antes, al anular una venta o una recepción las
 * cuotas abiertas se marcaban PAID con `amountPaid = amount`, lo que las
 * contaba como cobradas/pagadas. Se reclasifican como CANCELLED.
 */
export class InstallmentCancelledStatus1757750000000
  implements MigrationInterface
{
  name = 'InstallmentCancelledStatus1757750000000';

  // ALTER TYPE ... ADD VALUE no puede usarse en la misma transacción que el UPDATE.
  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'installments_status_enum'
            AND e.enumlabel = 'CANCELLED'
        ) THEN
          ALTER TYPE "installments_status_enum" ADD VALUE 'CANCELLED';
        END IF;
      END $$;
    `);

    // Las anulaciones exigen que no existan pagos confirmados, así que el
    // "pagado" de estas cuotas era ficticio.
    await queryRunner.query(`
      UPDATE installments
      SET status = 'CANCELLED', "amountPaid" = 0
      WHERE status = 'PAID'
        AND (metadata::jsonb ? 'cancelledByReceptionVoid'
             OR metadata::jsonb ? 'cancelledBySaleVoid')
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL no permite eliminar valores de enum de forma portable.
  }
}
