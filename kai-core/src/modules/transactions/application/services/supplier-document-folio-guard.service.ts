import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
} from '../../domain/transaction.entity';

function normalizeFolio(raw: string): string {
  return String(raw || '').trim();
}

@Injectable()
export class SupplierDocumentFolioGuardService {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
  ) {}

  /**
   * Verifica que no exista otro documento del mismo proveedor con el mismo folio
   * entre los tipos indicados.
   */
  async assertUniqueFolio(opts: {
    companyId: string;
    supplierId: string;
    documentFolio: string;
    transactionTypes: TransactionType[];
    excludeTransactionId?: string;
  }): Promise<void> {
    const folio = normalizeFolio(opts.documentFolio);
    if (!folio) {
      throw new BadRequestException('El folio del documento es obligatorio.');
    }
    if (!opts.transactionTypes.length) {
      return;
    }

    const qb = this.txRepo
      .createQueryBuilder('tx')
      .select('tx.id')
      .where('tx.companyId = :companyId', { companyId: opts.companyId })
      .andWhere('tx.supplierId = :supplierId', { supplierId: opts.supplierId })
      .andWhere('tx.documentFolio = :folio', { folio })
      .andWhere('tx.transactionType IN (:...types)', {
        types: opts.transactionTypes,
      });

    if (opts.excludeTransactionId) {
      qb.andWhere('tx.id != :excludeId', {
        excludeId: opts.excludeTransactionId,
      });
    }

    const existing = await qb.getOne();
    if (existing) {
      throw new BadRequestException(
        `Ya existe un documento con folio "${folio}" para este proveedor.`,
      );
    }
  }

  /** Tipos a considerar al validar unicidad de folio para un gasto operativo. */
  allFolioTypesForOperationalExpense(): TransactionType[] {
    return [
      TransactionType.SUPPLIER_INVOICE,
      TransactionType.SUPPLIER_RECEIPT,
      TransactionType.SUPPLIER_HONORARIUM_RECEIPT,
      TransactionType.OPERATING_EXPENSE,
    ];
  }
}
