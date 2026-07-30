import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Installment,
  InstallmentStatus,
  InstallmentSourceType,
} from '@modules/installments/domain/installment.entity';
import { InstallmentRepository } from '@modules/installments/infrastructure/installment.repository';
import { CreateInstallmentDto } from '@modules/installments/presentation/dto/create-installment.dto';
import { PayInstallmentDto } from '@modules/installments/presentation/dto/pay-installment.dto';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import {
  PaymentMethod,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  AccountsReceivableListFilters,
  AccountsReceivableRowDto,
} from '../dto/accounts-receivable-row.dto';
import { mapInstallmentToAccountsReceivableRow } from '../helpers/map-accounts-receivable-row';

@Injectable()
export class InstallmentService {
  constructor(
    private readonly repo: InstallmentRepository,
    private readonly transactionsService: TransactionsService,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
  ) {}

  async getInstallmentsForSale(
    saleTransactionId: string,
  ): Promise<Installment[]> {
    return this.repo.getInstallmentsByTransaction(saleTransactionId);
  }

  async createInstallmentsFromSchedule(
    transactionId: string,
    schedule: Array<{ amount: number; dueDate: string | Date }>,
    options: {
      sourceType: InstallmentSourceType;
      payeeType: string;
      payeeId?: string;
      companyId: string;
    },
  ): Promise<Installment[]> {
    const totalInstallments = schedule.length;
    const installments: Installment[] = [];

    for (let i = 0; i < schedule.length; i += 1) {
      const item = schedule[i];
      const dueDate =
        item.dueDate instanceof Date ? item.dueDate : new Date(item.dueDate);

      const installment = this.repo.create({
        companyId: options.companyId,
        sourceType: options.sourceType,
        sourceTransactionId: transactionId,
        saleTransactionId:
          options.sourceType === InstallmentSourceType.SALE
            ? transactionId
            : undefined,
        payeeType: options.payeeType,
        payeeId: options.payeeId,
        installmentNumber: i + 1,
        totalInstallments,
        amount: Number(item.amount || 0),
        dueDate,
        status: InstallmentStatus.PENDING,
        amountPaid: 0,
        metadata: {
          installmentNumber: i + 1,
          totalInstallments,
        },
      });

      const saved = await this.repo.save(installment);
      installments.push(saved);
    }

    return installments;
  }

  private resolvePaymentTransactionType(
    sourceType: InstallmentSourceType,
  ): TransactionType {
    switch (sourceType) {
      case InstallmentSourceType.SALE:
        return TransactionType.PAYMENT_IN;
      case InstallmentSourceType.PURCHASE:
        return TransactionType.SUPPLIER_PAYMENT;
      case InstallmentSourceType.OPERATING_EXPENSE:
        return TransactionType.EXPENSE_PAYMENT;
      case InstallmentSourceType.PAYROLL:
        return TransactionType.PAYMENT_EXECUTION;
      default:
        throw new BadRequestException(
          `InstallmentSourceType no soportado para tipo de pago: ${sourceType}`,
        );
    }
  }

