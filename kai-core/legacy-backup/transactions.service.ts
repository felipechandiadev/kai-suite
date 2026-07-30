
import { Injectable, BadRequestException, Logger, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { PaymentMethod, Transaction, TransactionStatus, TransactionType } from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { SearchTransactionsDto } from './dto/search-transactions.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { LedgerEntriesService } from '@modules/ledger-entries/application/ledger-entries.service';
import { TransactionCreatedEvent } from '@shared/events/transaction-created.event';
import { DOCUMENT_PREFIXES } from '@shared/enums/document-prefixes';
import { AccountingPeriodsService } from '@modules/accounting-periods/application/accounting-periods.service';
import { CacheService } from '@shared/cache/cache.service';

// ...resto del código...

@Injectable()
export class TransactionsService {
  private logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerEntriesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly accountingPeriodsService: AccountingPeriodsService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Devuelve el total de ventas (SALE) para una sesión de caja
   */
  async getTotalSalesForSession(cashSessionId: string): Promise<number> {
    const sales = await this.transactionsRepository.find({
      where: { cashSessionId, transactionType: TransactionType.SALE },
    });
    return sales.reduce((sum, tx) => sum + Number(tx.total || 0), 0);
  }

  /**
   * Devuelve todas las transacciones asociadas a una sesión de caja con
   * información resumida utilizada por el dashboard/movements UI.
   */
  async getMovementsForSession(cashSessionId: string) {
    const txs = await this.transactionsRepository.find({
      where: { cashSessionId },
      relations: ['user', 'user.person'],
      order: { createdAt: 'ASC' },
    });

    return txs.map(tx => {
      const userFullName = tx.user?.person ?
        `${tx.user.person.firstName} ${tx.user.person.lastName}` : null;
      const userUserName = tx.user?.userName || null;

      return {
        id: tx.id,
        transactionType: tx.transactionType,
        documentNumber: tx.documentNumber,
        createdAt: tx.createdAt,
        total: Number(tx.total || 0),
        paymentMethod: tx.paymentMethod,
        paymentMethodLabel: undefined, // frontend can translate
        userId: tx.userId || null,
        userFullName,
        userUserName,
        notes: tx.notes || null,
        reason: tx.metadata?.reason || null,
        metadata: tx.metadata || null,
        direction: this.computeDirection(tx),
      };
    });
  }

  /**
   * Determina la dirección del movimiento en caja según el tipo de transacción.
   */
  private computeDirection(tx: Transaction): 'IN' | 'OUT' | 'NEUTRAL' {
    switch (tx.transactionType) {
      case TransactionType.CASH_SESSION_OPENING:
        return 'NEUTRAL';
      case TransactionType.SALE:
      case TransactionType.CASH_SESSION_DEPOSIT:
      case TransactionType.PAYMENT_IN:
        return 'IN';
      case TransactionType.CASH_SESSION_WITHDRAWAL:
      case TransactionType.OPERATING_EXPENSE:
      case TransactionType.PAYMENT_OUT:
      case TransactionType.CASH_DEPOSIT:
        return 'OUT';
      default:
        return 'NEUTRAL';
    }
  }

  /**
   * ENTRADA CENTRAL: Crear transacción con validaciones
   * 
   * NUEVO FLUJO (con eventos + períodos automáticos):
   * 0. ASEGURAR período contable (apertura automática)
   * 1. Validar DTO
   * 2. Generar documentNumber único
   * 3. Crear Transaction
   * 4. Guardar en BD
   * 5. EMITIR evento 'transaction.created'
   * 6. El listener (AccountingEngineListener) escucha y dispara motor contable
   * 7. Retornar transacción creada
   * 
   * Beneficios:
   * - Desacoplamiento: TransactionsService NO conoce detalles del motor contable
   * - Escalabilidad: Otros listeners pueden suscribirse al mismo evento
   * - Testing: Fácil de testear sin ejecutar motor contable
   * - Resiliencia: Si falla motor contable, la transacción ya existe en BD
   * - Apertura automática: Períodos se crean automáticamente, cierre manual
   */
  async createTransaction(dto: CreateTransactionDto): Promise<Transaction> {
    // Paso 1: Validar DTO
    const validationErrors = dto.validate();
    if (validationErrors.length > 0) {
      throw new BadRequestException(`Validación fallida: ${validationErrors.join('; ')}`);
    }

    // Paso Pre-transacción: Obtener branch y companyId fuera de la transacción
    // Esto evita locks largos dentro de la transacción
    const branch = await this.branchRepository.findOne({
      where: { id: dto.branchId },
    });

    if (!branch || !branch.companyId) {
      throw new BadRequestException(
        `Branch ${dto.branchId} not found or has no company. Cannot generate ledger entries.`,
      );
    }

    const companyId = branch.companyId;

    // Paso 0: ASEGURAR período contable (APERTURA AUTOMÁTICA)
    // - Si no existe período para la fecha de transacción → Crea automáticamente
    // - Si existe pero está CERRADO → Lanza error 403
    // - Si existe y está ABIERTO → Continúa
    // Usa la fecha actual como fecha de transacción (esto se puede mejorar con dto.transactionDate)
    const transactionDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const accountingPeriod = await this.accountingPeriodsService.ensurePeriod(
      transactionDate,
      companyId,
    );

    this.logger.log(
      `Transaction will use accounting period: ${accountingPeriod.name} ` +
      `(${accountingPeriod.id}) - Status: ${accountingPeriod.status}`,
    );

  // Usar transacción DB para ATOMICIDAD: si algo falla, rollback completo
    return this.dataSource.transaction(async (manager) => {
      try {
        // Paso 2: Generar documentNumber único
        const documentNumber = await this.generateDocumentNumber(dto.branchId, dto.transactionType);

        // Paso 3-4: Crear y guardar Transaction en BD
        const transactionData: any = {
          documentNumber,
          transactionType: dto.transactionType,
          status: TransactionStatus.CONFIRMED,
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
          accountingPeriodId: accountingPeriod.id, // Auto-assigned from ensurePeriod()
          subtotal: dto.subtotal,
          taxAmount: dto.taxAmount,
          discountAmount: dto.discountAmount,
          total: dto.total,
          paymentMethod: dto.paymentMethod,
          paymentStatus: dto.paymentStatus,
          bankAccountKey: dto.bankAccountKey || null,
          documentType: dto.documentType || null,
          documentFolio: dto.documentFolio || null,
          paymentDueDate: dto.paymentDueDate ? new Date(dto.paymentDueDate) : null,
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
          `Transaction created: ${savedTx.id} (${savedTx.documentNumber}) `+
          `type: ${savedTx.transactionType}`,
        );

              if (dto.lines && dto.lines.length > 0) {
                const lineRepo = manager.getRepository(TransactionLine);
                const lineEntities = dto.lines.map((line, index) => lineRepo.create({
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
                  // sanitize taxRate:
                  // 1. coerce to number
                  // 2. if rate is ridiculously large (>100) assume value was expressed
                  //    in basis points or already multiplied by 100 and scale back
                  // 3. clamp to [0,100]
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
                }));
                await lineRepo.save(lineEntities);
              }

              // Actualizar saldo de crédito del cliente cuando la venta usa crédito interno
              if (savedTx.transactionType === TransactionType.SALE && savedTx.customerId) {
                const paymentDetails = Array.isArray(savedTx.metadata?.paymentDetails)
                  ? savedTx.metadata?.paymentDetails
                  : [];

                let internalCreditAmount = paymentDetails
                  .filter((p: any) => p?.paymentMethod === PaymentMethod.INTERNAL_CREDIT)
                  .reduce((sum: number, p: any) => sum + Number(p?.amount || 0), 0);

                if (internalCreditAmount <= 0 && savedTx.paymentMethod === PaymentMethod.INTERNAL_CREDIT) {
                  internalCreditAmount = Number(savedTx.total || 0);
                }

                if (internalCreditAmount > 0) {
                  const customerRepo = manager.getRepository(Customer);
                  const customer = await customerRepo.findOne({ where: { id: savedTx.customerId } });
                  if (customer) {
                    const currentBalance = Number(customer.currentBalance || 0);
                    customer.currentBalance = currentBalance + internalCreditAmount;
                    await customerRepo.save(customer);
                  }
                }
              }
        // Paso 5: EMITIR evento para que listeners reaccionen
        // El motor contable se ejecutará automáticamente vía AccountingEngineListener
        this.eventEmitter.emit(
          'transaction.created',
          new TransactionCreatedEvent(savedTx, companyId),
        );

        this.logger.log(
          `Event emitted: 'transaction.created' for transaction ${savedTx.id}. ` +
          `Accounting engine will process automatically.`,
        );

        // Paso 7: Retornar transacción
        return savedTx;
      } catch (error) {
        this.logger.error(`Error creating transaction: ${(error as Error).message}`);
        // Transaction se revierte automáticamente por dataSource.transaction()
        throw error;
      }
    });
  }

  /**
   * Generar número de documento único por sucursal y tipo
   * Correlativo único para auditoría y trazabilidad
   * Utiliza prefijos en español definidos en DOCUMENT_PREFIXES
   */
  private async generateDocumentNumber(branchId: string, txType: TransactionType): Promise<string> {
    // TODO: Implementar correlativo único por branch + type
    // Por ahora: timestamp + random (será reemplazado por correlativo real)
    const prefix = DOCUMENT_PREFIXES[txType];
    const branchCode = branchId.substring(0, 8).toUpperCase();
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${branchCode}-${timestamp}-${random}`;
  }

  async search(dto: SearchTransactionsDto) {
    const page = Math.max(Number(dto.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(dto.limit ?? 25), 1), 200);

    const qb = this.transactionsRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.branch', 'branch')
      .leftJoinAndSelect('t.pointOfSale', 'pointOfSale')
      .leftJoinAndSelect('t.cashSession', 'cashSession')
      .leftJoinAndSelect('t.customer', 'customer')
      .leftJoinAndSelect('customer.person', 'customerPerson')
      .leftJoinAndSelect('t.supplier', 'supplier')
      .leftJoinAndSelect('supplier.person', 'supplierPerson')
      .leftJoinAndSelect('t.expenseCategory', 'expenseCategory')
      .leftJoinAndSelect('t.resultCenter', 'resultCenter')
      .leftJoinAndSelect('t.user', 'user')
      .leftJoinAndSelect('user.person', 'userPerson')
      // include related transaction (eg: sale associated with a payment)
      .leftJoinAndSelect('t.relatedTransaction', 'relatedTxn');

    if (dto.type) {
      qb.andWhere('t.transactionType = :type', { type: dto.type });
    }
    if (dto.status) {
      qb.andWhere('t.status = :status', { status: dto.status });
    }
    if (dto.paymentMethod) {
      qb.andWhere('t.paymentMethod = :paymentMethod', { paymentMethod: dto.paymentMethod });
    }
    if (dto.branchId) {
      qb.andWhere('t.branchId = :branchId', { branchId: dto.branchId });
    }
    if (dto.pointOfSaleId) {
      qb.andWhere('t.pointOfSaleId = :pointOfSaleId', { pointOfSaleId: dto.pointOfSaleId });
    }
    if (dto.customerId) {
      qb.andWhere('t.customerId = :customerId', { customerId: dto.customerId });
    }
    if (dto.supplierId) {
      qb.andWhere('t.supplierId = :supplierId', { supplierId: dto.supplierId });
    }
    if (dto.customerId) {
      qb.andWhere('t.customerId = :customerId', { customerId: dto.customerId });
    }
    if (dto.supplierId) {
      qb.andWhere('t.supplierId = :supplierId', { supplierId: dto.supplierId });
    }
    if (dto.dateFrom) {
      const parsed = new Date(dto.dateFrom);
      if (!Number.isNaN(parsed.getTime())) {
        qb.andWhere('t.createdAt >= :dateFrom', { dateFrom: parsed });
      }
    }
    if (dto.dateTo) {
      const parsed = new Date(dto.dateTo);
      if (!Number.isNaN(parsed.getTime())) {
        qb.andWhere('t.createdAt <= :dateTo', { dateTo: parsed });
      }
    }
    if (dto.search) {
      const search = `%${dto.search.trim()}%`;
      qb.andWhere('(t.documentNumber LIKE :search OR t.externalReference LIKE :search)', { search });
    }

    qb.orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: string) {
    // Intentar obtener del caché primero
    const cached = await this.cacheService.getTransactionDetails(id);
    if (cached) {
      this.logger.debug(`Cache HIT for transaction ${id}`);
      return cached;
    }

    // Cache MISS - obtener de la base de datos
    this.logger.debug(`Cache MISS for transaction ${id}`);
    const transaction = await this.transactionsRepository.findOne({
      where: { id },
      relations: {
        branch: { company: true },
        pointOfSale: true,
        customer: { person: true },
        supplier: { person: true },
        employee: { person: true },
        user: { person: true },
        lines: true,
      },
    });

    // Almacenar en caché si se encontró la transacción
    if (transaction) {
      await this.cacheService.setTransactionDetails(id, transaction);
    }

    return transaction;
  }

  /**
   * Completar pago de cuenta por pagar (PAYMENT_OUT)
   * Marca el pago como completado actualizando:
   * - amountPaid = total
  /**
   * Completar pago pendiente (PAYMENT_OUT)
   * 
   * NUEVO FLUJO (Opción 2 - Arquitectura de Eventos):
   * 1. Validar que la transacción es PAYMENT_OUT y está en DRAFT
   * 2. Actualizar PAYMENT_OUT:
   *    - amountPaid = total
   *    - status = CONFIRMED
   * 3. CREAR nueva transacción PAYMENT_EXECUTION:
   *    - Representa el "acto de pagar"
   *    - relatedTransactionId = PAYMENT_OUT.id
   *    - Usa mismo monto, método de pago, etc.
   * 4. EMITIR evento 'transaction.created':
   *    - AccountingEngineListener lo procesa automáticamente
   *    - Genera asientos contables usando reglas en DB
   *    - DEBE: Cuenta por pagar (2.2.01, 2.2.02, etc.)
   *    - HABER: Banco (1.1.02) o Caja (1.1.01)
   * 
   * Ventajas:
   * - Consistente con resto del sistema (usa motor contable existente)
   * - Auditoría clara: PAYMENT_OUT (pendiente) + PAYMENT_EXECUTION (ejecutado)
   * - Flexibilidad: Reglas configurables en DB por empresa
   * - Separación de responsabilidades: Este servicio NO conoce lógica contable
   * 
   * @param paymentId - ID de la transacción PAYMENT_OUT a completar
   * @param data - Información del pago (método, cuentas bancarias, nota)
   * @returns PAYMENT_OUT actualizado
   */
  async completePayment(
    paymentId: string,
    data: {
      paymentMethod?: string;
      bankAccountKey?: string;
      supplierBankAccount?: any;
      companyBankAccount?: any;
      note?: string;
    },
  ): Promise<Transaction> {
    // Cargar payment con relaciones necesarias para crear PAYMENT_EXECUTION
    const payment = await this.transactionsRepository.findOne({
      where: { id: paymentId },
      relations: ['branch', 'branch.company'],
    });

    if (!payment) {
      throw new BadRequestException(`Payment ${paymentId} not found`);
    }

    if (payment.transactionType !== TransactionType.PAYMENT_OUT) {
      throw new BadRequestException(`Transaction ${paymentId} is not a PAYMENT_OUT`);
    }

    if (payment.status === TransactionStatus.CONFIRMED) {
      throw new ConflictException(`Payment ${paymentId} is already confirmed`);
    }

    const pendingAmount = Number(payment.total) - Number(payment.amountPaid);
    if (pendingAmount <= 0) {
      throw new ConflictException(`Payment ${paymentId} has no pending amount`);
    }

    // 1. Actualizar PAYMENT_OUT
    const updatedMetadata = {
      ...(payment.metadata || {}),
      completedAt: new Date().toISOString(),
      supplierBankAccount: data.supplierBankAccount,
      companyBankAccount: data.companyBankAccount,
    };

    await this.transactionsRepository.update(paymentId, {
      amountPaid: payment.total,
      status: TransactionStatus.CONFIRMED,
      paymentMethod: data.paymentMethod as any || payment.paymentMethod,
      bankAccountKey: data.bankAccountKey || payment.bankAccountKey,
      notes: data.note ? `${payment.notes || ''}\n${data.note}`.trim() : payment.notes,
      metadata: updatedMetadata as any,
    });

    this.logger.log(
      `Payment ${paymentId} marked as CONFIRMED. Amount: ${payment.total}`,
    );

    // 2. Crear transacción PAYMENT_EXECUTION
    const paymentMethod = (data.paymentMethod as any) || payment.paymentMethod;
    
    if (!payment.branchId) {
      throw new BadRequestException(`Payment ${paymentId} has no branchId`);
    }
    
    const executionDocNumber = await this.generateDocumentNumber(
      payment.branchId,
      TransactionType.PAYMENT_EXECUTION,
    );

    const paymentExecution = this.transactionsRepository.create({
      documentNumber: executionDocNumber,
      transactionType: TransactionType.PAYMENT_EXECUTION,
      status: TransactionStatus.CONFIRMED,
      branchId: payment.branchId,
      userId: payment.userId,
      relatedTransactionId: paymentId, // Enlace al PAYMENT_OUT original
      supplierId: payment.supplierId,
      employeeId: payment.employeeId,
      total: payment.total,
      subtotal: payment.subtotal,
      taxAmount: 0,
      discountAmount: 0,
      paymentMethod: paymentMethod,
      amountPaid: payment.total, // Ya está pagado
      bankAccountKey: data.bankAccountKey || payment.bankAccountKey,
      accountingPeriodId: payment.accountingPeriodId,
      notes: data.note ? `Pago ejecutado: ${data.note}` : `Pago ejecutado de ${payment.documentNumber}`,
      metadata: {
        origin: 'PAYMENT_COMPLETION',
        paymentOutId: paymentId,
        paymentOutDocNumber: payment.documentNumber,
        supplierBankAccount: data.supplierBankAccount,
        companyBankAccount: data.companyBankAccount,
        completedAt: new Date().toISOString(),
        // Copiar metadata crítico desde PAYMENT_OUT para contabilidad
        payrollLineType: payment.metadata?.payrollLineType,
        payrollTransactionId: payment.metadata?.payrollTransactionId,
      },
    });

    const savedExecution = await this.transactionsRepository.save(paymentExecution);

    this.logger.log(
      `Created PAYMENT_EXECUTION ${savedExecution.id} for PAYMENT_OUT ${paymentId}. Doc: ${executionDocNumber}`,
    );

    // 3. Emitir evento para generar asientos contables
    if (payment.branch?.company?.id) {
      this.eventEmitter.emit('transaction.created', {
        transaction: savedExecution,
        companyId: payment.branch.company.id,
      });

      this.logger.log(
        `Emitted 'transaction.created' event for PAYMENT_EXECUTION ${savedExecution.id}. ` +
        `AccountingEngineListener will generate ledger entries automatically.`,
      );
    } else {
      this.logger.warn(
        `Could not emit 'transaction.created' event for PAYMENT_EXECUTION ${savedExecution.id}: ` +
        `branch.company not loaded. Ledger entries will NOT be generated.`,
      );
    }

    // 4. Retornar PAYMENT_OUT actualizado
    return this.findOne(paymentId) as Promise<Transaction>;
  }

  /**
   * LIBRO DIARIO: Traer asientos contables con filtros
   */
  async listJournal(dto: SearchTransactionsDto) {
    const page = Math.max(Number(dto.page ?? 1), 1);
    const pageSize = Number(dto.pageSize ?? dto.limit ?? 25);
    const limit = Math.min(Math.max(pageSize, 1), 200);
    const offset = (page - 1) * limit;

    // Construir condiciones WHERE dinámicamente
    const whereConditions: string[] = [];
    const params: any[] = [];

    if (dto.type) {
      whereConditions.push(`t.transactionType = ?`);
      params.push(dto.type);
    }
    if (dto.status) {
      whereConditions.push(`t.status = ?`);
      params.push(dto.status);
    }
    if (dto.paymentMethod) {
      whereConditions.push(`t.paymentMethod = ?`);
      params.push(dto.paymentMethod);
    }
    if (dto.branchId) {
      whereConditions.push(`t.branchId = ?`);
      params.push(dto.branchId);
    }
    if (dto.dateFrom) {
      const parsed = new Date(dto.dateFrom);
      if (!Number.isNaN(parsed.getTime())) {
        whereConditions.push(`le.entryDate >= ?`);
        params.push(parsed);
      }
    }
    if (dto.dateTo) {
      const parsed = new Date(dto.dateTo);
      if (!Number.isNaN(parsed.getTime())) {
        whereConditions.push(`le.entryDate <= ?`);
        params.push(parsed);
      }
    }
    if (dto.search) {
      const search = `%${dto.search.trim()}%`;
      whereConditions.push(`(t.documentNumber LIKE ? OR t.externalReference LIKE ? OR t.notes LIKE ? OR aa.code LIKE ? OR aa.name LIKE ? OR le.description LIKE ?)`);
      params.push(search, search, search, search, search, search);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query para obtener el total
    const countQuery = `
      SELECT COUNT(DISTINCT le.id) as total
      FROM ledger_entries le
      JOIN transactions t ON le.transactionId = t.id
      JOIN accounting_accounts aa ON le.accountId = aa.id
      ${whereClause}
    `;

    const countResult = await this.dataSource.query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Query para obtener asientos
    const dataQuery = `
      SELECT
        le.id AS le_id,
        le.entryDate,
        t.documentNumber,
        t.notes,
        le.description AS le_description,
        aa.code,
        aa.name,
        le.debit,
        le.credit,
        t.customerId,
        t.supplierId,
        t.shareholderId,
        t.transactionType,
        t.status,
        t.createdAt,
        t.userId
      FROM ledger_entries le
      JOIN transactions t ON le.transactionId = t.id
      JOIN accounting_accounts aa ON le.accountId = aa.id
      ${whereClause}
      ORDER BY le.entryDate DESC, le.id DESC
      LIMIT ? OFFSET ?
    `;

    const dataParams = [...params, limit, offset];
    const results = await this.dataSource.query(dataQuery, dataParams);

    // Agrupar IDs de transacciones para cargar datos relacionados
    const txIds = Array.from(new Set(results.map((r: any) => r.t_id)));
    
    let txDetailsMap = new Map();
    if (txIds.length > 0) {
      const txDetails = await this.transactionsRepository.find({
        where: { id: In(txIds) },
        relations: [
          'branch',
          'pointOfSale',
          'customer',
          'customer.person',
          'supplier',
          'supplier.person',
          'employee',
          'employee.person',
          'shareholder',
          'shareholder.person',
          'user',
          'user.person',
        ],
      });

      txDetails.forEach((tx: any) => {
        txDetailsMap.set(tx.id, tx);
      });
    }

    // Transformar: crear fila por cada asiento
    const rows = results.map((row: any) => {
      const tx = txDetailsMap.get(row.t_id);

      // Resolver nombre de contraparte
      let entityName = '';
      if (row.customerId && tx?.customer?.person) {
        entityName = tx.customer.person.businessName || 
                    `${tx.customer.person.firstName || ''} ${tx.customer.person.lastName || ''}`.trim();
      } else if (row.supplierId && tx?.supplier?.person) {
        entityName = tx.supplier.person.businessName || 
                    `${tx.supplier.person.firstName || ''} ${tx.supplier.person.lastName || ''}`.trim();
      } else if (tx?.employee?.person) {
        entityName = tx.employee.person.businessName || 
                    `${tx.employee.person.firstName || ''} ${tx.employee.person.lastName || ''}`.trim();
      } else if (row.shareholderId && tx?.shareholder?.person) {
        entityName = tx.shareholder.person.businessName || 
                    `${tx.shareholder.person.firstName || ''} ${tx.shareholder.person.lastName || ''}`.trim();
      }

      // Resolver nombre de usuario
      let userName = '';
      if (tx?.user?.person) {
        userName = tx.user.person.businessName || 
                  `${tx.user.person.firstName || ''} ${tx.user.person.lastName || ''}`.trim() ||
                  tx.user.userName || '';
      } else if (tx?.user?.userName) {
        userName = tx.user.userName;
      }

      // Construir glosa
      let description = row.notes || '';
      if (row.transactionType) {
        const typeLabel = this.translateTransactionType(row.transactionType);
        description = `${typeLabel}: ${description}`.trim();
      }
      if (row.le_description) {
        description = `${description} - ${row.le_description}`.trim();
      }

      return {
        id: row.le_id,
        entryDate: row.entryDate,
        documentNumber: row.documentNumber,
        description: description,
        accountCode: row.code,
        accountName: row.name,
        accountType: this.getAccountType(row.code),
        debit: row.debit ? parseFloat(row.debit) : 0,
        credit: row.credit ? parseFloat(row.credit) : 0,
        entityName: entityName,
        userName: userName,
        branchName: tx?.branch?.name || '',
        pointOfSaleName: tx?.pointOfSale?.name || '',
        transactionId: row.t_id,
        transactionStatus: row.status,
        transactionType: row.transactionType,
        createdAt: row.createdAt,
      };
    });

    return { rows, total, page, limit };
  }

  /**
   * Traducir tipo de transacción a etiqueta legible
   */
  private translateTransactionType(type: TransactionType): string {
    const translations: Record<TransactionType, string> = {
      [TransactionType.SALE]: 'Venta',
      [TransactionType.PURCHASE]: 'Compra',
      [TransactionType.PURCHASE_ORDER]: 'Orden de Compra',
      [TransactionType.SALE_RETURN]: 'Devolución de Venta',
      [TransactionType.PURCHASE_RETURN]: 'Devolución de Compra',
      [TransactionType.TRANSFER_OUT]: 'Transferencia de Salida',
      [TransactionType.TRANSFER_IN]: 'Transferencia de Entrada',
      [TransactionType.ADJUSTMENT_IN]: 'Ajuste de Entrada',
      [TransactionType.ADJUSTMENT_OUT]: 'Ajuste de Salida',
      [TransactionType.PAYMENT_IN]: 'Ingreso',
      [TransactionType.PAYMENT_OUT]: 'Egreso',
      [TransactionType.SUPPLIER_PAYMENT]: 'Pago a Proveedor',
      [TransactionType.EXPENSE_PAYMENT]: 'Pago de Gasto',
      [TransactionType.PAYMENT_EXECUTION]: 'Ejecución de Pago',
      [TransactionType.CASH_DEPOSIT]: 'Depósito en Caja',
      [TransactionType.OPERATING_EXPENSE]: 'Gasto Operativo',
      [TransactionType.CASH_SESSION_OPENING]: 'Apertura de Caja',
      [TransactionType.CASH_SESSION_CLOSING]: 'Cierre de Caja',
      [TransactionType.CASH_SESSION_WITHDRAWAL]: 'Retiro de Caja',
      [TransactionType.CASH_SESSION_DEPOSIT]: 'Depósito a Caja',
      [TransactionType.PAYROLL]: 'Nómina',
      [TransactionType.VOID_ADJUSTMENT]: 'Anulación',
      [TransactionType.BANK_WITHDRAWAL_TO_SHAREHOLDER]: 'Retiro Bancario a Socio',
      [TransactionType.INVENTORY_COUNT]: 'Conteo de Inventario',
      [TransactionType.INVENTORY_RESERVATION]: 'Reserva de Inventario',
      [TransactionType.INVENTORY_BLOCK]: 'Bloqueo de Inventario',
      [TransactionType.INVENTORY_UNBLOCK]: 'Desbloqueo de Inventario',
    };
    return translations[type] || type;
  }

  /**
   * Obtener tipo de cuenta basado en código
   */
  private getAccountType(accountCode: string): string {
    if (!accountCode) return 'Otro';
    const firstDigit = accountCode.charAt(0);
    const types: Record<string, string> = {
      '1': 'Activo',
      '2': 'Pasivo',
      '3': 'Patrimonio',
      '4': 'Ingreso',
      '5': 'Gasto',
      '6': 'Costo',
    };
    return types[firstDigit] || 'Otro';
  }
}
