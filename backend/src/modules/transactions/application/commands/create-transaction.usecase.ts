import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../../domain/transaction.entity';
import { TransactionLine } from '../../../transaction-lines/domain/transaction-line.entity';
import { Branch } from '../../../branches/domain/branch.entity';
import { Customer } from '../../../customers/domain/customer.entity';
import { User } from '../../../users/domain/user.entity';
import { TransactionCreatedEvent } from '../../../../shared/events/transaction-created.event';
import { AccountingPeriodsService } from '../../../accounting-periods/application/accounting-periods.service';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { DocumentNumberService } from '../document-number.service';
import { VariantQuantityConversionService } from '@modules/product-variants/application/variant-quantity-conversion.service';
import { getPaymentSnapshots } from '../payment-snapshots.util';
import { PaymentMethod } from '../../domain/transaction.entity';

export class CreateTransactionCommand {
  constructor(public readonly dto: CreateTransactionDto) {}
}

@Injectable()
@CommandHandler(CreateTransactionCommand)
export class CreateTransactionUseCase implements ICommandHandler<CreateTransactionCommand> {
  private logger = new Logger(CreateTransactionUseCase.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly accountingPeriodsService: AccountingPeriodsService,
    private readonly eventBus: EventBus,
    private readonly documentNumberService: DocumentNumberService,
    private readonly variantQuantityConversion: VariantQuantityConversionService,
  ) {}

