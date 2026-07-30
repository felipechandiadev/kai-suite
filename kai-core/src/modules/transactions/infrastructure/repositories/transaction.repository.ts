import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../domain/transaction.entity';
import { TransactionRepositoryPort } from '../../application/ports/transaction.repository.port';

/**
 * Transaction Repository Implementation
 * Implementa el puerto de repositorio usando TypeORM
 * Maneja consultas bidireccionales y jerárquicas
 */
@Injectable()
export class TransactionRepository implements TransactionRepositoryPort {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async save(transaction: Transaction): Promise<Transaction> {
    return await this.transactionRepo.save(transaction);
  }

  async findById(id: string): Promise<Transaction | null> {
    return await this.transactionRepo.findOne({
      where: { id },
      relations: [
        'relatedTransaction',
        'inverseRelations',
        'parent',
        'children',
      ],
    });
  }

  async findByDocumentNumber(
    documentNumber: string,
    branchId: string,
  ): Promise<Transaction | null> {
    return await this.transactionRepo.findOne({
      where: { documentNumber, branchId },
      relations: [
        'relatedTransaction',
        'inverseRelations',
        'parent',
        'children',
      ],
    });
  }

  /**
   * Encuentra transacciones que referencian a la transacción dada
   * Usa la relación inversa inverseRelations para consultas eficientes
   */
  async findRelatedTo(transactionId: string): Promise<Transaction[]> {
    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId },
      relations: ['inverseRelations'],
    });

    return transaction?.inverseRelations || [];
  }

  /**
   * Encuentra transacciones hijas de una transacción padre
   * Usa la relación children para jerarquías
   */
  async findChildrenOf(parentTransactionId: string): Promise<Transaction[]> {
    return await this.transactionRepo.find({
      where: { parentTransactionId },
      relations: [
        'relatedTransaction',
        'inverseRelations',
        'parent',
        'children',
      ],
      order: { createdAt: 'ASC' },
    });
  }

  async findByFilters(filters: {
    branchId?: string;
    transactionType?: string;
    status?: string;
    customerId?: string;
    supplierId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ transactions: Transaction[]; total: number }> {
    const queryBuilder = this.transactionRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.relatedTransaction', 'related')
      .leftJoinAndSelect('t.inverseRelations', 'inverse')
      .leftJoinAndSelect('t.parent', 'parent')
      .leftJoinAndSelect('t.children', 'children');

    if (filters.branchId) {
      queryBuilder.andWhere('t.branchId = :branchId', {
        branchId: filters.branchId,
      });
    }

    if (filters.transactionType) {
      queryBuilder.andWhere('t.transactionType = :transactionType', {
        transactionType: filters.transactionType,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('t.status = :status', { status: filters.status });
    }

    if (filters.customerId) {
      queryBuilder.andWhere('t.customerId = :customerId', {
        customerId: filters.customerId,
      });
    }

    if (filters.supplierId) {
      queryBuilder.andWhere('t.supplierId = :supplierId', {
        supplierId: filters.supplierId,
      });
    }

    if (filters.dateFrom) {
      queryBuilder.andWhere('t.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      queryBuilder.andWhere('t.createdAt <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }

    queryBuilder.orderBy('t.createdAt', 'DESC');

    if (filters.limit) {
      queryBuilder.limit(filters.limit);
    }

    if (filters.offset) {
      queryBuilder.offset(filters.offset);
    }

    const [transactions, total] = await queryBuilder.getManyAndCount();

    return { transactions, total };
  }

  async updateStatus(
    id: string,
    status: string,
    userId: string,
  ): Promise<Transaction> {
    await this.transactionRepo.update(id, {
      status: status as any,
      // TODO: Add audit trail
    });

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Transaction ${id} not found after update`);
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    // Soft delete - cambiar status a CANCELLED
    await this.transactionRepo.update(id, {
      status: 'CANCELLED' as any,
      // TODO: Add audit trail
    });
  }
}
