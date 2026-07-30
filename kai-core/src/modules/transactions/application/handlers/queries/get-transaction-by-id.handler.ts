import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetTransactionByIdQuery } from '@modules/transactions/application/queries/get-transaction-by-id.query';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TransactionOrmEntity } from '@modules/transactions/infrastructure/orm-mappers/transaction.orm-entity';

@QueryHandler(GetTransactionByIdQuery)
export class GetTransactionByIdQueryHandler implements IQueryHandler<GetTransactionByIdQuery> {
  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepository: Repository<TransactionOrmEntity>,
  ) {}

  async execute(query: GetTransactionByIdQuery): Promise<Transaction | null> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: query.id },
      relations: [
        'branch',
        'branch.company',
        'user',
        'user.person',
        'customer',
        'customer.person',
        'supplier',
        'supplier.person',
        'pointOfSale',
        'cashSession',
        'storage',
        'targetStorage',
        'expenseCategory',
        'resultCenter',
        'accountingPeriod',
        'lines',
        'lines.product',
        'lines.productVariant',
        'lines.unit',
        'lines.tax',
      ],
    });

    if (!transaction) {
      return null;
    }

    return this.toDomain(transaction);
  }

  private toDomain(orm: TransactionOrmEntity): Transaction {
    return {
      id: orm.id,
      documentNumber: orm.documentNumber,
      transactionType: orm.transactionType,
      status: orm.status,
      branchId: orm.branchId,
      userId: orm.userId,
      pointOfSaleId: orm.pointOfSaleId,
      cashSessionId: orm.cashSessionId,
      storageId: orm.storageId,
      targetStorageId: orm.targetStorageId,
      customerId: orm.customerId,
      supplierId: orm.supplierId,
      shareholderId: orm.shareholderId,
      employeeId: orm.employeeId,
      expenseCategoryId: orm.expenseCategoryId,
      resultCenterId: orm.resultCenterId,
      accountingPeriodId: orm.accountingPeriodId,
      subtotal: orm.subtotal,
      taxAmount: orm.taxAmount,
      discountAmount: orm.discountAmount,
      total: orm.total,
      paymentMethod: orm.paymentMethod,
      paymentStatus: orm.paymentStatus,
      bankAccountKey: orm.bankAccountKey,
      documentType: orm.documentType,
      documentFolio: orm.documentFolio,
      paymentDueDate: orm.paymentDueDate,
      amountPaid: orm.amountPaid,
      changeAmount: orm.changeAmount,
      relatedTransactionId: orm.relatedTransactionId,
      externalReference: orm.externalReference,
      notes: orm.notes,
      metadata: orm.metadata,
      createdAt: orm.createdAt,
    } as Transaction;
  }
}
