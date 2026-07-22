import { MigrationInterface, QueryRunner } from 'typeorm';

export class WebPushSubscriptions1757300000000 implements MigrationInterface {
  name = 'WebPushSubscriptions1757300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS web_push_subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        company_id uuid NOT NULL,
        client_app varchar(16) NOT NULL,
        endpoint text NOT NULL,
        p256dh text NOT NULL,
        auth text NOT NULL,
        production_unit_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_web_push_subscriptions_endpoint
        ON web_push_subscriptions (endpoint);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_web_push_subs_user_company
        ON web_push_subscriptions (user_id, company_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_web_push_subs_company_client
        ON web_push_subscriptions (company_id, client_app);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_web_push_subs_company_client`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_web_push_subs_user_company`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS uq_web_push_subscriptions_endpoint`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS web_push_subscriptions`);
  }
}
