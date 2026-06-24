import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Person } from '@modules/persons/domain/person.entity';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  PaymentStatus,
} from '@modules/transactions/domain/transaction.entity';
import { saleBalanceDue } from '@modules/cash-sessions/application/collect-pending-sales.util';
import { CustomersRepositoryPort } from '@modules/customers/application/ports/customers.repository.port';

/**
 * Nota: usamos la entidad de dominio `Customer` (registrada en
 * `typeorm.config.ts`) directamente; el mapper `CustomerOrmEntity` no
 * está registrado como entidad TypeORM y produce errores de
 * "No metadata found".
 */
@Injectable()
export class CustomersRepository implements CustomersRepositoryPort {
  constructor(
    @InjectRepository(Customer)
    private readonly repo: Repository<Customer>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async save(customer: Customer): Promise<Customer> {
    return this.repo.save(customer);
  }

  async findById(id: string): Promise<Customer | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['person'],
    });
  }

  async findByIdWithPerson(id: string): Promise<Customer | null> {
    return this.findById(id);
  }

  async findAll(filter?: Record<string, any>): Promise<Customer[]> {
    const where: any = {};
    if (filter?.isActive !== undefined) where.isActive = filter.isActive;

    return this.repo.find({
      where,
      relations: ['person'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllWithPagination(
    filter?: Record<string, any>,
    page?: number,
    pageSize?: number,
  ): Promise<{ customers: Customer[]; total: number }> {
    const { searchQuery = '' } = filter || {};
    const pageNum = page || 1;
    const size = pageSize || 10;

    const qb = this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.person', 'person')
      .where('1=1');

    if (filter?.isActive !== undefined) {
      qb.andWhere('c.isActive = :isActive', { isActive: filter.isActive });
    }

    if (searchQuery && searchQuery.trim().length > 0) {
      // Búsqueda insensible a mayúsculas (ILIKE) y a tildes (unaccent).
      // La extensión `unaccent` se asegura en CustomersSearchBootstrap.
      const q = `%${searchQuery.trim()}%`;
      qb.andWhere(
        `(
          unaccent(COALESCE(person.firstName, '')) ILIKE unaccent(:q)
          OR unaccent(COALESCE(person.lastName, '')) ILIKE unaccent(:q)
          OR unaccent(COALESCE(person.businessName, '')) ILIKE unaccent(:q)
          OR unaccent(COALESCE(person.documentNumber, '')) ILIKE unaccent(:q)
          OR unaccent(COALESCE(person.email, '')) ILIKE unaccent(:q)
          OR unaccent(COALESCE(person.phone, '')) ILIKE unaccent(:q)
        )`,
        { q },
      );
    }

    qb.orderBy('c.createdAt', 'DESC')
      .skip((pageNum - 1) * size)
      .take(size);

    const [customers, total] = await qb.getManyAndCount();

    return { customers, total };
  }

  async findByPersonId(personId: string): Promise<Customer | null> {
    return this.repo.findOne({
      where: { personId },
      withDeleted: true,
    });
  }

  async findByDocumentNumber(documentNumber: string): Promise<Customer | null> {
    const person = await this.personRepository.findOne({
      where: { documentNumber },
      withDeleted: true,
    });

    if (!person) return null;

    return this.findByPersonId(person.id);
  }

  async update(id: string, updateData: Partial<Customer>): Promise<Customer> {
    await this.repo.update(id, updateData as any);
    const updated = await this.repo.findOne({
      where: { id },
    });
    if (!updated) throw new Error('Customer not found after update');
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const customer = await this.repo.findOne({
      where: { id },
    });

    if (customer) {
      customer.isActive = false;
      await this.repo.save(customer);
    }
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async getTransactions(customerId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getPendingPayments(customerId: string): Promise<Transaction[]> {
    const rows = await this.transactionRepository.find({
      where: {
        customerId,
        transactionType: TransactionType.SALE,
        status: TransactionStatus.CONFIRMED,
        paymentStatus: In([PaymentStatus.PENDING, PaymentStatus.PARTIAL]),
      },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return rows.filter(
      (tx) => saleBalanceDue(Number(tx.total), Number(tx.amountPaid)) > 0,
    );
  }

  async getPurchases(
    customerId: string,
    status?: string,
  ): Promise<Transaction[]> {
    const where: Record<string, unknown> = {
      customerId,
      transactionType: In([
        TransactionType.SALE,
        TransactionType.BACKORDER,
        TransactionType.PURCHASE,
        TransactionType.CUSTOMER_ORDER,
      ]),
    };
    if (status) where.status = status;

    return this.transactionRepository.find({
      where: where as never,
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getPaymentIns(customerId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: {
        customerId,
        transactionType: In([
          TransactionType.PAYMENT_IN,
          TransactionType.CUSTOMER_CREDIT_NOTE_PAYOUT,
        ]),
      },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async calculateAvailableCredit(customerId: string): Promise<{
    creditLimit: number;
    usedCredit: number;
    availableCredit: number;
  }> {
    const customer = await this.repo.findOne({
      where: { id: customerId },
    });

    if (!customer) return { creditLimit: 0, usedCredit: 0, availableCredit: 0 };

    const creditLimit = Number(customer.creditLimit || 0);
    const usedCredit = Number(customer.currentBalance || 0);
    const availableCredit = Math.max(0, creditLimit - usedCredit);

    return { creditLimit, usedCredit, availableCredit };
  }
}