  async execute(command: CreateTransactionCommand): Promise<Transaction> {
    const { dto } = command;

    // Paso 1: Validar DTO
    const validationErrors = dto.validate();
    if (validationErrors.length > 0) {
      throw new BadRequestException(
        `Validación fallida: ${validationErrors.join('; ')}`,
      );
    }

    if (
      dto.transactionType === TransactionType.SUPPLIER_PAYMENT &&
      dto.relatedTransactionId
    ) {
      await this.assertSupplierPaymentParent(dto);
    }
    if (
      dto.transactionType === TransactionType.PAYROLL_PAYMENT &&
      dto.relatedTransactionId
    ) {
      await this.assertPayrollPaymentParent(dto);
    }
    if (
      dto.transactionType === TransactionType.EXPENSE_PAYMENT &&
      dto.relatedTransactionId
    ) {
      await this.assertExpensePaymentParent(dto);
    }

    // Paso Pre-transacción: Obtener branch y companyId fuera de la transacción
    const branch = await this.branchRepository.findOne({
      where: { id: dto.branchId },
    });

    if (!branch || !branch.companyId) {
      throw new BadRequestException(
        `Branch ${dto.branchId} not found or has no company. Cannot generate ledger entries.`,
      );
    }

    const userExists = await this.userRepository.exist({
      where: { id: dto.userId },
    });
    if (!userExists) {
      throw new BadRequestException(
        `Usuario no encontrado (userId inválido). Vuelva a iniciar sesión o verifique el id de usuario.`,
      );
    }

    const companyId = branch.companyId;

    // Paso 0: ASEGURAR período contable (APERTURA AUTOMÁTICA)
    const transactionDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const accountingPeriod = await this.accountingPeriodsService.ensurePeriod(
      transactionDate,
      companyId,
    );

    this.logger.log(
      `Transaction will use accounting period: ${accountingPeriod.name} ` +
        `(${accountingPeriod.id}) - Status: ${accountingPeriod.status}`,
    );

    await this.variantQuantityConversion.enrichCreateTransactionDto(dto, companyId);

    // Transacción DB: persistir todo y hacer commit antes de publicar el evento,
    // para que los suscriptores (p. ej. actualización de stock) vean las líneas en BD.
    const savedTx = await this.dataSource.transaction(async (manager) => {
      try {
        // Paso 2: Folio correlativo (SIGLAYY00001) o reutilizar el preasignado en el DTO
        const presetDoc =
          typeof dto.documentNumber === 'string' ? dto.documentNumber.trim() : '';
        const documentNumber = presetDoc
          ? presetDoc
          : await this.documentNumberService.allocateNext(
              dto.branchId,
              dto.transactionType,
              companyId,
              manager,
            );

        // Paso 3-4: Crear y guardar Transaction en BD
        const draftOnCreate =
          dto.transactionStatus === TransactionStatus.DRAFT &&
          [
            TransactionType.PURCHASE_ORDER,
            TransactionType.SUPPLIER_PAYMENT,
            TransactionType.PAYROLL_PAYMENT,
            TransactionType.EXPENSE_PAYMENT,
            TransactionType.PRODUCTION_BATCH,
          ].includes(dto.transactionType);
        const initialStatus = draftOnCreate
          ? TransactionStatus.DRAFT
          : TransactionStatus.CONFIRMED;

        const transactionData: any = {
          documentNumber,
          transactionType: dto.transactionType,
          status: initialStatus,
          companyId,
          branchId: dto.branchId,
          userId: dto.userId,
          pointOfSaleId: dto.pointOfSaleId || null,
          cashSessionId: dto.cashSessionId || null,
          storageId: dto.storageId || null,
          targetStorageId: dto.targetStorageId || null,
          customerId: dto.customerId || null,
          supplierId: dto.supplierId || null,
          shareholderId: dto.shareholderId || null,
          employeeId: dto.employeeId || null,
          expenseCategoryId: dto.expenseCategoryId || null,
          resultCenterId: dto.resultCenterId || null,
          accountingPeriodId: accountingPeriod.id,
          subtotal: dto.subtotal,
          taxAmount: dto.taxAmount,
          discountAmount: dto.discountAmount,
          total: dto.total,
          paymentMethod: dto.paymentMethod,
          paymentStatus: dto.paymentStatus,
          bankAccountKey: dto.bankAccountKey || null,
          cashHubId: dto.cashHubId || null,
          documentType: dto.documentType || null,
          documentFolio: dto.documentFolio || null,
          paymentDueDate: dto.paymentDueDate
            ? new Date(dto.paymentDueDate)
            : null,
          amountPaid: dto.amountPaid,
          changeAmount: dto.changeAmount || null,
          relatedTransactionId: dto.relatedTransactionId || null,
          externalReference: dto.externalReference || null,
          notes: dto.notes || null,
          metadata: dto.metadata || {},
        };

        const saveRepository = manager.getRepository(Transaction);
        const savedTx: Transaction = await saveRepository.save(transactionData);

        this.logger.log(
          `Transaction created: ${savedTx.id} (${savedTx.documentNumber}) ` +
            `type: ${savedTx.transactionType}`,
        );

        // Crear líneas de transacción si existen
        if (dto.lines && dto.lines.length > 0) {
          const lineRepo = manager.getRepository(TransactionLine);
          const lineEntities = dto.lines.map((line, index) =>
            lineRepo.create({
              transactionId: savedTx.id,
              companyId,
              productId: line.productId,
              productVariantId: line.productVariantId,
              unitId: line.unitId,
              taxId: line.taxId,
              lineNumber: index + 1,
              productName: line.productName,
              productSku: line.productSku,
              variantName: line.variantName,
              quantity: line.quantity,
              quantityInBase: (line as any).quantityInBase ?? null,
              unitOfMeasure: (line as any).unitOfMeasure ?? null,
              unitConversionFactor: (line as any).unitConversionFactor ?? null,
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

        // Actualizar saldo de crédito del cliente cuando la venta usa crédito interno
        if (
          savedTx.transactionType === TransactionType.SALE &&
          savedTx.customerId
        ) {
          const snapshots = getPaymentSnapshots(savedTx);
          const internalCreditAmount = snapshots
            .filter(
              (s) =>
                String(s.method).toUpperCase() ===
                  PaymentMethod.INTERNAL_CREDIT ||
                String(s.method).toUpperCase() === 'CREDIT',
            )
            .reduce((sum, s) => sum + Number(s.amount || 0), 0);

          if (internalCreditAmount > 0) {
            const customerRepo = manager.getRepository(Customer);
            await customerRepo.increment(
              { id: savedTx.customerId },
              'currentBalance',
              internalCreditAmount,
            );
          }
        }

        return savedTx;
      } catch (error) {
        this.logger.error(
          `Error creating transaction: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    });

    this.eventBus.publish(new TransactionCreatedEvent(savedTx, companyId));

    return savedTx;
  }

  private async assertSupplierPaymentParent(
    dto: CreateTransactionDto,
  ): Promise<void> {
    const parent = await this.transactionsRepository.findOne({
      where: { id: dto.relatedTransactionId! },
    });
    if (!parent) {
      throw new BadRequestException(
        'SUPPLIER_PAYMENT: relatedTransactionId no existe',
      );
    }
    const allowed: TransactionType[] = [
      TransactionType.PURCHASE,
      TransactionType.SUPPLIER_INVOICE,
      TransactionType.SUPPLIER_RECEIPT,
      TransactionType.SUPPLIER_HONORARIUM_RECEIPT,
    ];
    if (!allowed.includes(parent.transactionType)) {
      throw new BadRequestException(
        `SUPPLIER_PAYMENT: documento origen inválido (${parent.transactionType})`,
      );
    }
    if (
      parent.supplierId &&
      dto.supplierId &&
      parent.supplierId !== dto.supplierId
    ) {
      throw new BadRequestException(
        'SUPPLIER_PAYMENT: supplierId no coincide con el documento origen',
      );
    }
  }

  private async assertExpensePaymentParent(
    dto: CreateTransactionDto,
  ): Promise<void> {
    const parent = await this.transactionsRepository.findOne({
      where: { id: dto.relatedTransactionId! },
    });
    if (!parent) {
      throw new BadRequestException(
        'EXPENSE_PAYMENT: relatedTransactionId no existe',
      );
    }
    if (parent.transactionType !== TransactionType.OPERATING_EXPENSE) {
      throw new BadRequestException(
        `EXPENSE_PAYMENT: el origen debe ser OPERATING_EXPENSE (actual: ${parent.transactionType})`,
      );
    }
    if (
      dto.expenseCategoryId &&
      parent.expenseCategoryId &&
      parent.expenseCategoryId !== dto.expenseCategoryId
    ) {
      throw new BadRequestException(
        'EXPENSE_PAYMENT: expenseCategoryId no coincide con el gasto origen',
      );
    }
  }

  private async assertPayrollPaymentParent(
    dto: CreateTransactionDto,
  ): Promise<void> {
    const parent = await this.transactionsRepository.findOne({
      where: { id: dto.relatedTransactionId! },
    });
    if (!parent) {
      throw new BadRequestException(
        'PAYROLL_PAYMENT: relatedTransactionId no existe',
      );
    }
    if (parent.transactionType !== TransactionType.PAYROLL) {
      throw new BadRequestException(
        `PAYROLL_PAYMENT: el origen debe ser PAYROLL (actual: ${parent.transactionType})`,
      );
    }
  }
}
