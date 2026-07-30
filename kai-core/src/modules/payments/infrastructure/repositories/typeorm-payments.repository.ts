import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  PAYMENTS_REPOSITORY,
  PaymentsRepositoryPort,
} from '../../application/ports/payments.repository.port';
import { Transaction } from '@modules/transactions/domain/transaction.entity';

@Injectable()
export class TypeOrmPaymentsRepository implements PaymentsRepositoryPort {
  private repo: Repository<Transaction>;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(Transaction);
  }

  async createPayment(payload: any): Promise<any> {
    const entity = this.repo.create(payload);
    return this.repo.save(entity);
  }

  async getPaymentById(id: string): Promise<any | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findPaymentsBySaleId(saleId: string): Promise<any[]> {
    return this.repo.find({ where: { saleTransactionId: saleId } as any });
  }
}
