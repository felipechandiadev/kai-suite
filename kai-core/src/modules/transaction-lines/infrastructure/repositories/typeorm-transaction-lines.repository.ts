import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionLinesRepositoryPort } from '../../application/ports/transaction-lines.repository.port';
import { TransactionLine } from '../../domain/transaction-line.entity';
import { TransactionLineOrmEntity } from '../orm-mappers/transaction-line.orm-entity';

@Injectable()
export class TypeOrmTransactionLinesRepository implements TransactionLinesRepositoryPort {
  constructor(
    @InjectRepository(TransactionLineOrmEntity)
    private readonly repository: Repository<TransactionLineOrmEntity>,
  ) {}

  private toTransactionLine(ormEntity: TransactionLineOrmEntity): TransactionLine {
    return {
      id: ormEntity.id,
      transactionId: ormEntity.transactionId,
      productId: ormEntity.productId,
      productVariantId: ormEntity.productVariantId,
      unitId: ormEntity.unitId,
      taxId: ormEntity.taxId,
      lineNumber: ormEntity.lineNumber,
      productName: ormEntity.productName,
      productSku: ormEntity.productSku,
      variantName: ormEntity.variantName,
      quantity: ormEntity.quantity,
      quantityInBase: ormEntity.quantityInBase,
      unitOfMeasure: ormEntity.unitOfMeasure,
      unitConversionFactor: ormEntity.unitConversionFactor,
      unitPrice: ormEntity.unitPrice,
      unitCost: ormEntity.unitCost,
      discountPercentage: ormEntity.discountPercentage,
      discountAmount: ormEntity.discountAmount,
      taxRate: ormEntity.taxRate,
      taxAmount: ormEntity.taxAmount,
      subtotal: ormEntity.subtotal,
      total: ormEntity.total,
      notes: ormEntity.notes,
      createdAt: ormEntity.createdAt,
    } as TransactionLine;
  }

  async findAll(): Promise<TransactionLine[]> {
    const entities = await this.repository.find({
      relations: ['product', 'productVariant', 'tax', 'unit'],
      order: { lineNumber: 'ASC' },
    });

    return entities.map((entity) => this.toTransactionLine(entity));
  }

  async findById(id: string): Promise<TransactionLine | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['product', 'productVariant', 'tax', 'unit'],
    });

    return entity ? this.toTransactionLine(entity) : null;
  }

  async findByTransactionId(transactionId: string): Promise<TransactionLine[]> {
    const entities = await this.repository.find({
      where: { transactionId },
      relations: ['product', 'productVariant', 'tax', 'unit'],
      order: { lineNumber: 'ASC' },
    });

    return entities.map((entity) => this.toTransactionLine(entity));
  }
}
