import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { AutomationEventType } from '../domain/automation-event-type.enum';
import { UpdateStockActionHandler } from './handlers/actions/update-stock.action';

export interface StockEventLogRow {
  transactionId: string;
  documentNumber: string | null;
  transactionType: string | null;
  status: string;
  attempts: number;
  lastError: string | null;
  updatedAt: string;
}

const MAX_ATTEMPTS = 5;

/**
 * Seguimiento y reintento de la aplicación de stock que se dispara tras confirmar una
 * transacción. El handler es idempotente (una fila por transacción), así que reintentar
 * nunca descuenta dos veces.
 */
@Injectable()
export class StockEventRetryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StockEventRetryService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly updateStock: UpdateStockActionHandler,
  ) {}

  onModuleInit() {
    const disabled =
      process.env.NODE_ENV === 'test' || process.env.STOCK_EVENT_RETRY_ENABLED === 'false';
    if (disabled) return;
    const every = Number(process.env.STOCK_EVENT_RETRY_INTERVAL_MS) || 5 * 60 * 1000;
    this.timer = setInterval(() => {
      this.retryFailed().catch((e) =>
        this.logger.error(`Reintento automático de stock falló: ${e?.message ?? e}`),
      );
    }, every);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Fallos pendientes de resolver (todos los reintentos agotados o por reintentar). */
  async listFailed(companyId: string): Promise<StockEventLogRow[]> {
    const rows = await this.dataSource.query(
      `SELECT l.transaction_id AS "transactionId", t."documentNumber" AS "documentNumber",
              t."transactionType"::text AS "transactionType", l.status, l.attempts,
              l.last_error AS "lastError", l.updated_at AS "updatedAt"
         FROM stock_event_logs l
         LEFT JOIN transactions t ON t.id = l.transaction_id
        WHERE l.company_id = $1 AND l.status = 'FAILED'
        ORDER BY l.updated_at DESC
        LIMIT 200`,
      [companyId],
    );
    return rows.map((r: any) => ({ ...r, updatedAt: new Date(r.updatedAt).toISOString() }));
  }

  /**
   * Reintenta las transacciones con stock fallido. Sin `companyId` recorre todas las
   * empresas (reintento automático). Devuelve cuántas quedaron aplicadas.
   */
  async retryFailed(companyId?: string, opts?: { force?: boolean }) {
    const rows: Array<{ transaction_id: string; company_id: string }> =
      await this.dataSource.query(
        `SELECT transaction_id, company_id FROM stock_event_logs
          WHERE status = 'FAILED'
            AND ($1::uuid IS NULL OR company_id = $1)
            AND ($2::boolean OR attempts < $3)
          ORDER BY updated_at ASC
          LIMIT 100`,
        [companyId ?? null, opts?.force === true, MAX_ATTEMPTS],
      );
    let applied = 0;
    let failed = 0;
    for (const row of rows) {
      const tx = await this.dataSource.getRepository(Transaction).findOne({
        where: { id: row.transaction_id },
        relations: ['lines'],
      });
      if (!tx) continue;
      try {
        await this.updateStock.execute(
          {
            companyId: row.company_id,
            eventType: AutomationEventType.TRANSACTION_CREATED,
            payload: { transaction: tx },
          },
          null,
        );
        applied++;
      } catch {
        failed++; // el handler ya dejó constancia del fallo
      }
    }
    return { attempted: rows.length, applied, failed };
  }
}
