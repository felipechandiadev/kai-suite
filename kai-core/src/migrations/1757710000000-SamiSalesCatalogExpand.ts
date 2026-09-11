import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Amplía v_sami_sales_lines: cliente (sin PII), medio de pago, ISODOW Chile.
 */
export class SamiSalesCatalogExpand1757710000000 implements MigrationInterface {
  name = 'SamiSalesCatalogExpand1757710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS v_sami_sales_lines`);
    await queryRunner.query(`
      CREATE VIEW v_sami_sales_lines AS
      SELECT
        t.company_id,
        t."branchId" AS branch_id,
        b.name AS branch_name,
        t."createdAt" AS sold_at,
        (t."createdAt")::date AS sold_day,
        EXTRACT(ISODOW FROM (t."createdAt" AT TIME ZONE 'America/Santiago'))::int AS sold_dow,
        t."customerId" AS customer_id,
        COALESCE(
          NULLIF(per."businessName", ''),
          NULLIF(TRIM(CONCAT(COALESCE(per."firstName", ''), ' ', COALESCE(per."lastName", ''))), ''),
          'Sin cliente'
        ) AS customer_name,
        t."paymentMethod" AS payment_method,
        tl."productId" AS product_id,
        tl."productName" AS product_name,
        p."categoryId" AS category_id,
        c.name AS category_name,
        tl.quantity::numeric AS qty,
        tl.total::numeric AS net_sales,
        (COALESCE(tl."unitCost", 0) * tl.quantity)::numeric AS cogs
      FROM transaction_lines tl
      JOIN transactions t ON t.id = tl."transactionId"
      LEFT JOIN branches b ON b.id = t."branchId"
      LEFT JOIN products p ON p.id = tl."productId"
      LEFT JOIN categories c ON c.id = p."categoryId"
      LEFT JOIN customers cust ON cust.id = t."customerId"
      LEFT JOIN persons per ON per.id = cust."personId"
      WHERE t."transactionType" = 'SALE'
        AND t.status = 'CONFIRMED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS v_sami_sales_lines`);
    await queryRunner.query(`
      CREATE VIEW v_sami_sales_lines AS
      SELECT
        t.company_id,
        t."branchId" AS branch_id,
        b.name AS branch_name,
        t."createdAt" AS sold_at,
        (t."createdAt")::date AS sold_day,
        tl."productId" AS product_id,
        tl."productName" AS product_name,
        p."categoryId" AS category_id,
        c.name AS category_name,
        tl.quantity::numeric AS qty,
        tl.total::numeric AS net_sales,
        (COALESCE(tl."unitCost", 0) * tl.quantity)::numeric AS cogs
      FROM transaction_lines tl
      JOIN transactions t ON t.id = tl."transactionId"
      LEFT JOIN branches b ON b.id = t."branchId"
      LEFT JOIN products p ON p.id = tl."productId"
      LEFT JOIN categories c ON c.id = p."categoryId"
      WHERE t."transactionType" = 'SALE'
        AND t.status = 'CONFIRMED'
    `);
  }
}
