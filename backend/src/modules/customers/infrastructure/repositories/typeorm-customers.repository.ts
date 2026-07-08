import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not } from 'typeorm';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Person } from '@modules/persons/domain/person.entity';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  PaymentStatus,
} from '@modules/transactions/domain/transaction.entity';
import { saleBalanceDue } from '@modules/cash-sessions/application/collect-pending-sales.util';
import {
  CustomersRepositoryPort,
  CUSTOMERS_REPOSITORY,
} from '../../application/ports/customers.repository.port';

@Injectable()
export class TypeOrmCustomersRepository implements CustomersRepositoryPort {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async save(customer: Customer): Promise<Customer> {
    return this.customerRepository.save(customer);
  }

  async findById(id: string): Promise<Customer | null> {
    return this.customerRepository.findOne({
      where: { id },
      withDeleted: false,
    });
  }

  async findByIdWithPerson(id: string): Promise<Customer | null> {
    return this.customerRepository.findOne({
      where: { id },
      relations: ['person'],
      withDeleted: false,
    });
  }

  async findAll(filter?: Record<string, any>): Promise<Customer[]> {
    const where: any = {};
    if (filter?.isActive !== undefined) where.isActive = filter.isActive;

    return this.customerRepository.find({
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

    const qb = this.customerRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.person', 'person')
      .where('1=1');

    if (filter?.isActive !== undefined) {
      qb.andWhere('c.isActive = :isActive', { isActive: filter.isActive });
    }

    if (searchQuery && searchQuery.trim().length > 0) {
      // Búsqueda insensible a mayúsculas (ILIKE) y a tildes (unaccent).
      // Extensión `unaccent` asegurada por CustomersSearchBootstrap.
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

  async findOfflineSnapshotPage(
    cursor: string | null,
    limit: number,
  ): Promise<Customer[]> {
    const qb = this.customerRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.person', 'person')
      .where('c.deletedAt IS NULL')
      .andWhere('c.isActive = :active', { active: true })
      .orderBy('c.id', 'ASC')
      .take(limit);

    if (cursor) {
      qb.andWhere('c.id > :cursor', { cursor });
    }

    return qb.getMany();
  }

  async findByPersonId(personId: string): Promise<Customer | null> {
    return this.customerRepository.findOne({
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

    return this.customerRepository.findOne({
      where: { personId: person.id },
      withDeleted: true,
    });
  }

  async update(id: string, updateData: Partial<Customer>): Promise<Customer> {
    await this.customerRepository.update(id, updateData);
    const updated = await this.customerRepository.findOne({
      where: { id },
    });
    if (!updated) throw new Error('Customer not found after update');
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const customer = await this.customerRepository.findOne({
      where: { id },
    });

    if (customer) {
      customer.isActive = false;
      await this.customerRepository.save(customer);
    }
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

  async remove(id: string): Promise<void> {
    await this.customerRepository.delete(id);
  }

  async calculateAvailableCredit(customerId: string): Promise<{
    creditLimit: number;
    usedCredit: number;
    availableCredit: number;
  }> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) return { creditLimit: 0, usedCredit: 0, availableCredit: 0 };

    const creditLimit = Number(customer.creditLimit || 0);
    const usedCredit = Number(customer.currentBalance || 0);
    const availableCredit = Math.max(0, creditLimit - usedCredit);

    return { creditLimit, usedCredit, availableCredit };
  }
}
