import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { DocumentSequence } from '../domain/document-sequence.entity';
import { TransactionType } from '../domain/transaction.entity';
import { DOCUMENT_TYPE_CODES } from '@shared/enums/document-type-codes';

@Injectable()
export class DocumentNumberService {
  private readonly logger = new Logger(DocumentNumberService.name);

  constructor(
    @InjectRepository(DocumentSequence)
    private readonly sequenceRepository: Repository<DocumentSequence>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Folio correlativo por sucursal + tipo + año calendario: `OC2600001`.
   * Mínimo 5 dígitos; si el correlativo supera 99999 crece sin tope fijo.
   * Si `manager` viene de una transacción DB externa, reutiliza ese contexto (misma atomicidad).
   */
  async allocateNext(
    branchId: string,
    transactionType: TransactionType,
    companyId: string,
    manager?: EntityManager,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const code = DOCUMENT_TYPE_CODES[transactionType] || 'TXN';
    const yy = String(year).slice(-2);

    const run = async (m: EntityManager) => {
      const n = await this.bumpSequence(
        m,
        branchId,
        transactionType,
        year,
        companyId,
      );
      return `${code}${yy}${String(n).padStart(5, '0')}`;
    };

    if (manager) {
      return run(manager);
    }
    return this.dataSource.transaction((m) => run(m));
  }

  private async bumpSequence(
    m: EntityManager,
    branchId: string,
    transactionType: TransactionType,
    year: number,
    companyId: string,
  ): Promise<number> {
    const r = m.getRepository(DocumentSequence);
    const typeKey = String(transactionType);

    for (let attempt = 0; attempt < 12; attempt++) {
      const existing = await r.findOne({
        where: { branchId, transactionType: typeKey, year },
        lock: { mode: 'pessimistic_write' },
      });
      if (existing) {
        existing.lastNumber += 1;
        await r.save(existing);
        return existing.lastNumber;
      }

      const row = r.create({
        companyId,
        branchId,
        transactionType: typeKey,
        year,
        lastNumber: 1,
      });
      try {
        await r.insert(row);
        return 1;
      } catch (e: any) {
        if (e?.code === '23505') {
          this.logger.debug(
            `document_sequences insert race (attempt ${attempt + 1}), retrying`,
          );
          continue;
        }
        throw e;
      }
    }

    throw new Error(
      `No se pudo generar folio para ${typeKey} sucursal ${branchId} año ${year}`,
    );
  }
}
