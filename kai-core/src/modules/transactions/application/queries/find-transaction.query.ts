import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
} from '../../domain/transaction.entity';
import { buildCustomerCreditNoteLinkSummary } from '../read-models/customer-credit-note-link.summary';

export class FindTransactionQuery {
  constructor(public readonly id: string) {}
}

@Injectable()
@QueryHandler(FindTransactionQuery)
export class FindTransactionQueryHandler implements IQueryHandler<FindTransactionQuery> {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute(query: FindTransactionQuery): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: query.id },
      relations: [
        'branch',
        'pointOfSale',
        'cashSession',
        'customer',
        'customer.person',
        'supplier',
        'supplier.person',
        'expenseCategory',
        'resultCenter',
        'shareholder',
        'employee',
        'user',
        'user.person',
        'storageEntry',
        'targetStorageEntry',
        'lines',
        'lines.product',
        'lines.productVariant',
        'lines.unit',
        'lines.tax',
      ],
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${query.id} not found`);
    }

    if (transaction.transactionType === TransactionType.SALE_RETURN) {
      const creditNote = await this.transactionRepository.findOne({
        where: {
          relatedTransactionId: transaction.id,
          transactionType: TransactionType.CUSTOMER_CREDIT_NOTE,
        },
        order: { createdAt: 'DESC' },
      });
      if (creditNote) {
        Object.assign(transaction, {
          linkedCustomerCreditNote:
            buildCustomerCreditNoteLinkSummary(creditNote),
        });
      }
    }

    return transaction;
  }
}