  /**
   * Crear cuotas automáticamente cuando se crea una SALE/PURCHASE a plazo
   *
   * @example
   * // SALE $300,000 con 3 cuotas mensuales
   * await this.createInstallmentsForTransaction(
   *     'sale-123',
   *     300000,
   *     3,
   *     new Date('2026-03-22'), // Fecha de vencimiento primera cuota
   *     'SALE' // Tipo de transacción origen
   * );
   */
  async createFromTransactionMetadata(
    transaction: Pick<
      Transaction,
      | 'id'
      | 'total'
      | 'customerId'
      | 'supplierId'
      | 'transactionType'
      | 'metadata'
    >,
    companyId: string,
  ): Promise<Installment[]> {
    const metadata = (transaction.metadata as Record<string, unknown>) ?? {};
    const numberOfInstallments = Number(metadata.numberOfInstallments ?? 0);
    if (!Number.isFinite(numberOfInstallments) || numberOfInstallments < 1) {
      return [];
    }
    if (!metadata.firstDueDate) {
      return [];
    }

    const existing = await this.repo.getInstallmentsByTransaction(transaction.id);
    if (existing.length > 0) {
      return existing;
    }

    const sourceType =
      transaction.transactionType === TransactionType.SALE
        ? InstallmentSourceType.SALE
        : transaction.transactionType === TransactionType.PURCHASE
          ? InstallmentSourceType.PURCHASE
          : null;
    if (!sourceType) {
      return [];
    }

    const payeeType =
      sourceType === InstallmentSourceType.SALE ? 'CUSTOMER' : 'SUPPLIER';
    const payeeId =
      sourceType === InstallmentSourceType.SALE
        ? transaction.customerId || String(metadata.customerId ?? '')
        : transaction.supplierId || String(metadata.supplierId ?? '');

    const paymentSchedule = metadata.paymentSchedule;
    if (Array.isArray(paymentSchedule) && paymentSchedule.length > 0) {
      return this.createInstallmentsFromSchedule(
        transaction.id,
        paymentSchedule.map((payment) => {
          const row = payment as Record<string, unknown>;
          return {
            amount: Number(row.amount ?? 0),
            dueDate: String(row.dueDate ?? metadata.firstDueDate),
          };
        }),
        {
          sourceType,
          payeeType,
          payeeId: payeeId || undefined,
          companyId,
        },
      );
    }

    return this.createInstallmentsForTransaction(
      transaction.id,
      parseFloat(String(transaction.total)),
      numberOfInstallments,
      new Date(String(metadata.firstDueDate)),
      sourceType,
      {
        companyId,
        payeeType,
        payeeId: payeeId || undefined,
      },
    );
  }

  async createInstallmentsForTransaction(
    transactionId: string,
    totalAmount: number,
    numberOfInstallments: number,
    firstDueDate: Date,
    sourceType?: InstallmentSourceType,
    options?: {
      companyId?: string;
      payeeType?: string;
      payeeId?: string;
    },
  ): Promise<Installment[]> {
    const amountPerInstallment = totalAmount / numberOfInstallments;
    const installments: Installment[] = [];

    // Determinar sourceType (default SALE para compatibilidad)
    const type = sourceType || InstallmentSourceType.SALE;

    for (let i = 1; i <= numberOfInstallments; i++) {
      const dueDate = new Date(firstDueDate);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));

      const installment = this.repo.create({
        companyId: options?.companyId,
        sourceType: type,
        sourceTransactionId: transactionId,
        payeeType: options?.payeeType,
        payeeId: options?.payeeId,
        installmentNumber: i,
        totalInstallments: numberOfInstallments,
        amount: amountPerInstallment,
        dueDate,
        status: InstallmentStatus.PENDING,
        amountPaid: 0,
        // Para compatibilidad con código legacy de SALE
        saleTransactionId:
          type === InstallmentSourceType.SALE ? transactionId : undefined,
      });

