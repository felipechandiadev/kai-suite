import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { CreateTransactionCommand } from '@modules/transactions/application/commands/create-transaction.command';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionOrmEntity } from '@modules/transactions/infrastructure/orm-mappers/transaction.orm-entity';
import { TransactionLineOrmEntity } from '@modules/transaction-lines/infrastructure/orm-mappers/transaction-line.orm-entity';
import { CustomerOrmEntity } from '@modules/customers/infrastructure/orm-mappers/customer.orm-entity';
import { BranchOrmEntity } from '@modules/branches/infrastructure/orm-mappers/branch.orm-entity';
import { AccountingPeriodsService } from '@modules/accounting-periods/application/accounting-periods.service';
import { TransactionCreatedEvent } from '@shared/events/transaction-created.event';
import { DocumentNumberService } from '@modules/transactions/application/document-number.service';
import { getPaymentSnapshots } from '@modules/transactions/application/payment-snapshots.util';

@CommandHandler(CreateTransactionCommand)
export class CreateTransactionCommandHandler implements ICommandHandler<CreateTransactionCommand> {
  private readonly logger = new Logger(CreateTransactionCommandHandler.name);

  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepository: Repository<TransactionOrmEntity>,
    @InjectRepository(BranchOrmEntity)
    private readonly branchRepository: Repository<BranchOrmEntity>,
    @InjectRepository(CustomerOrmEntity)
    private readonly customerRepository: Repository<CustomerOrmEntity>,
    private readonly dataSource: DataSource,
    private readonly accountingPeriodsService: AccountingPeriodsService,
    private readonly eventBus: EventBus,
    private readonly documentNumberService: DocumentNumberService,
  ) {}

  async execute(command: CreateTransactionCommand): Promise<Transaction> {
    this.logger.debug(
      `Creating transaction: type=${command.transactionType}, branch=${command.branchId}, user=${command.userId}`,
    );

    // Get branch and company info
    const branch = await this.branchRepository.findOne({
      where: { id: command.branchId },
    });

    if (!branch || !branch.companyId) {
      throw new BadRequestException(
        `Branch ${command.branchId} not found or has no company`,
      );
    }

    const companyId = branch.companyId;

    // Ensure accounting period (auto-provision if needed)
    const transactionDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const accountingPeriod = await this.accountingPeriodsService.ensurePeriod(
      transactionDate,
      companyId,
    );

    this.logger.debug(
      `Transaction will use accounting period: ${accountingPeriod.name} (${accountingPeriod.id})`,
    );

    // Execute transaction creation in DB transaction
    const result = await this.dataSource.transaction(async (manager) => {
      const documentNumber = await this.documentNumberService.allocateNext(
        command.branchId,
        command.transactionType as TransactionType,
        companyId,
        manager,
      );

      // Create transaction entity
      const transactionData: any = {
        documentNumber,
        transactionType: command.transactionType,
        status: TransactionStatus.CONFIRMED,
        companyId,
        branchId: command.branchId,
        userId: command.userId,
        pointOfSaleId: command.pointOfSaleId || null,
        cashSessionId: command.cashSessionId || null,
        storageId: command.storageId || null,
        targetStorageId: command.targetStorageId || null,
        customerId: command.customerId || null,
        supplierId: command.supplierId || null,
        shareholderId: command.shareholderId || null,
        employeeId: command.employeeId || null,
        expenseCategoryId: command.expenseCategoryId || null,
        resultCenterId: command.resultCenterId || null,
        accountingPeriodId: accountingPeriod.id,
        subtotal: command.subtotal,
        taxAmount: command.taxAmount,
        discountAmount: command.discountAmount,
        total: command.total,
        paymentMethod: command.paymentMethod,
        paymentStatus: command.paymentStatus,
        bankAccountKey: command.bankAccountKey || null,
        cashHubId: (command as any).cashHubId || null,
        documentType: command.documentType || null,
        documentFolio: command.documentFolio || null,
        paymentDueDate: command.paymentDueDate
          ? new Date(command.paymentDueDate)
          : null,
        amountPaid: command.amountPaid,
        changeAmount: command.changeAmount || null,
        relatedTransactionId: command.relatedTransactionId || null,
        externalReference: command.externalReference || null,
        notes: command.notes || null,
        metadata: command.metadata || {},
      };

      const saveRepository = manager.getRepository(TransactionOrmEntity);
      const savedTx = await saveRepository.save(transactionData);

      // Save transaction lines if provided
      if (command.lines && command.lines.length > 0) {
        const lineRepo = manager.getRepository(TransactionLineOrmEntity);
        const lineEntities = command.lines.map((line, index) =>
          lineRepo.create({
            transactionId: savedTx.id,
            productId: line.productId,
            productVariantId: line.productVariantId,
            unitId: line.unitId,
            taxId: line.taxId,
            lineNumber: index + 1,
            productName: line.productName,
            productSku: line.productSku,
            variantName: line.variantName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            unitCost: line.unitCost,
            discountPercentage: line.discountPercentage,
            discountAmount: line.discountAmount,
            taxRate: (() => {
              let rate = Number(line.taxRate) || 0;
              if (rate > 100) {
                rate = rate / 100;
              }
              return Math.max(0, Math.min(rate, 100));
            })(),
            taxAmount: line.taxAmount,
            subtotal: line.subtotal,
            total: line.total,
            notes: line.notes,
          }),
        );
        await lineRepo.save(lineEntities);
      }

      // Update customer credit balance if INTERNAL_CREDIT payment
      if (
        savedTx.transactionType === TransactionType.SALE &&
        savedTx.customerId
      ) {
        const snapshots = getPaymentSnapshots(savedTx);

        let internalCreditAmount = snapshots
          .filter(
            (s) =>
              String(s.method).toUpperCase() ===
              PaymentMethod.INTERNAL_CREDIT,
          )
          .reduce((sum, s) => sum + Number(s.amount || 0), 0);

        if (
          internalCreditAmount <= 0 &&
          savedTx.paymentMethod === PaymentMethod.INTERNAL_CREDIT
        ) {
          internalCreditAmount = Number(savedTx.total || 0);
        }

        if (internalCreditAmount > 0) {
          const customerRepo = manager.getRepository(CustomerOrmEntity);
          const customer = await customerRepo.findOne({
            where: { id: savedTx.customerId },
          });
          if (customer) {
            const currentBalance = Number(customer.currentBalance || 0);
            customer.currentBalance = currentBalance + internalCreditAmount;
            await customerRepo.save(customer);
          }
        }
      }

      return savedTx;
    });

    // Emit event after transaction is committed
    const event = new TransactionCreatedEvent(result, companyId);
    this.eventBus.publish(event);

    this.logger.debug(
      `Transaction ${result.id} created and event emitted. Accounting engine will process automatically.`,
    );

    return this.toDomain(result);
  }

  private toDomain(orm: TransactionOrmEntity): Transaction {
    return {
      id: orm.id,
      documentNumber: orm.documentNumber,
      transactionType: orm.transactionType as any,
      status: orm.status as any,
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
      paymentMethod: orm.paymentMethod as any,
      paymentStatus: orm.paymentStatus as any,
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
