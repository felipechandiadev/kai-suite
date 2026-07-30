import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cobros POS (PAYMENT_IN) guardaban la cuenta bancaria solo en metadata.payments[]
 * y no en transactions.bankAccountKey, por lo que Tesorería no los listaba.
 */
export class BackfillPaymentInBankAccountKey1756920000000
  implements MigrationInterface
{
  name = 'BackfillPaymentInBankAccountKey1756920000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE transactions AS tx
      SET "bankAccountKey" = picked.account_key
      FROM (
        SELECT
          t.id,
          (
            SELECT NULLIF(TRIM(COALESCE(p->>'bankAccountKey', p->>'bankAccountId')), '')
            FROM jsonb_array_elements(
              COALESCE(
                t.metadata::jsonb->'payments',
                t.metadata::jsonb->'paymentSnapshots',
                '[]'::jsonb
              )
            ) AS p
            WHERE UPPER(TRIM(COALESCE(p->>'method', ''))) IN ('TRANSFER', 'CHECK')
              AND NULLIF(TRIM(COALESCE(p->>'bankAccountKey', p->>'bankAccountId')), '') IS NOT NULL
            ORDER BY (p->>'amount')::numeric DESC NULLS LAST
            LIMIT 1
          ) AS account_key
        FROM transactions t
        WHERE t."bankAccountKey" IS NULL
          AND t."transactionType" = 'PAYMENT_IN'
      ) AS picked
      WHERE tx.id = picked.id
        AND picked.account_key IS NOT NULL
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No revertimos: el backfill solo corrige datos históricos incompletos.
  }
}
