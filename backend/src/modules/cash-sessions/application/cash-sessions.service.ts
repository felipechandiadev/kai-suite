import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, EntityManager } from 'typeorm';
import {
  TreasuryAccount,
  TreasuryAccountType,
} from '@modules/treasury-accounts/domain/treasury-account.entity';
import {
  CashSession,
  CashSessionStatus,
} from '@modules/cash-sessions/domain/cash-session.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { User } from '@modules/users/domain/user.entity';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Product } from '@modules/products/domain/product.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { VariantQuantityConversionService } from '@modules/product-variants/application/variant-quantity-conversion.service';
import { GetCashSessionsDto } from './dto/get-cash-sessions.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { computeCashSessionExpectedAmount } from './cash-session-expected-amount.util';
import {
  buildPaymentSnapshotsFromSalePayments,
  buildPaymentsMetadataFields,
  getRepresentativePaymentMethod,
  type SalePaymentInput,
} from '@modules/transactions/application/payment-snapshots.util';

@Injectable()
export class CashSessionsService {
  constructor(
    @InjectRepository(CashSession)
    private readonly cashSessionRepository: Repository<CashSession>,
    @InjectRepository(PointOfSale)
    private readonly pointOfSaleRepository: Repository<PointOfSale>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionLine)
    private readonly transactionLineRepository: Repository<TransactionLine>,
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>,
    private readonly dataSource: DataSource,
    @InjectRepository(TreasuryAccount)
    private readonly treasuryAccountRepository: Repository<TreasuryAccount>,
    private readonly variantQuantityConversion: VariantQuantityConversionService,
  ) {}

  // Full implementations restored from original module

  async findOne(id: string) {
    const cashSession = await this.cashSessionRepository.findOne({
      where: { id, deletedAt: null as any },
      relations: [
        'pointOfSale',
        'openedBy',
        'openedBy.person',
        'closedBy',
        'closedBy.person',
      ],
    });

    if (!cashSession) {
      return { success: false, message: 'Sesión de caja no encontrada' };
    }

    return {
      success: true,
      cashSession: {
        ...cashSession,
        openedBy: cashSession.openedBy
          ? {
              id: cashSession.openedBy.id,
              userName: cashSession.openedBy.userName,
              person: cashSession.openedBy.person
                ? {
                    firstName: cashSession.openedBy.person.firstName,
                    lastName: cashSession.openedBy.person.lastName,
                  }
                : null,
            }
          : null,
        closedBy: cashSession.closedBy
          ? {
              id: cashSession.closedBy.id,
              userName: cashSession.closedBy.userName,
              person: cashSession.closedBy.person
                ? {
                    firstName: cashSession.closedBy.person.firstName,
                    lastName: cashSession.closedBy.person.lastName,
                  }
                : null,
            }
          : null,
      },
    };
  }

  async open(openDto: OpenCashSessionDto) {
    // Validar saldo de Caja General antes de abrir sesión
    // Obtener companyId desde el punto de venta (branch)
    const { userId, userName, pointOfSaleId, openingAmount } = openDto;
    const pointOfSale = await this.pointOfSaleRepository.findOne({
      where: { id: pointOfSaleId, deletedAt: IsNull() },
      relations: ['branch'],
    });
    if (!pointOfSale) {
      throw new NotFoundException('El punto de venta especificado no existe.');
    }
    const companyId = pointOfSale.branch?.companyId;
    if (!companyId) {
      throw new BadRequestException(
        'No se pudo determinar la empresa asociada al punto de venta.',
      );
    }

    // Obtener saldo de Caja General usando buildLedger
    const { buildLedger } =
      await import('../../../shared/application/AccountingEngine');
    const ledger = await buildLedger(this.dataSource, { companyId });
    const CASH_ACCOUNT_CODE = '1.1.01';
    const cashAccount = ledger.accounts.find(
      (account) => account.code === CASH_ACCOUNT_CODE,
    );
    const rawBalance = cashAccount
      ? (ledger.balanceByAccount[cashAccount.id] ?? 0)
      : 0;
    const balance = Number.isFinite(rawBalance) ? Number(rawBalance) : 0;
    if (balance <= 0) {
      throw new BadRequestException(
        'No hay saldo suficiente en Caja General para abrir una nueva sesión de caja.',
      );
    }

    // Validar usuario - intenta por userId primero, luego por userName
    let validatedUser: User | null = null;
    if (userId) {
      validatedUser = await this.userRepository.findOne({
        where: { id: userId, deletedAt: IsNull() },
      });
    }
    if (!validatedUser && userName) {
      validatedUser = await this.userRepository.findOne({
        where: { userName, deletedAt: IsNull() },
      });
    }
    if (!validatedUser) {
      throw new NotFoundException('El usuario especificado no existe.');
    }

    // Crear sesión en transacción
    const result = await this.dataSource.transaction(async (manager) => {
      const cashSessionRepo = manager.getRepository(CashSession);

      // Verificar que no haya sesión abierta por otro usuario
      const existingOpenSession = await cashSessionRepo.findOne({
        where: {
          pointOfSaleId: pointOfSale.id,
          status: CashSessionStatus.OPEN,
        },
      });

      // Si existe una sesión abierta, verificar si fue abierta por el mismo usuario
      if (existingOpenSession) {
        if (existingOpenSession.openedById !== validatedUser.id) {
          throw new ConflictException(
            'El punto de venta ya tiene una sesión abierta por otro usuario. Cierre la sesión existente primero.',
          );
        }
        // Si es el mismo usuario, permitir que continúe retornando la sesión existente
        return existingOpenSession;
      }

      const openedAt = new Date();

      const newSession = cashSessionRepo.create({
        pointOfSaleId: pointOfSale.id,
        openedById: validatedUser.id,
        openingAmount,
        openedAt,
        status: CashSessionStatus.OPEN,
      });

      const savedSession = await cashSessionRepo.save(newSession);
      return savedSession;
    });

    // Cargar validatedUser con su relación person para incluirla en la respuesta
    const userWithPerson = await this.userRepository.findOne({
      where: { id: validatedUser.id },
      relations: ['person'],
    });

    const cashSessionPayload = {
      id: result.id,
      pointOfSaleId: result.pointOfSaleId,
      openedById: result.openedById,
      status: result.status,
      openingAmount: Number(result.openingAmount),
      openedAt: result.openedAt,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      expectedAmount: result.expectedAmount
        ? Number(result.expectedAmount)
        : null,
      closingAmount: result.closingAmount ? Number(result.closingAmount) : null,
      closedAt: result.closedAt || null,
      difference: result.difference ? Number(result.difference) : null,
      notes: result.notes || null,
      closingDetails: result.closingDetails || null,
      openedBy: userWithPerson
        ? {
            id: userWithPerson.id,
            userName: userWithPerson.userName,
            person: userWithPerson.person
              ? {
                  id: userWithPerson.person.id,
                  firstName: userWithPerson.person.firstName,
                  lastName: userWithPerson.person.lastName,
                }
              : null,
          }
        : null,
    };

    return {
      success: true,
      cashSession: cashSessionPayload,
      suggestedOpeningAmount: openingAmount,
      pointOfSale: {
        id: pointOfSale.id,
        name: pointOfSale.name,
        deviceId: pointOfSale.deviceId || null,
        branchId: pointOfSale.branchId || null,
        branchName: pointOfSale.branch?.name || null,
        priceLists: Array.isArray(pointOfSale.priceLists)
          ? pointOfSale.priceLists
          : [],
      },
    };
  }

  /**
   * Obtiene todas las transacciones de tipo SALE de una sesión de caja
   */
  async getSales(cashSessionId: string) {
    // Verificar que la sesión existe
    const cashSession = await this.cashSessionRepository.findOne({
      where: { id: cashSessionId },
    });

    if (!cashSession) {
      throw new NotFoundException(
        `Sesión de caja ${cashSessionId} no encontrada`,
      );
    }

    // Obtener todas las transacciones de tipo SALE
    const sales = await this.transactionRepository.find({
      where: {
        cashSessionId,
        transactionType: TransactionType.SALE,
      },
      relations: [
        'lines',
        'lines.productVariant',
        'lines.productVariant.product',
      ],
      order: {
        createdAt: 'DESC',
      },
    });

    // Mapear a formato simplificado
    const mappedSales = sales.map((transaction) => ({
      id: transaction.id,
      type: transaction.transactionType,
      amount: transaction.taxAmount,
      paymentMethod: transaction.paymentMethod,
      status: transaction.status,
      createdAt: transaction.createdAt,
      documentNumber: transaction.documentNumber,
      externalReference: transaction.externalReference,
      notes: transaction.notes,
      lines:
        transaction.lines?.map((line) => ({
          id: line.id,
          productVariantId: line.productVariantId,
          productName:
            line.productVariant?.product?.name || 'Producto desconocido',
          variantName: undefined,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountAmount: line.discountAmount,
          taxAmount: line.taxAmount,
          totalAmount: line.taxAmount,
        })) || [],
    }));

    return {
      success: true,
      cashSessionId,
      totalSales: sales.length,
      sales: mappedSales,
    };
  }

  async findAll(query: GetCashSessionsDto) {
    const qb = this.cashSessionRepository
      .createQueryBuilder('cs')
      .leftJoinAndSelect('cs.pointOfSale', 'pointOfSale')
      .leftJoinAndSelect('cs.openedBy', 'openedBy')
      .leftJoinAndSelect('openedBy.person', 'openedByPerson')
      .leftJoinAndSelect('cs.closedBy', 'closedBy')
      .leftJoinAndSelect('closedBy.person', 'closedByPerson');

    if (query.pointOfSaleId) {
      qb.andWhere('cs.pointOfSaleId = :pointOfSaleId', {
        pointOfSaleId: query.pointOfSaleId,
      });
    }

    if (query.status) {
      qb.andWhere('cs.status = :status', { status: query.status });
    }

    qb.orderBy('cs.createdAt', 'DESC');

    // Limit results to a reasonable default (no pagination in DTO)
    const [items, total] = await qb.take(100).getManyAndCount();

    // transform items into DTO shape expected by frontend
    const mapped = items.map((cs) => ({
      ...cs,
      openedByUserName: cs.openedBy?.userName || null,
      openedByFullName: cs.openedBy?.person
        ? `${cs.openedBy.person.firstName} ${cs.openedBy.person.lastName}`
        : null,
      closedByUserName: cs.closedBy?.userName || null,
      closedByFullName: cs.closedBy?.person
        ? `${cs.closedBy.person.firstName} ${cs.closedBy.person.lastName}`
        : null,
    }));

    return { success: true, total, items: mapped };
  }

  /**
   * Crea una nueva venta (transacción de tipo SALE)
   */
  async createSale(createSaleDto: CreateSaleDto) {
    const {
      userName,
      pointOfSaleId,
      cashSessionId,
      paymentMethod,
      payments,
      lines,
      amountPaid,
      changeAmount,
      customerId,
      documentNumber,
      externalReference,
      notes,
      storageId,
      bankAccountKey,
      metadata,
    } = createSaleDto;

    const paymentsForSale = Array.isArray(payments)
      ? payments.filter((p) => (Number(p.amount) || 0) > 0)
      : null;

    // Validaciones básicas
    if (!lines || lines.length === 0) {
      throw new BadRequestException('Debes enviar al menos una línea de venta');
    }

    if (
      Array.isArray(payments) &&
      payments.length > 0 &&
      paymentsForSale &&
      paymentsForSale.length === 0
    ) {
      throw new BadRequestException(
        'Todos los medios de pago enviados tienen monto cero.',
      );
    }

    const paymentsUsed = paymentsForSale ?? [];

    if (paymentsUsed.length === 0 && !paymentMethod?.trim()) {
      throw new BadRequestException(
        'Debes enviar paymentMethod o al menos un pago con monto > 0 en payments.',
      );
    }

    const salePaymentInputs: SalePaymentInput[] = paymentsUsed.map((p) => ({
      paymentMethod: p.paymentMethod,
      amount: Number(p.amount) || 0,
      companyPaymentMethodId: (p as { companyPaymentMethodId?: string })
        .companyPaymentMethodId,
      bankAccountId: p.bankAccountId,
      reference: (p as { reference?: string }).reference,
      checkData: (p as { checkData?: Record<string, unknown> }).checkData,
      voucherData: (p as { voucherData?: Record<string, unknown> }).voucherData,
    }));
    const paymentSnapshots = buildPaymentSnapshotsFromSalePayments(
      salePaymentInputs,
      [],
    );
    const finalPaymentMethod: string =
      paymentsUsed.length > 0
        ? getRepresentativePaymentMethod(
            paymentSnapshots,
            paymentMethod ?? PaymentMethod.CASH,
          )
        : paymentMethod!.trim();

    // Parsear método de pago
    const paymentMethodEnum = this.parsePaymentMethod(finalPaymentMethod);
    if (!paymentMethodEnum) {
      throw new BadRequestException(
        `Método de pago inválido: ${finalPaymentMethod}`,
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      // Verificar usuario
      const user = await manager.getRepository(User).findOne({
        where: { userName, deletedAt: IsNull() },
      });
      if (!user) {
        throw new NotFoundException(`Usuario ${userName} no encontrado`);
      }

      // Verificar punto de venta
      const pointOfSale = await manager.getRepository(PointOfSale).findOne({
        where: { id: pointOfSaleId, deletedAt: IsNull() },
      });
      if (!pointOfSale) {
        throw new NotFoundException(
          `Punto de venta ${pointOfSaleId} no encontrado`,
        );
      }

      // Verificar sesión de caja
      const cashSession = await manager.getRepository(CashSession).findOne({
        where: { id: cashSessionId },
      });
      if (!cashSession) {
        throw new NotFoundException(
          `Sesión de caja ${cashSessionId} no encontrada`,
        );
      }

      if (cashSession.status !== CashSessionStatus.OPEN) {
        throw new ConflictException(
          `La sesión de caja está en estado ${cashSession.status}, no se pueden registrar ventas`,
        );
      }

      if (
        cashSession.pointOfSaleId &&
        cashSession.pointOfSaleId !== pointOfSale.id
      ) {
        throw new ConflictException(
          'La sesión de caja no pertenece al punto de venta especificado',
        );
      }

      const branch = await manager.getRepository(Branch).findOne({
        where: { id: pointOfSale.branchId as any },
      });
      if (!branch?.companyId) {
        throw new BadRequestException(
          'La sucursal del punto de venta no tiene empresa asociada.',
        );
      }
      const companyIdForUnits = branch.companyId;
      const unitRows = await manager.getRepository(Unit).find({
        where: { companyId: companyIdForUnits, deletedAt: IsNull() },
      });
      const unitsById = new Map(unitRows.map((u) => [u.id, u]));

      // Generar número de documento
      const documentNum =
        documentNumber ||
        (await this.generateDocumentNumber(manager, pointOfSale.id, 'SALE'));

      // Calcular totales
      let subtotal = 0;
      let taxAmount = 0;
      let discountAmount = 0;

      const transactionLines: Partial<TransactionLine>[] = [];

      for (const line of lines) {
        // Verificar que la variante existe y cargar producto relacionado
        const variant = await manager.getRepository(ProductVariant).findOne({
          where: { id: line.productVariantId },
          relations: ['product'],
        });
        if (!variant) {
          throw new NotFoundException(
            `Variante ${line.productVariantId} no encontrada`,
          );
        }
        if (!variant.product) {
          throw new NotFoundException(
            `Producto no encontrado para variante ${line.productVariantId}`,
          );
        }

        const lineSubtotal = line.quantity * line.unitPrice;
        const lineDiscount = line.discountAmount || 0;
        const lineTax = line.taxAmount || 0;
        const lineTotal = lineSubtotal - lineDiscount + lineTax;

        // Defensive: Ensure taxRate is within valid range (0-100)
        const safeTaxRate = Math.max(0, Math.min(100, line.taxRate || 0));

        subtotal += lineSubtotal;
        discountAmount += lineDiscount;
        taxAmount += lineTax;

        const lineUnitId = (
          (line as any).unitId ??
          variant.saleUnitId ??
          variant.unitId ??
          ''
        )
          .toString()
          .trim();
        if (!lineUnitId) {
          throw new BadRequestException(
            `Variante ${variant.id} sin unidad de venta (saleUnitId / unitId).`,
          );
        }
        const converted = this.variantQuantityConversion.toVariantStockBaseSync(
          variant,
          Number(line.quantity) || 0,
          lineUnitId,
          unitsById,
          'sale',
        );

        transactionLines.push({
          companyId: companyIdForUnits,
          productId: variant.productId,
          productVariantId: line.productVariantId,
          productName: variant.product.name,
          productSku: variant.sku,
          variantName: variant.product.name, // Por ahora usar el nombre del producto
          unitId: lineUnitId,
          quantity: line.quantity,
          quantityInBase: converted.quantityInBase,
          unitConversionFactor: converted.unitConversionFactor,
          unitOfMeasure: converted.unitOfMeasure,
          unitPrice: line.unitPrice,
          unitCost: line.unitCost || variant.baseCost || 0,
          discountAmount: lineDiscount,
          taxId: line.taxId || undefined,
          taxRate: safeTaxRate,
          taxAmount: lineTax,
          subtotal: lineSubtotal - lineDiscount,
          total: lineTotal,
          notes: line.notes || undefined,
        });
      }

      const total = subtotal - discountAmount + taxAmount;

      // Crear transacción
      const transactionData = {
        documentNumber: documentNum,
        transactionType: TransactionType.SALE,
        status: TransactionStatus.CONFIRMED,
        branchId: pointOfSale.branchId || undefined,
        pointOfSaleId: pointOfSale.id,
        cashSessionId: cashSession.id,
        storageId: storageId || undefined,
        customerId: customerId || undefined,
        userId: user.id,
        subtotal,
        taxAmount,
        discountAmount,
        total,
        paymentMethod: paymentMethodEnum,
        bankAccountKey: bankAccountKey || undefined,
        amountPaid: amountPaid || total,
        changeAmount: changeAmount || 0,
        documentType: 'TICKET',
        documentFolio: documentNum,
        externalReference: externalReference || undefined,
        notes: notes || undefined,
        metadata: {
          ...(metadata || {}),
          ...buildPaymentsMetadataFields(paymentSnapshots),
        },
      };

      const savedTransaction = (await manager
        .getRepository(Transaction)
        .save(transactionData)) as Transaction;

      // Crear líneas de transacción
      const savedLines: TransactionLine[] = [];
      for (const lineData of transactionLines) {
        const lineToSave = {
          ...lineData,
          transactionId: savedTransaction.id,
        };
        const savedLine = await manager
          .getRepository(TransactionLine)
          .save(lineToSave);
        savedLines.push(savedLine);
      }

      // Update StockLevel per line (allow negative stock)
      try {
        // Determine target storage: prefer provided storageId, else attempt POS default storage
        let targetStorageId = storageId || undefined;
        if (!targetStorageId) {
          const storageRepo = manager.getRepository(Storage);
          const defaultStorage = (await storageRepo.findOne({
            where: {
              branchId: pointOfSale.branchId ?? undefined,
              isDefault: true,
            },
          } as any)) as any;
          if (defaultStorage) {
            targetStorageId = defaultStorage.id;
          }
        }

        if (targetStorageId) {
          const stockRepo = manager.getRepository(StockLevel);
          for (const savedLine of savedLines) {
            const variantId = savedLine.productVariantId;
            const qty = Number(
              savedLine.quantityInBase ?? savedLine.quantity ?? 0,
            );

            // Find existing stock level for variant+storage
            let stockEntry = (await stockRepo.findOne({
              where: {
                productVariantId: variantId,
                storageId: targetStorageId,
              },
            } as any)) as any;
            if (!stockEntry) {
              // Create new stock entry with negative availableStock if needed
              stockEntry = stockRepo.create({
                productVariantId: variantId,
                storageId: targetStorageId,
                physicalStock: 0 - qty,
                committedStock: 0,
                availableStock: 0 - qty,
                incomingStock: 0,
                lastTransactionId: savedTransaction.id,
              } as any);
            } else {
              stockEntry.physicalStock = Number(
                (Number(stockEntry.physicalStock ?? 0) - qty).toFixed(6),
              );
              stockEntry.availableStock = Number(
                (
                  Number(stockEntry.physicalStock ?? 0) -
                  Number(stockEntry.committedStock ?? 0)
                ).toFixed(6),
              );
              stockEntry.lastTransactionId = savedTransaction.id;
            }

            await stockRepo.save(stockEntry as StockLevel);
          }
        }
      } catch (err) {
        // Don't fail the sale if stock update fails; log and continue

        console.warn(
          'No se pudo actualizar StockLevel después de la venta',
          err,
        );
      }

      const sessionTxs = await manager.getRepository(Transaction).find({
        where: {
          cashSessionId: cashSession.id,
          status: TransactionStatus.CONFIRMED,
        },
      });
      cashSession.expectedAmount = computeCashSessionExpectedAmount(
        Number(cashSession.openingAmount) || 0,
        sessionTxs,
      );
      await manager.getRepository(CashSession).save(cashSession);

      return {
        success: true,
        transaction: {
          id: savedTransaction.id,
          documentNumber: savedTransaction.documentNumber,
          type: savedTransaction.transactionType,
          status: savedTransaction.status,
          total: savedTransaction.total,
          paymentMethod: savedTransaction.paymentMethod,
          createdAt: savedTransaction.createdAt,
        },
        lines: savedLines.map((line) => ({
          id: line.id,
          productVariantId: line.productVariantId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          total: line.total,
        })),
      };
    });
  }

  /**
   * Parsea el método de pago desde string
   */
  private parsePaymentMethod(method: string): PaymentMethod | null {
    const normalized = method?.toUpperCase().trim();
    if (Object.values(PaymentMethod).includes(normalized as PaymentMethod)) {
      return normalized as PaymentMethod;
    }
    return null;
  }

  /**
   * Genera un número de documento único
   */
  private async generateDocumentNumber(
    manager: any,
    pointOfSaleId: string,
    type: string,
  ): Promise<string> {
    const lastTransaction = await manager
      .getRepository(Transaction)
      .createQueryBuilder('t')
      .where('t.pointOfSaleId = :pointOfSaleId', { pointOfSaleId })
      .andWhere('t.transactionType = :type', { type })
      .orderBy('t.createdAt', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastTransaction && lastTransaction.documentNumber) {
      const match = lastTransaction.documentNumber.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `${type}${String(nextNumber).padStart(8, '0')}`;
  }

  async registerOpeningTransaction(dto: any) {
    // Crea una transacción de apertura de caja
    const { cashSessionId, openingAmount, openedById, comment } = dto;
    const session = await this.cashSessionRepository.findOne({
      where: { id: cashSessionId },
      relations: ['openedBy', 'openedBy.person'],
    });
    if (!session) throw new NotFoundException('Sesión de caja no encontrada');

    // Generar número de documento único para apertura
    if (!session.pointOfSaleId)
      throw new BadRequestException(
        'El punto de venta de la sesión no está definido',
      );
    const documentNumber = await this.generateDocumentNumber(
      this.dataSource.manager,
      session.pointOfSaleId,
      TransactionType.CASH_SESSION_OPENING,
    );

    // Crear transacción de apertura
    const transaction = this.transactionRepository.create({
      transactionType: TransactionType.CASH_SESSION_OPENING,
      status: TransactionStatus.CONFIRMED,
      pointOfSaleId: session.pointOfSaleId,
      cashSessionId: session.id,
      userId: openedById,
      subtotal: openingAmount,
      total: openingAmount,
      paymentMethod: PaymentMethod.CASH,
      documentNumber,
      metadata: { comment },
    });
    const savedTransaction = await this.transactionRepository.save(transaction);

    // Actualizar monto de apertura en la sesión
    session.openingAmount = openingAmount;
    const updatedSession = await this.cashSessionRepository.save(session);

    // Devolver respuesta completa con sesión y transacción
    return {
      success: true,
      cashSession: {
        id: updatedSession.id,
        pointOfSaleId: updatedSession.pointOfSaleId,
        openedById: updatedSession.openedById,
        status: updatedSession.status,
        openingAmount: Number(updatedSession.openingAmount),
        openedAt: updatedSession.openedAt,
        createdAt: updatedSession.createdAt,
        updatedAt: updatedSession.updatedAt,
        expectedAmount: updatedSession.expectedAmount
          ? Number(updatedSession.expectedAmount)
          : null,
        closingAmount: updatedSession.closingAmount
          ? Number(updatedSession.closingAmount)
          : null,
        closedAt: updatedSession.closedAt || null,
        difference: updatedSession.difference
          ? Number(updatedSession.difference)
          : null,
        notes: updatedSession.notes || null,
        closingDetails: updatedSession.closingDetails || null,
        openedBy: updatedSession.openedBy
          ? {
              id: updatedSession.openedBy.id,
              userName: updatedSession.openedBy.userName,
              person: updatedSession.openedBy.person
                ? {
                    id: updatedSession.openedBy.person.id,
                    firstName: updatedSession.openedBy.person.firstName,
                    lastName: updatedSession.openedBy.person.lastName,
                  }
                : null,
            }
          : null,
      },
      transaction: {
        id: savedTransaction.id,
        documentNumber: savedTransaction.documentNumber,
        createdAt: savedTransaction.createdAt,
        total: Number(savedTransaction.total),
      },
    };
  }

  async registerCashDeposit(input: any) {
    const { userName, pointOfSaleId, cashSessionId, amount, reason } = input;

    return await this.dataSource.transaction(async (manager) => {
      const session = await manager
        .getRepository(CashSession)
        .findOne({ where: { id: cashSessionId } });
      if (!session) throw new NotFoundException('Sesión de caja no encontrada');

      const user = await manager
        .getRepository(User)
        .findOne({ where: { userName, deletedAt: IsNull() } });
      if (!user) throw new NotFoundException('Usuario no encontrado');

      // create transaction
      const transaction = manager.getRepository(Transaction).create({
        transactionType: TransactionType.CASH_SESSION_DEPOSIT,
        status: TransactionStatus.CONFIRMED,
        pointOfSaleId: session.pointOfSaleId || pointOfSaleId,
        cashSessionId: session.id,
        userId: user.id,
        subtotal: amount,
        total: amount,
        paymentMethod: PaymentMethod.CASH,
        documentNumber: await this.generateDocumentNumber(
          manager,
          session.pointOfSaleId || pointOfSaleId,
          TransactionType.CASH_SESSION_DEPOSIT,
        ),
        metadata: { reason },
      });

      const saved = await manager.getRepository(Transaction).save(transaction);

      // Recalculate expected amount
      session.expectedAmount = await this.recomputeCashSessionExpectedAmount(
        manager,
        session,
      );
      await manager.getRepository(CashSession).save(session);

      return {
        success: true,
        transaction: {
          id: saved.id,
          documentNumber: saved.documentNumber,
          createdAt: saved.createdAt,
          total: saved.total,
        },
        expectedAmount: session.expectedAmount,
      };
    });
  }

  async registerCashWithdrawal(input: any) {
    const { userName, pointOfSaleId, cashSessionId, amount, reason } = input;

    return await this.dataSource.transaction(async (manager) => {
      const session = await manager
        .getRepository(CashSession)
        .findOne({ where: { id: cashSessionId } });
      if (!session) throw new NotFoundException('Sesión de caja no encontrada');

      const user = await manager
        .getRepository(User)
        .findOne({ where: { userName, deletedAt: IsNull() } });
      if (!user) throw new NotFoundException('Usuario no encontrado');

      const transaction = manager.getRepository(Transaction).create({
        transactionType: TransactionType.CASH_SESSION_WITHDRAWAL,
        status: TransactionStatus.CONFIRMED,
        pointOfSaleId: session.pointOfSaleId || pointOfSaleId,
        cashSessionId: session.id,
        userId: user.id,
        subtotal: amount,
        total: amount,
        paymentMethod: PaymentMethod.CASH,
        documentNumber: await this.generateDocumentNumber(
          manager,
          session.pointOfSaleId || pointOfSaleId,
          TransactionType.CASH_SESSION_WITHDRAWAL,
        ),
        metadata: { reason },
      });

      const saved = await manager.getRepository(Transaction).save(transaction);

      // Recalculate expected amount
      session.expectedAmount = await this.recomputeCashSessionExpectedAmount(
        manager,
        session,
      );
      await manager.getRepository(CashSession).save(session);

      return {
        success: true,
        transaction: {
          id: saved.id,
          documentNumber: saved.documentNumber,
          createdAt: saved.createdAt,
          total: saved.total,
        },
        expectedAmount: session.expectedAmount,
      };
    });
  }

  async closeCashSession(input: any) {
    const { userName, cashSessionId, actualCash, notes } = input;
    const session = await this.cashSessionRepository.findOne({
      where: { id: cashSessionId },
    });
    if (!session) throw new NotFoundException('Sesión de caja no encontrada');

    const user = await this.userRepository.findOne({
      where: { userName, deletedAt: IsNull() },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Calculate expected from stored expectedAmount or openingAmount
    const expected = Number(
      session.expectedAmount ?? session.openingAmount ?? 0,
    );

    session.closingAmount = Number(actualCash);
    session.closedAt = new Date();
    session.status = CashSessionStatus.CLOSED;
    session.difference = Number(actualCash) - expected;
    const closingDetails = {
      countedByUserId: user.id,
      countedByUserName: user.userName || null,
      countedAt: new Date().toISOString(),
      notes: notes || null,
      actual: {
        cash: Number(actualCash) || 0,
        debitCard: Number(input.voucherDebitAmount || 0) || 0,
        creditCard: Number(input.voucherCreditAmount || 0) || 0,
        transfer: Number(input.transferAmount || 0) || 0,
        check: Number(input.checkAmount || 0) || 0,
        other: Number(input.otherAmount || 0) || 0,
      },
      expected: {
        cash: expected || 0,
        debitCard: 0,
        creditCard: 0,
        transfer: 0,
        check: 0,
        other: 0,
      },
      difference: {
        cash: Number(session.difference) || 0,
        total: Number(session.difference) || 0,
      },
    };

    session.closingDetails = closingDetails;
    session.closedById = user.id;

    await this.cashSessionRepository.save(session);

    return {
      success: true,
      session: {
        id: session.id,
        status: session.status,
        pointOfSaleId: session.pointOfSaleId,
        openedById: session.openedById ?? null,
        openedAt: session.openedAt || null,
        openingAmount: Number(session.openingAmount),
        expectedAmount: Number(session.expectedAmount ?? null),
        closingAmount: Number(session.closingAmount),
        difference: Number(session.difference),
        closedAt: session.closedAt || null,
        notes: session.notes || null,
        closingDetails: session.closingDetails || null,
      },
      closing: {
        actual: { cash: Number(session.closingAmount) },
        expected: { cash: expected },
        difference: {
          cash: Number(session.difference),
          total: Number(session.difference),
        },
      },
    };
  }

  /**
   * Recalcula el monto esperado de la sesión de caja basado en todas las transacciones
   */
  private async recomputeCashSessionExpectedAmount(
    manager: EntityManager,
    cashSession: CashSession,
  ): Promise<number> {
    const transactions = await manager.getRepository(Transaction).find({
      where: {
        cashSessionId: cashSession.id,
        status: TransactionStatus.CONFIRMED,
      },
    });
    return computeCashSessionExpectedAmount(
      Number(cashSession.openingAmount) || 0,
      transactions,
    );
  }

  /** Recalcula y persiste el efectivo esperado tras transacciones externas (p. ej. pago proveedor desde POS). */
  async refreshExpectedAmountForSession(cashSessionId: string): Promise<void> {
    const id = String(cashSessionId || '').trim();
    if (!id) {
      return;
    }
    await this.dataSource.transaction(async (manager) => {
      const session = await manager.getRepository(CashSession).findOne({
        where: { id },
      });
      if (!session || session.status !== CashSessionStatus.OPEN) {
        return;
      }
      session.expectedAmount = await this.recomputeCashSessionExpectedAmount(
        manager,
        session,
      );
      await manager.getRepository(CashSession).save(session);
    });
  }
}
