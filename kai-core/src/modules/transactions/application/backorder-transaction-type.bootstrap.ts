import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Asegura `BACKORDER` en los enums de Postgres cuando el schema se creó con
 * `synchronize` antes de existir el valor (mismo patrón que `QuotationsEnumBootstrap`).
 */
@Injectable()
export class BackorderTransactionTypeBootstrap implements OnModuleInit {
  private readonly logger = new Logger(BackorderTransactionTypeBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.ensureEnumValue(
      'transactions_transactiontype_enum',
      'BACKORDER',
    );
    await this.ensureEnumValue(
      'accounting_rules_transactiontype_enum',
      'BACKORDER',
    );
  }

  private async ensureEnumValue(
    enumName: string,
    value: string,
  ): Promise<void> {
    try {
      const exists = await this.dataSource.query<{ exists: boolean }[]>(
        `SELECT EXISTS (
           SELECT 1
           FROM pg_type t
           JOIN pg_enum e ON t.oid = e.enumtypid
           WHERE t.typname = $1
             AND e.enumlabel = $2
         ) AS exists`,
        [enumName, value],
      );
      if (exists?.[0]?.exists) return;

      this.logger.warn(
        `Valor ${value} no presente en ${enumName}; agregándolo con ALTER TYPE.`,
      );

      await this.dataSource.query(
        `ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS '${value}'`,
      );

      this.logger.log(`Valor ${value} asegurado en ${enumName}.`);
    } catch (err) {
      this.logger.error(
        `No se pudo asegurar ${value} en ${enumName}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
