import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Core notifications: canonical events, per-user deliveries, audiences, preferences, retention.
 */
export class NotificationsCore1756090000000 implements MigrationInterface {
  name = 'NotificationsCore1756090000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_source_enum') THEN
          CREATE TYPE notification_source_enum AS ENUM ('SYSTEM', 'AUTOMATION', 'USER');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_domain_enum') THEN
          CREATE TYPE notification_domain_enum AS ENUM (
            'STOCK', 'SALES', 'PURCHASING', 'TREASURY', 'HR', 'MESSAGING', 'SYSTEM'
          );
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_severity_enum') THEN
          CREATE TYPE notification_severity_enum AS ENUM ('INFO', 'WARNING', 'CRITICAL');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_delivery_status_enum') THEN
          CREATE TYPE notification_delivery_status_enum AS ENUM (
            'UNREAD', 'READ', 'ARCHIVED', 'DISMISSED'
          );
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_audience_type_enum') THEN
          CREATE TYPE notification_audience_type_enum AS ENUM (
            'ALL_COMPANY', 'ROLES', 'USER_IDS', 'BRANCH', 'STORAGE_SUBSCRIBERS'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL,
        source notification_source_enum NOT NULL DEFAULT 'AUTOMATION',
        domain notification_domain_enum NOT NULL,
        kind varchar(128) NOT NULL,
        severity notification_severity_enum NOT NULL DEFAULT 'INFO',
        title varchar(512) NOT NULL,
        body text NULL,
        payload jsonb NOT NULL DEFAULT '{}',
        entity_type varchar(64) NULL,
        entity_id uuid NULL,
        group_key varchar(256) NULL,
        actor_user_id uuid NULL,
        expires_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_notifications_company FOREIGN KEY (company_id)
          REFERENCES companies(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_company_created
        ON notifications (company_id, created_at DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_company_domain_kind
        ON notifications (company_id, domain, kind);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_group_key_created
        ON notifications (group_key, created_at DESC)
        WHERE group_key IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_deliveries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        notification_id uuid NOT NULL,
        company_id uuid NOT NULL,
        user_id uuid NOT NULL,
        status notification_delivery_status_enum NOT NULL DEFAULT 'UNREAD',
        read_at timestamptz NULL,
        dismissed_at timestamptz NULL,
        deleted_at timestamptz NULL,
        snoozed_until timestamptz NULL,
        delivered_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_notification_deliveries_notification FOREIGN KEY (notification_id)
          REFERENCES notifications(id) ON DELETE CASCADE,
        CONSTRAINT fk_notification_deliveries_company FOREIGN KEY (company_id)
          REFERENCES companies(id) ON DELETE CASCADE,
        CONSTRAINT fk_notification_deliveries_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT uq_notification_deliveries_notification_user
          UNIQUE (notification_id, user_id)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_deliveries_inbox
        ON notification_deliveries (user_id, company_id, status, delivered_at DESC)
        WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_audiences (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        notification_id uuid NOT NULL,
        audience_type notification_audience_type_enum NOT NULL,
        audience_config jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_notification_audiences_notification FOREIGN KEY (notification_id)
          REFERENCES notifications(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_audiences_notification
        ON notification_audiences (notification_id);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL,
        user_id uuid NOT NULL,
        domain notification_domain_enum NOT NULL,
        kind varchar(128) NULL,
        channel varchar(32) NOT NULL DEFAULT 'IN_APP',
        enabled boolean NOT NULL DEFAULT true,
        min_severity notification_severity_enum NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_notification_preferences_company FOREIGN KEY (company_id)
          REFERENCES companies(id) ON DELETE CASCADE,
        CONSTRAINT fk_notification_preferences_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_preferences_user_domain_kind_channel
        ON notification_preferences (
          user_id, company_id, domain, COALESCE(kind, ''), channel
        );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_retention_policies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NULL,
        domain notification_domain_enum NOT NULL,
        delivery_read_purge_days int NOT NULL DEFAULT 60,
        delivery_unread_dismiss_days int NOT NULL DEFAULT 90,
        notification_orphan_purge_days int NOT NULL DEFAULT 180,
        dedup_window_minutes int NOT NULL DEFAULT 15,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_notification_retention_policies_company FOREIGN KEY (company_id)
          REFERENCES companies(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_retention_policies_company_domain
        ON notification_retention_policies (COALESCE(company_id::text, ''), domain);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notification_retention_policies`);
    await queryRunner.query(`DROP TABLE IF EXISTS notification_preferences`);
    await queryRunner.query(`DROP TABLE IF EXISTS notification_audiences`);
    await queryRunner.query(`DROP TABLE IF EXISTS notification_deliveries`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_audience_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_delivery_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_severity_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_domain_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_source_enum`);
  }
}
