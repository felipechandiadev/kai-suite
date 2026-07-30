import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sistema de seguimiento de cheques.
 *
 *  - Crea enums `checks_direction_enum` y `checks_status_enum`.
 *  - Crea tabla `checks` con índices.
 *  - Crea tabla pivote `check_transaction_links` para soportar endoso
 *    (un cheque entrante aplicado como pago saliente referencia múltiples
 *    transacciones).
 *  - Crea tabla `check_events` para auditoría liviana de transiciones de
 *    estado.
 */
export class Checks1744000000000 implements MigrationInterface {
  name = 'Checks1744000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enums
    await queryRunner.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checks_direction_enum') THEN
           CREATE TYPE checks_direction_enum AS ENUM ('INCOMING', 'OUTGOING');
         END IF;
       END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checks_status_enum') THEN
           CREATE TYPE checks_status_enum AS ENUM (
             'PENDING', 'DEPOSITED', 'CLEARED', 'BOUNCED', 'VOIDED', 'ENDORSED'
           );
         END IF;
       END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'check_tx_link_role_enum') THEN
           CREATE TYPE check_tx_link_role_enum AS ENUM ('ORIGIN', 'ENDORSED_TO');
         END IF;
       END $$;`,
    );

    // 2. Tabla checks
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS checks (
         id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
         company_id uuid NOT NULL,
         direction checks_direction_enum NOT NULL,
         status checks_status_enum NOT NULL DEFAULT 'PENDING',
         "checkNumber" varchar(50) NOT NULL,
         "bankName" varchar(120) NOT NULL,
         "bankAccountKey" varchar(120) NULL,
         "drawerName" varchar(200) NULL,
         "drawerDocument" varchar(30) NULL,
         "payeeName" varchar(200) NULL,
         "payeeId" uuid NULL,
         amount numeric(19,2) NOT NULL,
         currency varchar(10) NOT NULL DEFAULT 'CLP',
         "issueDate" date NOT NULL,
         "dueDate" date NULL,
         "depositDate" date NULL,
         "clearedDate" date NULL,
         "bouncedReason" text NULL,
         "transactionId" uuid NULL,
         metadata jsonb NULL,
         "createdAt" timestamp NOT NULL DEFAULT now(),
         "updatedAt" timestamp NOT NULL DEFAULT now(),
         "deletedAt" timestamp NULL,
         CONSTRAINT fk_checks_company FOREIGN KEY (company_id)
           REFERENCES companies(id) ON DELETE RESTRICT,
         CONSTRAINT fk_checks_transaction FOREIGN KEY ("transactionId")
           REFERENCES transactions(id) ON DELETE SET NULL
       );`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_checks_company_id ON checks(company_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_checks_company_status_direction
         ON checks(company_id, status, direction);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_checks_company_due_date
         ON checks(company_id, "dueDate");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_checks_transaction_id
         ON checks("transactionId");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_checks_check_number_bank
         ON checks("checkNumber", "bankName");`,
    );

    // 3. Tabla check_transaction_links
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS check_transaction_links (
         id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
         company_id uuid NOT NULL,
         "checkId" uuid NOT NULL,
         "transactionId" uuid NOT NULL,
         role check_tx_link_role_enum NOT NULL,
         "createdAt" timestamp NOT NULL DEFAULT now(),
         CONSTRAINT uq_check_tx_link_role UNIQUE ("checkId", "transactionId", role),
         CONSTRAINT fk_check_tx_link_company FOREIGN KEY (company_id)
           REFERENCES companies(id) ON DELETE RESTRICT,
         CONSTRAINT fk_check_tx_link_check FOREIGN KEY ("checkId")
           REFERENCES checks(id) ON DELETE CASCADE,
         CONSTRAINT fk_check_tx_link_transaction FOREIGN KEY ("transactionId")
           REFERENCES transactions(id) ON DELETE RESTRICT
       );`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_check_tx_link_company_id
         ON check_transaction_links(company_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_check_tx_link_check
         ON check_transaction_links("checkId");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_check_tx_link_transaction
         ON check_transaction_links("transactionId");`,
    );

    // 4. Tabla check_events
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS check_events (
         id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
         company_id uuid NOT NULL,
         "checkId" uuid NOT NULL,
         "fromStatus" checks_status_enum NULL,
         "toStatus" checks_status_enum NOT NULL,
         "userId" uuid NULL,
         notes text NULL,
         metadata jsonb NULL,
         at timestamp NOT NULL DEFAULT now(),
         CONSTRAINT fk_check_events_check FOREIGN KEY ("checkId")
           REFERENCES checks(id) ON DELETE CASCADE
       );`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_check_events_check
         ON check_events("checkId");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS check_events;`);
    await queryRunner.query(`DROP TABLE IF EXISTS check_transaction_links;`);
    await queryRunner.query(`DROP TABLE IF EXISTS checks;`);
    await queryRunner.query(`DROP TYPE IF EXISTS check_tx_link_role_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS checks_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS checks_direction_enum;`);
  }
}
