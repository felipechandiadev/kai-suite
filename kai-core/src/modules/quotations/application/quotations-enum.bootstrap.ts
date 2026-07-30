import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Bootstrap idempotente que garantiza la existencia de los valores
 * `QUOTATION` y `EXPIRED` en los enums `transactions_transactiontype_enum`
 * y `transactions_status_enum` respectivamente.
 *
 * Contexto:
 *   En ambientes donde el schema se materializó con `synchronize: true`
 *   antes de que existieran estos valores, TypeORM no actualiza enums
 *   existentes en runtime. La migración `Quotations1745000000000` cubre
 *   despliegues que ejecutan `migration:run`; este bootstrap cubre el
 *   resto (mismo patrón que `SupplierInvoiceEnumBootstrap`).
 *
 *   `ALTER TYPE ... ADD VALUE` no puede ejecutarse dentro de una
 *   transacción y se aplica fuera del modo DDL atómico. Cualquier error
 *   se loguea como `warn`/`error` pero no detiene el arranque.
 */
@Injectable()
export class QuotationsEnumBootstrap implements OnModuleInit {
  private readonly logger = new Logger(QuotationsEnumBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.ensureEnumValue(
      'transactions_transactiontype_enum',
      'QUOTATION',
    );
    await this.ensureEnumValue('transactions_status_enum', 'EXPIRED');
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