      const saved = await this.repo.save(installment);
      installments.push(saved);
    }

    return installments;
  }

  /**
   * Crear una cuota única para PAYROLL, OPERATING_EXPENSE, etc.
   *
   * @example
   * // PAYROLL $800,000 para empleado
   * await this.createSingleInstallment(
   *     'payroll-456',
   *     800000,
   *     new Date('2026-03-01'), // Fecha de pago
   *     {
   *         sourceType: 'PAYROLL',
   *         payeeType: 'EMPLOYEE',
   *         payeeId: 'emp-123',
   *         metadata: { employeeName: 'Juan Pérez', period: '2026-02' }
   *     }
   * );
   */
  async createSingleInstallment(
    transactionId: string,
    amount: number,
    dueDate: Date,
    options: {
      sourceType: InstallmentSourceType;
      payeeType: string;
      payeeId?: string;
      companyId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<Installment> {
    const installment = this.repo.create({
      companyId: options.companyId,
      sourceType: options.sourceType,
      sourceTransactionId: transactionId,
      payeeType: options.payeeType,
      payeeId: options.payeeId,
      installmentNumber: 1,
      totalInstallments: 1,
      amount,
      dueDate,
      status: InstallmentStatus.PENDING,
      amountPaid: 0,
      metadata: options.metadata,
      // Para compatibilidad con código legacy de SALE
      saleTransactionId:
        options.sourceType === InstallmentSourceType.SALE
          ? transactionId
          : undefined,
    });

    const saved = await this.repo.save(installment);
    return saved;
  }

  /**
   * Actualizar cuota cuando se registra un pago (PAYMENT_IN/SUPPLIER_PAYMENT)
   */
  async updateInstallmentFromPayment(
    installmentId: string,
    paymentAmount: number,
    paymentTransactionId: string,
  ): Promise<Installment> {
    const installment = await this.repo.findOneBy({ id: installmentId });

    if (!installment) {
      throw new Error('Installment not found');
    }

    installment.amountPaid =
      parseFloat(installment.amountPaid.toString()) + paymentAmount;
    installment.paymentTransactionId = paymentTransactionId;

    // Recalcular estado
    if (installment.amountPaid >= parseFloat(installment.amount.toString())) {
      installment.status = InstallmentStatus.PAID;
    } else if (parseFloat(installment.amountPaid.toString()) > 0) {
      installment.status = InstallmentStatus.PARTIAL;
    }

    // Marcar como OVERDUE si está vencida y no pagada
    if (
      installment.isOverdue() &&
      installment.status === InstallmentStatus.PENDING
    ) {
      installment.status = InstallmentStatus.OVERDUE;
    }

    return this.repo.save(installment);
  }

  /**
   * Obtener cuotas de una transacción
   */
  async getInstallmentsByTransaction(
    transactionId: string,
  ): Promise<Installment[]> {
    return this.repo.getInstallmentsByTransaction(transactionId);
  }

  /**
   * Obtener estado de cartera de una transacción
   */
  async getTransactionCarteraStatus(transactionId: string) {
    return this.repo.getTransactionCarteraStatus(transactionId);
  }

  /**
   * Reporte: Cartera por Vencer
   */
  async getCarteraByDueDate(
    fromDate: Date,
    toDate: Date,
  ): Promise<
    {
      dueDate: Date;
      totalAmount: number;
      totalPaid: number;
      pendingAmount: number;
      installmentsCount: number;
    }[]
  > {
    const installments = await this.repo.getCarteraByDueDate(fromDate, toDate);

    const grouped = installments.reduce(
      (acc, inst) => {
        const key = inst.dueDate.toISOString().split('T')[0];
        if (!acc[key]) {
          acc[key] = {
            dueDate: inst.dueDate,
            totalAmount: 0,
            totalPaid: 0,
            pendingAmount: 0,
            installmentsCount: 0,
          };
        }
        acc[key].totalAmount += parseFloat(inst.amount.toString());
        acc[key].totalPaid += parseFloat(inst.amountPaid.toString());
        acc[key].pendingAmount += inst.getPendingAmount();
        acc[key].installmentsCount++;
        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.values(grouped);
  }

  /**
   * Reporte: Morosidad
   */
  async getOverdueReport(today: Date = new Date()) {
    return this.repo.getOverdueSummary(today);
  }

  /**
   * Obtener todas las cuentas por pagar (CENTRALIZED ACCOUNTS PAYABLE)
   * Incluye: Receptions (PURCHASE), Payroll, Operating Expenses
   *
   * @param filters - Filtros opcionales
   * @returns Lista de obligaciones de pago pendientes y atrasadas
   */
  async getAccountsPayable(filters?: {
    sourceType?: InstallmentSourceType | InstallmentSourceType[]; // Filtrar por tipo: PURCHASE, PAYROLL, OPERATING_EXPENSE
    status?: InstallmentStatus | InstallmentStatus[]; // Filtrar por estado: PENDING, PARTIAL, OVERDUE
    payeeType?: string; // Filtrar por tipo de beneficiario: SUPPLIER, EMPLOYEE
    fromDate?: Date; // Fecha de vencimiento desde
    toDate?: Date; // Fecha de vencimiento hasta
  }) {
    const queryBuilder = this.repo.createQueryBuilder('installment');

    // Join con transaction para obtener detalles
    queryBuilder.leftJoinAndSelect(
      'installment.saleTransaction',
      'transaction',
    );
    queryBuilder.leftJoinAndMapOne(
      'installment.sourceTransaction',
      Transaction,
      'sourceTransaction',
      'sourceTransaction.id = installment.sourceTransactionId',
    );
    queryBuilder.leftJoinAndSelect(
      'installment.paymentTransaction',
      'paymentTransaction',
    );
    queryBuilder.leftJoinAndSelect(
      'sourceTransaction.supplier',
      'sourceSupplier',
    );
    queryBuilder.leftJoinAndSelect(
      'sourceSupplier.person',
      'sourceSupplierPerson',
    );

    // Filtro por sourceType (ej: solo PURCHASE y PAYROLL)
    if (filters?.sourceType) {
      const sourceTypes = Array.isArray(filters.sourceType)
        ? filters.sourceType
        : [filters.sourceType];
      queryBuilder.andWhere('installment.sourceType IN (:...sourceTypes)', {
        sourceTypes,
      });
    } else {
      // Por defecto, excluir SALE (cuentas por cobrar) para mostrar solo cuentas por pagar
      queryBuilder.andWhere('installment.sourceType != :saleType', {
        saleType: InstallmentSourceType.SALE,
      });
    }

    // Filtro por status (default: PENDING, PARTIAL, OVERDUE - excluir PAID)
    if (filters?.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      queryBuilder.andWhere('installment.status IN (:...statuses)', {
        statuses,
      });
    } else {
      queryBuilder.andWhere('installment.status IN (:...defaultStatuses)', {
        defaultStatuses: [
          InstallmentStatus.PENDING,
          InstallmentStatus.PARTIAL,
          InstallmentStatus.OVERDUE,
        ],
      });
    }

    // Filtro por payeeType
    if (filters?.payeeType) {
      queryBuilder.andWhere('installment.payeeType = :payeeType', {
        payeeType: filters.payeeType,
      });
    }

    // Filtro por rango de fechas de vencimiento
    if (filters?.fromDate) {
      queryBuilder.andWhere('installment.dueDate >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }
    if (filters?.toDate) {
      queryBuilder.andWhere('installment.dueDate <= :toDate', {
        toDate: filters.toDate,
      });
    }

    // Ordenar por pagos recientes (nulls al final), luego por vencimiento descendente
    queryBuilder.orderBy('paymentTransaction.createdAt IS NULL', 'ASC');
    queryBuilder.addOrderBy('paymentTransaction.createdAt', 'DESC');
    queryBuilder.addOrderBy('installment.dueDate', 'DESC');

    return queryBuilder.getMany();
  }

  /**
   * Obtener cuentas por cobrar (SALE)
   */
  async getAccountsReceivable(filters?: AccountsReceivableListFilters): Promise<{
    rows: AccountsReceivableRowDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(Number(filters?.page ?? 1), 1);
    const pageSize = Math.min(
      Math.max(Number(filters?.pageSize ?? 50), 1),
      200,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const queryBuilder = this.repo.createQueryBuilder('installment');

    queryBuilder
      .leftJoinAndSelect('installment.saleTransaction', 'transaction')
      .leftJoinAndSelect('transaction.customer', 'customer')
      .leftJoinAndSelect('customer.person', 'person');

    queryBuilder.andWhere('installment.sourceType = :saleType', {
      saleType: InstallmentSourceType.SALE,
    });

    if (filters?.companyId) {
      queryBuilder.andWhere('installment.companyId = :companyId', {
        companyId: filters.companyId,
      });
    }

    if (filters?.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      queryBuilder.andWhere('installment.status IN (:...statuses)', {
        statuses,
      });
    } else if (!filters?.includePaid) {
      queryBuilder.andWhere('installment.status IN (:...defaultStatuses)', {
        defaultStatuses: [
          InstallmentStatus.PENDING,
          InstallmentStatus.PARTIAL,
          InstallmentStatus.OVERDUE,
        ],
      });
    }

    if (filters?.overdueOnly) {
      queryBuilder.andWhere('installment.dueDate < :today', {
        today: today.toISOString().split('T')[0],
      });
      queryBuilder.andWhere('installment.status IN (:...openStatuses)', {
        openStatuses: [
          InstallmentStatus.PENDING,
          InstallmentStatus.PARTIAL,
          InstallmentStatus.OVERDUE,
        ],
      });
    }

    if (filters?.customerId) {
      // payeeId is varchar; transaction.customerId is uuid. Reusing the same
      // bind param makes Postgres type the value as uuid and fail the varchar compare.
      queryBuilder.andWhere(
        '(transaction.customerId = :arCustomerId OR (installment.payeeType = :customerPayeeType AND installment.payeeId = :arCustomerIdText))',
        {
          arCustomerId: filters.customerId,
          arCustomerIdText: String(filters.customerId),
          customerPayeeType: 'CUSTOMER',
        },
      );
    }

    if (filters?.search) {
      const search = `%${filters.search.trim()}%`;
      queryBuilder.andWhere(
        '(transaction.documentNumber LIKE :search OR person.businessName LIKE :search OR person.firstName LIKE :search OR person.lastName LIKE :search)',
        { search },
      );
    }

    if (filters?.fromDate) {
      queryBuilder.andWhere('installment.dueDate >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }
    if (filters?.toDate) {
      queryBuilder.andWhere('installment.dueDate <= :toDate', {
        toDate: filters.toDate,
      });
    }

    queryBuilder.orderBy('installment.dueDate', 'ASC');
    queryBuilder.skip((page - 1) * pageSize).take(pageSize);

    const [rawRows, total] = await queryBuilder.getManyAndCount();
    const rows = rawRows.map((inst) =>
      mapInstallmentToAccountsReceivableRow(inst, today),
    );
    return { rows, total, page, pageSize };
  }

  /**
   * Obtener una cuota por ID
   */
  async getInstallmentById(id: string): Promise<Installment | null> {
    return this.repo.findOneBy({ id });
  }

  /**
   * Contexto para registrar pago directo de una cuota
   */
  async getPaymentContext(installmentId: string) {
    const installment = await this.repo.findOneBy({ id: installmentId });
    if (!installment) {
      throw new NotFoundException('Installment not found');
    }

    const sourceTransaction = await this.transactionsRepository.findOne({
      where: { id: installment.sourceTransactionId },
      relations: {
        supplier: { person: true },
        employee: { person: true },
        customer: { person: true },
        branch: { company: true },
      },
    });

    if (!sourceTransaction) {
      throw new NotFoundException('Source transaction not found');
    }

    const supplierPerson = sourceTransaction.supplier?.person;
    const employeePerson = sourceTransaction.employee?.person;
    const customerPerson = sourceTransaction.customer?.person;

    const customerName =
      (customerPerson?.businessName ?? '').trim() ||
      [customerPerson?.firstName, customerPerson?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      null;

    const payeeName =
      installment.sourceType === InstallmentSourceType.SALE
        ? customerName
        : sourceTransaction.supplier?.alias ||
          supplierPerson?.businessName ||
          [supplierPerson?.firstName, supplierPerson?.lastName]
            .filter(Boolean)
            .join(' ')
            .trim() ||
          [employeePerson?.firstName, employeePerson?.lastName]
            .filter(Boolean)
            .join(' ')
            .trim() ||
          installment.metadata?.supplierName ||
          installment.metadata?.employeeName ||
          null;

    const payeeAccounts =
      installment.sourceType === InstallmentSourceType.SALE
        ? customerPerson?.bankAccounts || []
        : supplierPerson?.bankAccounts || employeePerson?.bankAccounts || [];
    const companyAccounts =
      sourceTransaction.branch?.company?.bankAccounts ?? [];

    return {
      payment: {
        id: installment.id,
        documentNumber: sourceTransaction.documentNumber ?? '-',
        customerId:
          sourceTransaction.customerId ?? installment.payeeId ?? null,
        customerName: payeeName,
        supplierName: payeeName,
        total: Number(installment.amount),
        pendingAmount: installment.getPendingAmount(),
        paymentMethod: sourceTransaction.paymentMethod ?? null,
        dueDate:
          installment.dueDate instanceof Date
            ? installment.dueDate.toISOString().split('T')[0]
            : String(installment.dueDate ?? ''),
        installmentNumber: installment.installmentNumber,
        totalInstallments: installment.totalInstallments,
      },
      supplierAccounts: payeeAccounts,
      companyAccounts,
    };
  }

  /**
   * Registrar pago directo de una cuota
   */
  async payInstallment(installmentId: string, dto: PayInstallmentDto) {
    const installment = await this.repo.findOneBy({ id: installmentId });
    if (!installment) {
      throw new NotFoundException('Installment not found');
    }

    const pendingAmount = installment.getPendingAmount();
    const amount = dto.amount ?? pendingAmount;

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Monto de pago inválido');
    }

    if (amount > pendingAmount) {
      throw new BadRequestException('El monto supera el saldo pendiente');
    }

    const sourceTransaction = await this.transactionsRepository.findOne({
      where: { id: installment.sourceTransactionId },
      relations: {
        supplier: true,
        employee: true,
        branch: true,
      },
    });

    if (!sourceTransaction) {
      throw new NotFoundException('Source transaction not found');
    }

    if (!sourceTransaction.branchId) {
      throw new BadRequestException(
        'No se pudo determinar la sucursal para el pago',
      );
    }

    if (!sourceTransaction.userId) {
      throw new BadRequestException(
        'No se pudo determinar el usuario para el pago',
      );
    }

    if (
      dto.paymentMethod === PaymentMethod.TRANSFER &&
      !dto.companyAccountKey
    ) {
      throw new BadRequestException(
        'Debe seleccionar la cuenta bancaria de la compañía',
      );
    }

    const cashHubId = dto.cashHubId?.trim() || undefined;
    if (
      dto.paymentMethod === PaymentMethod.CASH &&
      installment.sourceType === InstallmentSourceType.SALE &&
      !cashHubId
    ) {
      throw new BadRequestException(
        'Debe seleccionar el centro de acopio de efectivo',
      );
    }

    const transactionType = this.resolvePaymentTransactionType(
      installment.sourceType,
    );
    const createDto = new CreateTransactionDto();
    createDto.transactionType = transactionType;
    createDto.branchId = sourceTransaction.branchId;
    createDto.userId = sourceTransaction.userId;
    createDto.subtotal = amount;
    createDto.taxAmount = 0;
    createDto.discountAmount = 0;
    createDto.total = amount;
    createDto.amountPaid = amount;
    createDto.paymentMethod = dto.paymentMethod;
    createDto.relatedTransactionId = installment.sourceTransactionId;
    createDto.bankAccountKey = dto.companyAccountKey || undefined;
    if (cashHubId) {
      createDto.cashHubId = cashHubId;
    }
    createDto.notes = dto.note || undefined;
    createDto.metadata = {
      paidQuotaId: installment.id,
      sourceType: installment.sourceType,
      payeeType: installment.payeeType,
    };

    if (transactionType === TransactionType.PAYMENT_IN) {
      createDto.customerId =
        sourceTransaction.customerId || installment.payeeId || undefined;
      if (!createDto.customerId) {
        throw new BadRequestException(
          'No se pudo determinar el cliente del cobro',
        );
      }
    }

    if (transactionType === TransactionType.SUPPLIER_PAYMENT) {
      createDto.supplierId =
        sourceTransaction.supplierId || installment.payeeId || undefined;
      if (!createDto.supplierId) {
        throw new BadRequestException(
          'No se pudo determinar el proveedor del pago',
        );
      }
    }

    if (transactionType === TransactionType.EXPENSE_PAYMENT) {
      createDto.expenseCategoryId =
        sourceTransaction.expenseCategoryId || undefined;
      if (!createDto.expenseCategoryId) {
        throw new BadRequestException(
          'No se pudo determinar la categoría del gasto',
        );
      }
    }

    if (transactionType === TransactionType.PAYMENT_EXECUTION) {
      createDto.employeeId =
        sourceTransaction.employeeId || installment.payeeId || undefined;
    }

    const transaction =
      await this.transactionsService.createTransaction(createDto);

    return {
      success: true,
      transaction,
    };
  }

  /**
   * Validar si cuota puede recibir una transacción de pago
   */
  async validatePayment(
    installmentId: string,
    paymentAmount: number,
  ): Promise<boolean> {
    const installment = await this.getInstallmentById(installmentId);

    if (!installment) {
      throw new Error('Installment not found');
    }

    const pendingAmount = installment.getPendingAmount();

    if (paymentAmount > pendingAmount) {
      throw new Error(
        `Payment amount ${paymentAmount} exceeds pending amount ${pendingAmount}`,
      );
    }

    return true;
  }
}
