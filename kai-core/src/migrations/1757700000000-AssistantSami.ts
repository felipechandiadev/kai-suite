import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssistantSami1757700000000 implements MigrationInterface {
  name = 'AssistantSami1757700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS assistant_conversations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL,
        user_id uuid NOT NULL,
        title varchar(255) NOT NULL DEFAULT 'Nueva conversación',
        deleted_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_assistant_conversations_company_user
        ON assistant_conversations (company_id, user_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS assistant_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id uuid NOT NULL REFERENCES assistant_conversations(id) ON DELETE CASCADE,
        role varchar(20) NOT NULL,
        content text NOT NULL,
        blocks jsonb NULL,
        meta jsonb NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_assistant_messages_conversation
        ON assistant_messages (conversation_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS assistant_audit_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL,
        user_id uuid NOT NULL,
        conversation_id uuid NULL,
        tool_name varchar(80) NULL,
        params jsonb NULL,
        row_count int NULL,
        duration_ms int NULL,
        feedback varchar(40) NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_assistant_audit_company
        ON assistant_audit_log (company_id, created_at)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS assistant_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL,
        user_id uuid NOT NULL,
        conversation_id uuid NULL,
        title varchar(255) NOT NULL,
        blocks jsonb NOT NULL,
        meta jsonb NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_assistant_reports_company_user
        ON assistant_reports (company_id, user_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS assistant_favorites (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL,
        user_id uuid NOT NULL,
        title varchar(255) NOT NULL,
        prompt text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_assistant_favorites_user
        ON assistant_favorites (company_id, user_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS assistant_scheduled_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL,
        user_id uuid NOT NULL,
        title varchar(255) NOT NULL,
        prompt text NOT NULL,
        cron_expr varchar(80) NOT NULL DEFAULT '0 8 * * 1',
        is_active boolean NOT NULL DEFAULT true,
        last_run_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_assistant_scheduled_company
        ON assistant_scheduled_reports (company_id)
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_sami_sales_lines AS
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

    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_sami_stock_levels AS
      SELECT
        sl.company_id,
        sl."storageId" AS storage_id,
        s.name AS storage_name,
        sl."productVariantId" AS product_variant_id,
        pv."productId" AS product_id,
        COALESCE(p.name, '') AS product_name,
        sl."physicalStock"::numeric AS physical_stock,
        (COALESCE(pv.pmp, 0) * sl."physicalStock")::numeric AS stock_value
      FROM stock_levels sl
      LEFT JOIN storages s ON s.id = sl."storageId"
      LEFT JOIN product_variants pv ON pv.id = sl."productVariantId"
      LEFT JOIN products p ON p.id = pv."productId"
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_sami_purchase_lines AS
      SELECT
        t.company_id,
        t."createdAt" AS purchased_at,
        (t."createdAt")::date AS purchased_day,
        t."supplierId" AS supplier_id,
        COALESCE(
          NULLIF(per."businessName", ''),
          NULLIF(TRIM(CONCAT(COALESCE(per."firstName", ''), ' ', COALESCE(per."lastName", ''))), ''),
          NULLIF(sup.alias, ''),
          ''
        ) AS supplier_name,
        tl."productId" AS product_id,
        tl."productName" AS product_name,
        tl.quantity::numeric AS qty,
        tl.total::numeric AS purchase_total
      FROM transaction_lines tl
      JOIN transactions t ON t.id = tl."transactionId"
      LEFT JOIN suppliers sup ON sup.id = t."supplierId"
      LEFT JOIN persons per ON per.id = sup."personId"
      WHERE t."transactionType" IN ('PURCHASE', 'SUPPLIER_INVOICE', 'SUPPLIER_RECEIPT')
        AND t.status = 'CONFIRMED'
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_sami_dining_orders AS
      SELECT
        o.company_id,
        o.branch_id,
        b.name AS branch_name,
        o.id AS order_id,
        o.kind,
        o.status,
        o.opened_at,
        (o.opened_at)::date AS opened_day,
        COALESCE((
          SELECT SUM(l.quantity) FROM dining_order_lines l
          WHERE l.dining_order_id = o.id
        ), 0)::numeric AS qty
      FROM dining_orders o
      LEFT JOIN branches b ON b.id = o.branch_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS v_sami_dining_orders`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_sami_purchase_lines`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_sami_stock_levels`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_sami_sales_lines`);
    await queryRunner.query(`DROP TABLE IF EXISTS assistant_scheduled_reports`);
    await queryRunner.query(`DROP TABLE IF EXISTS assistant_favorites`);
    await queryRunner.query(`DROP TABLE IF EXISTS assistant_reports`);
    await queryRunner.query(`DROP TABLE IF EXISTS assistant_audit_log`);
    await queryRunner.query(`DROP TABLE IF EXISTS assistant_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS assistant_conversations`);
  }
}
