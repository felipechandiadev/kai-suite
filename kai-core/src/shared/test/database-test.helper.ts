import { TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Entities
import { Customer } from '@modules/customers/domain/customer.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';

/**
 * Database Test Helper
 *
 * Provides utilities for setting up and cleaning test data
 * in E2E and integration tests.
 */
export class DatabaseTestHelper {
  private customerRepository: Repository<Customer>;
  private personRepository: Repository<Person>;
  private transactionRepository: Repository<Transaction>;
  private supplierRepository: Repository<Supplier>;

  constructor(private moduleRef: TestingModule) {
    this.customerRepository = this.moduleRef.get<Repository<Customer>>(
      getRepositoryToken(Customer),
    );
    this.personRepository = this.moduleRef.get<Repository<Person>>(
      getRepositoryToken(Person),
    );
    this.transactionRepository = this.moduleRef.get<Repository<Transaction>>(
      getRepositoryToken(Transaction),
    );
    this.supplierRepository = this.moduleRef.get<Repository<Supplier>>(
      getRepositoryToken(Supplier),
    );
  }

  /**
   * Setup initial test data
   */
  async setupTestData(): Promise<void> {
    // Clean existing data
    await this.transactionRepository.clear();
    await this.supplierRepository.clear();
    await this.customerRepository.clear();
    await this.personRepository.clear();
  }

  /**
   * Clean up test data
   */
  async cleanup(): Promise<void> {
    await this.transactionRepository.clear();
    await this.supplierRepository.clear();
    await this.customerRepository.clear();
    await this.personRepository.clear();
  }

  /**
   * Create a test customer with person
   */
  async createTestCustomer(customerData: {
    personType: string;
    firstName?: string;
    lastName?: string;
    businessName?: string;
    documentType?: string;
    documentNumber: string;
    email?: string;
    phone?: string;
    address?: string;
    creditLimit?: number;
    paymentDayOfMonth?: number;
    notes?: string;
  }): Promise<Customer> {
    // Create person first
    const person = this.personRepository.create({
      type: customerData.personType as any,
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      businessName: customerData.businessName,
      documentType: customerData.documentType as any,
      documentNumber: customerData.documentNumber,
      email: customerData.email,
      phone: customerData.phone,
      address: customerData.address,
    });

    const savedPerson = await this.personRepository.save(person);

    // Create customer
    const customer = this.customerRepository.create({
      personId: savedPerson.id,
      creditLimit: customerData.creditLimit || 0,
      currentBalance: 0,
      paymentDayOfMonth:
        (customerData.paymentDayOfMonth as 5 | 10 | 15 | 20 | 25 | 30) || 5,
      isActive: true,
      notes: customerData.notes,
    });

    return await this.customerRepository.save(customer);
  }

  /**
   * Create a test supplier
   */
  async createTestSupplier(supplierData: {
    personId: string;
    supplierType: string;
    defaultPaymentTermDays: number;
    alias?: string;
    notes?: string;
  }): Promise<Supplier> {
    const supplier = this.supplierRepository.create({
      personId: supplierData.personId,
      supplierType: supplierData.supplierType as any,
      defaultPaymentTermDays: supplierData.defaultPaymentTermDays,
      alias: supplierData.alias,
      notes: supplierData.notes,
      isActive: true,
    });

    return this.supplierRepository.save(supplier);
  }

  /**
   * Create a test transaction
   */
  async createTestTransaction(transactionData: {
    customerId?: string;
    supplierId?: string;
    transactionType: string;
    total: number;
    status: string;
    paymentMethod?: string;
    documentNumber?: string;
  }): Promise<Transaction> {
    const transaction = this.transactionRepository.create({
      customerId: transactionData.customerId,
      supplierId: transactionData.supplierId,
      transactionType: transactionData.transactionType as any,
      total: transactionData.total,
      status: transactionData.status as any,
      paymentMethod: transactionData.paymentMethod as any,
      documentNumber: transactionData.documentNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.transactionRepository.save(transaction);
  }

  /**
   * Get customer by ID with relations
   */
  async getCustomerWithRelations(id: string): Promise<Customer | null> {
    return this.customerRepository.findOne({
      where: { id },
      relations: ['person'],
    });
  }

  /**
   * Get all customers
   */
  async getAllCustomers(): Promise<Customer[]> {
    return this.customerRepository.find({
      relations: ['person'],
    });
  }

  /**
   * Get customer transactions
   */
  async getCustomerTransactions(customerId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get supplier by ID
   */
  async getSupplier(id: string): Promise<Supplier | null> {
    return this.supplierRepository.findOne({
      where: { id },
    });
  }

  /**
   * Get all suppliers
   */
  async getAllSuppliers(): Promise<Supplier[]> {
    return this.supplierRepository.find();
  }
}
