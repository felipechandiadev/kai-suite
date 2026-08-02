import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import {
  CashSession,
  CashSessionStatus,
  type CashSessionClosingDetails,
  type CashSessionTenderBreakdown,
} from '@modules/cash-sessions/domain/cash-session.entity';
import { assertCashSessionOperableByUser } from '@modules/cash-sessions/domain/assert-cash-session-operable-by-user';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { User } from '@modules/users/domain/user.entity';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { GetCashSessionsDto } from './dto/get-cash-sessions.dto';
import type { CloseCashSessionCountedDto } from './dto/close-cash-session.dto';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  Transaction,
  TransactionType,
  PaymentMethod,
  TransactionStatus,
  PaymentStatus,
} from '@modules/transactions/domain/transaction.entity';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { CashHubsService } from '@modules/cash-hubs/application/cash-hubs.service';
import { computeCashSessionExpectedAmount } from './cash-session-expected-amount.util';
import { sumSaleTipTenders } from './sale-tip-tender.util';

/**
 * CashSessionCoreService - Single Responsibility: Session Lifecycle Management
 *
 * Responsabilidades:
 * - Abrir sesiones de caja
 * - Cerrar sesiones de caja
 * - Reconciliar sesiones
 * - Queries sobre sesiones
 *
 * Delegaciones:
 * - Creación de transacciones → SalesFromSessionService
 * - Gestión de stock → SessionInventoryService
 * - Generación de asientos → TransactionsService (via SalesFromSessionService)
 */
@Injectable()
export class CashSessionCoreService {
  private readonly logger = new Logger(CashSessionCoreService.name);

  constructor(
    @InjectRepository(CashSession)
    private readonly cashSessionRepository: Repository<CashSession>,
    @InjectRepository(PointOfSale)
    private readonly pointOfSaleRepository: Repository<PointOfSale>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => TransactionsService))
    private readonly transactionsService: TransactionsService,
    private readonly cashHubsService: CashHubsService,
  ) {}

  /**
   * Query: Obtener una sesión por ID
   */
  async findOne(id: string) {
    const cashSession = await this.cashSessionRepository.findOne({
      where: { id, deletedAt: null as any },
      relations: [
        'pointOfSale',
        'pointOfSale.branch',
        'openedBy',
        'openedBy.person',
        'closedBy',
        'closedBy.person',
      ],
    });

    if (!cashSession) {
      return { success: false, message: 'Sesión de caja no encontrada' };
    }

    // obtain movements associated with this session
    type CashSessionMovement = {
      id: string;
      transactionType: TransactionType;
      documentNumber?: string;
      createdAt?: Date;
      total: number;
      paymentMethod?: PaymentMethod;
      paymentMethodLabel?: string;
      userId?: string;
      userFullName?: string;
      userUserName?: string;
      notes?: string;
      reason?: string;
      metadata?: any;
      direction: 'IN' | 'OUT' | 'NEUTRAL';
    };

    let movements: CashSessionMovement[] = [];
    try {
      movements = (await this.transactionsService.getMovementsForSession(
        id,
      )) as CashSessionMovement[];
    } catch (e) {
      this.logger?.warn(
        `No se pudieron cargar movimientos para sesión ${id}: ${e}`,
      );
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
      movements,
    };
  }

  /**
   * Movimientos de la sesión (transacciones asociadas), más recientes primero.
   */
  async listMovementsForSession(cashSessionId: string) {
    const row = await this.cashSessionRepository.findOne({
      where: { id: cashSessionId, deletedAt: null as any },
      select: ['id'],
    });
    if (!row) {
      throw new NotFoundException('Sesión de caja no encontrada');
    }
    return this.transactionsService.getMovementsForSession(cashSessionId);
  }

  /**
   * Query: Obtener todas las sesiones con filtros
   */
  async findAll(query: GetCashSessionsDto) {
    const qb = this.cashSessionRepository
      .createQueryBuilder('cs')
      .leftJoinAndSelect('cs.pointOfSale', 'pointOfSale')
      .leftJoinAndSelect('pointOfSale.branch', 'pointOfSaleBranch')
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

    const sessionIds = items.map((cs) => cs.id);
    const salesTotalBySessionId = new Map<string, number>();
    if (sessionIds.length > 0) {
      const salesRows = await this.transactionRepository
        .createQueryBuilder('t')
        .select('t.cashSessionId', 'cashSessionId')
        .addSelect('COALESCE(SUM(t.total), 0)', 'salesTotal')
        .where('t.cashSessionId IN (:...sessionIds)', { sessionIds })
        .andWhere('t.transactionType = :saleType', {
          saleType: TransactionType.SALE,
        })
        .groupBy('t.cashSessionId')
        .getRawMany<{ cashSessionId: string; salesTotal: string }>();

      for (const row of salesRows) {
        if (row.cashSessionId) {
          salesTotalBySessionId.set(
            row.cashSessionId,
            Number(row.salesTotal) || 0,
          );
        }
      }
    }

    // Map user fields for frontend convenience (same shape returned by older service)
    const mapped = items.map((cs) => ({
      ...cs,
      openingAmount: Number(cs.openingAmount ?? 0),
      closingAmount:
        cs.closingAmount != null ? Number(cs.closingAmount) : null,
      expectedAmount:
        cs.expectedAmount != null ? Number(cs.expectedAmount) : null,
      difference: cs.difference != null ? Number(cs.difference) : null,
      salesTotal: salesTotalBySessionId.get(cs.id) ?? 0,
      pointOfSaleName: cs.pointOfSale?.name || null,
      branchName: cs.pointOfSale?.branch?.name || null,
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
   * Abrir una sesión de caja
   *
   * IMPORTANTE: Genera transacción CASH_SESSION_OPENING con asientos automáticos
   *
   * Flujo:
   * 1. Validar saldo de Caja General
   * 2. Validar usuario existe
   * 3. Crear sesión en transacción atómica
   * 4. Delegar a TransactionsService para crear transacción con asientos
   */
  async open(openDto: OpenCashSessionDto) {
    const { userId, userName, pointOfSaleId, openingAmount } = openDto;
    const cashHubId =
      typeof openDto.cashHubId === 'string' ? openDto.cashHubId.trim() : '';

    // Validar POS existe
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

    const openingNum = Number(openingAmount) || 0;
    if (openingNum > 0.0001) {
      if (!cashHubId) {
        throw new BadRequestException(
          'Seleccione un centro de efectivo como fuente del efectivo de apertura.',
        );
      }
      const allowed = await this.cashHubsService.validateHubForPos(
        companyId,
        pointOfSale.id,
        cashHubId,
      );
      if (!allowed) {
        throw new BadRequestException(
          'El centro de efectivo no está vinculado a este punto de venta.',
        );
      }
      const hubBalance = await this.cashHubsService.getHubBalance(
        companyId,
        cashHubId,
      );
      if (openingNum > hubBalance + 0.0001) {
        throw new BadRequestException(
          `Saldo insuficiente en el centro de efectivo (disponible: ${hubBalance})`,
        );
      }
    }

    // TODO: Llamar a LedgerEntriesService.getAccountBalance para validar saldo de caja (V2)
    // const cashBalance = await ledgerEntriesService.getAccountBalance(CASH_ACCOUNT_ID);
    // if (cashBalance <= 0) {
    //   throw new BadRequestException('No hay saldo suficiente en Caja General');
    // }

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

    // Crear sesión en transacción atómica
    const result = await this.dataSource.transaction(async (manager) => {
      const cashSessionRepo = manager.getRepository(CashSession);

      // Verificar que no haya sesión abierta
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

      return await cashSessionRepo.save(newSession);
    });

    // create an actual opening transaction so movements list can show it
    try {
      const txDto = new CreateTransactionDto();
      txDto.transactionType = TransactionType.CASH_SESSION_OPENING;
      txDto.branchId = pointOfSale.branchId || '';
      txDto.userId = validatedUser.id;
      txDto.pointOfSaleId = pointOfSale.id;
      txDto.cashSessionId = result.id;
      txDto.subtotal = openingAmount;
      txDto.taxAmount = 0;
      txDto.discountAmount = 0;
      txDto.total = openingAmount;
      txDto.paymentMethod = PaymentMethod.CASH;
      txDto.amountPaid = openingAmount;
      txDto.changeAmount = 0;
      txDto.documentType = 'TICKET';
      if (cashHubId && openingNum > 0.0001) {
        txDto.cashHubId = cashHubId;
        txDto.notes = 'Apertura de caja desde centro de efectivo';
        txDto.metadata = {
          fromCashHub: true,
          cashSessionOpening: true,
          cashHubId,
        };
      } else {
        txDto.notes = undefined;
        txDto.metadata = {};
      }
      // validate() will be called internally by createTransaction

      await this.transactionsService.createTransaction(txDto);
    } catch (txErr) {
      this.logger.warn(
        `Opening transaction for session ${result.id} failed: ${txErr}`,
      );
      // don't block session creation; caller can retry or handle missing movement later
    }

    // Cargar validatedUser con su relación person para incluirla en la respuesta
    const userWithPerson = await this.userRepository.findOne({
      where: { id: validatedUser.id },
      relations: ['person'],
    });

    return {
      success: true,
      cashSession: {
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
        closingAmount: result.closingAmount
          ? Number(result.closingAmount)
          : null,
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
      },
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
   * Cerrar una sesión de caja
   *
   * IMPORTANTE: Genera transacción CASH_SESSION_CLOSING con asientos automáticos
   *
   * Flujo:
   * 1. Validar sesión existe y está OPEN
   * 2. Bloquear sesión (prevent further sales)
   * 3. Calcular totales (expected amount from sales)
   * 4. Delegar a TransactionsService para crear transacción con asientos
   * 5. Liberar stock reservado
   * 6. Marcar sesión como CLOSED
   */
  async closeByUserName(
    sessionId: string,
    userName: string,
    options?: {
      cashHubId?: string;
      notes?: string | null;
      counted?: CloseCashSessionCountedDto | null;
    },
  ) {
    const trimmedUserName = userName?.trim();
    if (!trimmedUserName) {
      throw new BadRequestException(
        'userName es requerido para cerrar la sesión',
      );
    }

    const user = await this.userRepository.findOne({
      where: { userName: trimmedUserName },
    });

    if (!user) {
      throw new NotFoundException(`Usuario ${trimmedUserName} no encontrado`);
    }

    return this.close(sessionId, user.id, options);
  }

  private buildCountedTenders(
    raw?: CloseCashSessionCountedDto | null,
  ): { actual: CashSessionTenderBreakdown; grand: number } {
    const actual: CashSessionTenderBreakdown = {
      cash: Math.max(0, Number(raw?.cash ?? 0)),
      debitCard: Math.max(0, Number(raw?.debitCard ?? 0)),
      creditCard: Math.max(0, Number(raw?.creditCard ?? 0)),
      transfer: Math.max(0, Number(raw?.transfer ?? 0)),
      check: Math.max(0, Number(raw?.check ?? 0)),
      other: Math.max(0, Number(raw?.other ?? 0)),
    };
    const grand = Number(
      (
        actual.cash +
        actual.debitCard +
        actual.creditCard +
        actual.transfer +
        actual.check +
        actual.other
      ).toFixed(2),
    );
    return { actual, grand };
  }

  async close(
    sessionId: string,
    userId: string,
    options?: {
      cashHubId?: string;
      notes?: string | null;
      counted?: CloseCashSessionCountedDto | null;
    },
  ) {
    // 1. Validar sesión
    const session = await this.cashSessionRepository.findOne({
      where: { id: sessionId },
      relations: ['pointOfSale', 'pointOfSale.branch'],
    });
    if (!session) {
      throw new NotFoundException(`Sesión ${sessionId} no encontrada`);
    }
    if (session.status !== CashSessionStatus.OPEN) {
      throw new ConflictException(
        `No se puede cerrar sesión en estado ${session.status}`,
      );
    }
    const pointOfSaleId = session.pointOfSaleId;
    if (!pointOfSaleId) {
      throw new BadRequestException(
        'Punto de venta no configurado en la sesión de caja',
      );
    }
    assertCashSessionOperableByUser(session, {
      userId,
      pointOfSaleId,
    });

    // 2. Totales de referencia
    const salesTotal =
      await this.transactionsService.getTotalSalesForSession(sessionId);
    const systemCashExpected =
      await this.recomputeCashSessionExpectedAmount(session);
    const { actual: countedActual, grand: countedGrand } =
      this.buildCountedTenders(options?.counted ?? null);
    const useCounted = countedGrand >= 0.01;

    // 3. Obtener usuario que cierra
    const closedBy = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!closedBy) {
      throw new NotFoundException('Usuario que cierra no encontrado');
    }

    const closingTxTotal = useCounted ? countedGrand : salesTotal;
    const hubTransferAmount = useCounted ? countedActual.cash : salesTotal;

    // 4. Crear transacción de cierre de caja
    // Validar branchId
    // ensure we know the branchId for later transaction
    let branchId: string | null | undefined = session.pointOfSale?.branchId;
    if (!branchId && session.pointOfSaleId) {
      // as fallback query pos explicitly
      const pos = await this.pointOfSaleRepository.findOne({
        where: { id: session.pointOfSaleId },
        relations: ['branch'],
      });
      branchId = pos?.branchId || pos?.branch?.id || undefined;
    }
    if (!branchId) {
      throw new BadRequestException(
        'No se pudo determinar la sucursal (branchId) para la sesión de caja.',
      );
    }

    const sessionTxs = await this.transactionRepository.find({
      where: {
        cashSessionId: session.id,
        status: TransactionStatus.CONFIRMED,
      },
    });
    const tipTenders = sumSaleTipTenders(sessionTxs);
    const tipBlock =
      tipTenders.tipTotal > 0
        ? {
            cash: tipTenders.tipCash,
            card: tipTenders.tipCard,
            total: tipTenders.tipTotal,
          }
        : null;

    let closingTxId: string | null = null;
    let hubTransferId: string | null = null;
    if (Number(closingTxTotal) >= 0.01) {
      const txDto = new CreateTransactionDto();
      txDto.transactionType = TransactionType.CASH_SESSION_CLOSING;
      txDto.branchId = branchId;
      txDto.userId = closedBy.id;
      txDto.pointOfSaleId = session.pointOfSaleId;
      txDto.cashSessionId = session.id;
      txDto.subtotal = closingTxTotal;
      txDto.taxAmount = 0;
      txDto.discountAmount = 0;
      txDto.total = closingTxTotal;
      txDto.paymentMethod = PaymentMethod.CASH;
      txDto.amountPaid = closingTxTotal;
      txDto.lines = [];
      txDto.notes = useCounted
        ? options?.notes?.trim() || 'Cierre de sesión con arqueo (conteo físico)'
        : 'Cierre automático de sesión de caja';
      if (useCounted) {
        txDto.metadata = {
          blindClose: true,
          counted: countedActual,
          systemCashExpected,
          salesTotal,
          tips: tipBlock,
        };
      } else if (tipBlock) {
        txDto.metadata = { tips: tipBlock };
      }

      const closingTx = await this.transactionsService.createTransaction(txDto);
      closingTxId = closingTx.id;

      const companyId = session.pointOfSale?.branch?.companyId;
      const posId = session.pointOfSaleId;
      if (companyId && posId && Number(hubTransferAmount) >= 0.01) {
        let hubId: string | null = null;
        if (options?.cashHubId) {
          const ok = await this.cashHubsService.validateHubForPos(
            companyId,
            posId,
            options.cashHubId,
          );
          hubId = ok ? options.cashHubId : null;
          if (!ok) {
            this.logger.warn(
              `cashHubId override inválido para sesión ${sessionId}; se omite traslado a centro de acopio.`,
            );
          }
        } else {
          hubId = await this.cashHubsService.resolveDefaultHubForPos(
            companyId,
            posId,
          );
        }
        if (hubId) {
          const hubTx = new CreateTransactionDto();
          hubTx.transactionType = TransactionType.CASH_SESSION_TO_HUB_TRANSFER;
          hubTx.branchId = branchId;
          hubTx.userId = closedBy.id;
          hubTx.pointOfSaleId = posId;
          hubTx.cashSessionId = session.id;
          hubTx.cashHubId = hubId;
          hubTx.subtotal = hubTransferAmount;
          hubTx.taxAmount = 0;
          hubTx.discountAmount = 0;
          hubTx.total = hubTransferAmount;
          hubTx.paymentMethod = PaymentMethod.CASH;
          hubTx.amountPaid = hubTransferAmount;
          hubTx.lines = [];
          hubTx.relatedTransactionId = closingTx.id;
          hubTx.notes = useCounted
            ? 'Traslado de efectivo contado (cierre) a centro de acopio'
            : 'Traslado de efectivo de cierre de sesión a centro de acopio';
          hubTx.metadata = {
            cashSessionToHub: true,
            cashHubId: hubId,
            closingTransactionId: closingTx.id,
            blindClose: useCounted,
          };
          const hubTxSaved =
            await this.transactionsService.createTransaction(hubTx);
          hubTransferId = hubTxSaved.id;
        }
      }
    }

    const diffCash = useCounted
      ? Number((countedActual.cash - systemCashExpected).toFixed(2))
      : 0;

    const closingDetails: CashSessionClosingDetails | null = useCounted
      ? {
          countedByUserId: closedBy.id,
          countedByUserName: closedBy.userName ?? null,
          countedAt: new Date().toISOString(),
          notes: options?.notes?.trim() ?? null,
          actual: countedActual,
          expected: {
            cash: systemCashExpected,
            debitCard: 0,
            creditCard: 0,
            transfer: 0,
            check: 0,
            other: 0,
          },
          difference: {
            cash: diffCash,
            total: diffCash,
          },
          tips: tipBlock,
        }
      : null;

    // 5. Actualizar sesión
    session.status = CashSessionStatus.CLOSED;
    session.closedAt = new Date();
    session.closedById = closedBy.id;
    session.expectedAmount = useCounted ? systemCashExpected : salesTotal;
    session.closingAmount = closingTxTotal;
    session.difference = useCounted ? diffCash : 0;
    if (options?.notes?.trim()) {
      session.notes = options.notes.trim();
    }
    session.closingDetails = closingDetails;
    await this.cashSessionRepository.save(session);

    return {
      success: true,
      message: 'Sesión cerrada correctamente',
      sessionId,
      closingTransactionId: closingTxId,
      hubTransferTransactionId: hubTransferId,
      expectedAmount: useCounted ? systemCashExpected : salesTotal,
      salesTotal,
      systemCashExpected,
      usedBlindCount: useCounted,
      countedGrand: useCounted ? countedGrand : undefined,
      counted: useCounted ? countedActual : undefined,
      difference: useCounted ? diffCash : undefined,
    };
  }

  /**
   * Reconciliar sesión: comparar saldo físico vs. saldo del sistema
   *
   * Si hay discrepancia: crear transacción ADJUSTMENT con asientos
   */
  async reconcile(sessionId: string, physicalAmount: number) {
    const session = await this.cashSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Sesión ${sessionId} no encontrada`);
    }

    const expectedAmount = session.expectedAmount ?? 0;
    const discrepancy = physicalAmount - Number(expectedAmount);

    // TODO: Si hay discrepancia > 0: crear ADJUSTMENT transaction con asientos
    // const adjustment = await this.transactionsService.createTransaction({
    //   transactionType: TransactionType.ADJUSTMENT,
    //   amount: Math.abs(discrepancy),
    //   direction: discrepancy > 0 ? 'CREDIT' : 'DEBIT',
    //   ...
    // });

    return {
      success: true,
      reconciliation: {
        sessionId,
        expectedAmount: Number(expectedAmount),
        physicalAmount,
        discrepancy,
        requiresAdjustment: Math.abs(discrepancy) > 0,
        // adjustmentTransactionId: adjustment?.id,
      },
    };
  }

  /**
   * Query: Obtener estadísticas de sesión
   */
  async getStats(sessionId: string) {
    const session = await this.cashSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Sesión ${sessionId} no encontrada`);
    }

    // TODO: Calcular estadísticas desde LedgerEntries
    // SELECT SUM(amount) FROM ledger_entries WHERE cashSessionId = ?
    // SELECT COUNT(*) FROM transactions WHERE cashSessionId AND type = SALE

    return {
      success: true,
      stats: {
        sessionId,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        status: session.status,
        expectedAmount: session.expectedAmount,
        closingAmount: session.closingAmount,
        difference: session.difference,
        // TODO: Add totalSales, totalPayments, etc from DB
      },
    };
  }

  /**
   * Centros de acopio vinculados a un POS (p. ej. antes de abrir sesión de caja).
   */
  async listCashHubsForPointOfSale(pointOfSaleId: string) {
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
    return this.listCashHubsLinkedToPos(companyId, pointOfSale.id);
  }

  private async listCashHubsLinkedToPos(companyId: string, posId: string) {
    const list = await this.cashHubsService.listByCompany(companyId);
    const hubs: Array<{
      id: string;
      name: string;
      code: string | null;
      currentBalance: number;
    }> = [];
    for (const h of list) {
      const ok = await this.cashHubsService.validateHubForPos(
        companyId,
        posId,
        h.id,
      );
      if (!ok) continue;
      hubs.push({
        id: h.id,
        name: h.name,
        code: h.code ?? null,
        currentBalance: Number((h as { currentBalance?: number }).currentBalance ?? 0),
      });
    }
    return { success: true, hubs };
  }

  /**
   * Centros de acopio vinculados al POS de la sesión, con saldo disponible para retirar a caja.
   */
  async listCashHubsForSessionDeposit(cashSessionId: string) {
    const session = await this.cashSessionRepository.findOne({
      where: { id: cashSessionId, deletedAt: null as any },
      relations: ['pointOfSale'],
    });
    if (!session) {
      throw new NotFoundException('Sesión de caja no encontrada');
    }
    if (session.status !== CashSessionStatus.OPEN) {
      throw new BadRequestException('La sesión no está abierta');
    }
    const posId = session.pointOfSaleId;
    if (!posId || !session.pointOfSale) {
      throw new BadRequestException('Sesión sin punto de venta asociado');
    }
    const companyId = session.companyId;
    return this.listCashHubsLinkedToPos(companyId, posId);
  }

  /**
   * Ingreso de efectivo a la sesión desde un centro de acopio (valida saldo y vínculo POS–hub).
   */
  async depositCashFromHub(params: {
    cashSessionId: string;
    cashHubId: string;
    amount: number;
    userId: string;
    reason?: string;
  }) {
    const { cashSessionId, cashHubId, amount, userId, reason } = params;
    if (amount < 0.01) {
      throw new BadRequestException('El monto debe ser mayor a cero');
    }
    const session = await this.cashSessionRepository.findOne({
      where: { id: cashSessionId, deletedAt: null as any },
      relations: ['pointOfSale'],
    });
    if (!session) {
      throw new NotFoundException('Sesión de caja no encontrada');
    }
    const pointOfSaleId = session.pointOfSaleId;
    if (!pointOfSaleId) {
      throw new BadRequestException(
        'Punto de venta no configurado en la sesión de caja',
      );
    }
    assertCashSessionOperableByUser(session, {
      userId,
      pointOfSaleId,
    });
    const pos = session.pointOfSale;
    const posId = pointOfSaleId;
    if (!pos?.branchId) {
      throw new BadRequestException('Punto de venta o sucursal no configurados');
    }
    const companyId = session.companyId;
    const allowed = await this.cashHubsService.validateHubForPos(
      companyId,
      posId,
      cashHubId,
    );
    if (!allowed) {
      throw new BadRequestException(
        'El centro de acopio no está vinculado a este punto de venta',
      );
    }
    const hubBalance = await this.cashHubsService.getHubBalance(
      companyId,
      cashHubId,
    );
    if (amount > hubBalance + 0.0001) {
      throw new BadRequestException(
        `Saldo insuficiente en el centro de acopio (disponible: ${hubBalance})`,
      );
    }
    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.CASH_SESSION_DEPOSIT;
    dto.branchId = pos.branchId;
    dto.userId = userId;
    dto.pointOfSaleId = posId;
    dto.cashSessionId = cashSessionId;
    dto.cashHubId = cashHubId;
    dto.subtotal = amount;
    dto.taxAmount = 0;
    dto.discountAmount = 0;
    dto.total = amount;
    dto.paymentMethod = PaymentMethod.CASH;
    dto.paymentStatus = PaymentStatus.PAID;
    dto.amountPaid = amount;
    dto.notes = reason?.trim() || undefined;
    dto.metadata = {
      fromCashHub: true,
      cashHubDeposit: true,
      reason: reason?.trim() || undefined,
    };
    const saved = await this.transactionsService.createTransaction(dto);
    const expected = await this.recomputeCashSessionExpectedAmount(session);
    await this.cashSessionRepository.update(
      { id: session.id },
      { expectedAmount: expected },
    );
    return {
      success: true,
      transaction: {
        id: saved.id,
        documentNumber: saved.documentNumber,
        createdAt: saved.createdAt,
        total: Number(saved.total),
      },
      expectedAmount: expected,
    };
  }

  /**
   * Efectivo teórico disponible en la sesión abierta (para validar egresos a centro de acopio).
   */
  async getAvailableCashForOpenSession(cashSessionId: string) {
    const session = await this.cashSessionRepository.findOne({
      where: { id: cashSessionId, deletedAt: null as any },
      relations: ['pointOfSale'],
    });
    if (!session) {
      throw new NotFoundException('Sesión de caja no encontrada');
    }
    if (session.status !== CashSessionStatus.OPEN) {
      throw new BadRequestException('La sesión no está abierta');
    }
    const available = await this.recomputeCashSessionExpectedAmount(session);
    return { success: true, availableCash: available };
  }

  /**
   * Egreso: traslado de efectivo desde la sesión hacia un centro de acopio (aumenta saldo del hub).
   */
  async withdrawCashSessionToHub(params: {
    cashSessionId: string;
    cashHubId: string;
    amount: number;
    userId: string;
    reason?: string;
  }) {
    const { cashSessionId, cashHubId, amount, userId, reason } = params;
    if (amount < 0.01) {
      throw new BadRequestException('El monto debe ser mayor a cero');
    }
    const session = await this.cashSessionRepository.findOne({
      where: { id: cashSessionId, deletedAt: null as any },
      relations: ['pointOfSale'],
    });
    if (!session) {
      throw new NotFoundException('Sesión de caja no encontrada');
    }
    const pointOfSaleId = session.pointOfSaleId;
    if (!pointOfSaleId) {
      throw new BadRequestException(
        'Punto de venta no configurado en la sesión de caja',
      );
    }
    assertCashSessionOperableByUser(session, {
      userId,
      pointOfSaleId,
    });
    const pos = session.pointOfSale;
    const posId = pointOfSaleId;
    if (!pos?.branchId) {
      throw new BadRequestException('Punto de venta o sucursal no configurados');
    }
    const companyId = session.companyId;
    const allowed = await this.cashHubsService.validateHubForPos(
      companyId,
      posId,
      cashHubId,
    );
    if (!allowed) {
      throw new BadRequestException(
        'El centro de acopio no está vinculado a este punto de venta',
      );
    }
    const available = await this.recomputeCashSessionExpectedAmount(session);
    if (amount > available + 0.0001) {
      throw new BadRequestException(
        `Efectivo insuficiente en la sesión (disponible: ${available})`,
      );
    }
    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.CASH_SESSION_TO_HUB_TRANSFER;
    dto.branchId = pos.branchId;
    dto.userId = userId;
    dto.pointOfSaleId = posId;
    dto.cashSessionId = cashSessionId;
    dto.cashHubId = cashHubId;
    dto.subtotal = amount;
    dto.taxAmount = 0;
    dto.discountAmount = 0;
    dto.total = amount;
    dto.paymentMethod = PaymentMethod.CASH;
    dto.paymentStatus = PaymentStatus.PAID;
    dto.amountPaid = amount;
    dto.lines = [];
    dto.notes =
      reason?.trim() || 'Traslado de efectivo de sesión a centro de acopio';
    dto.metadata = {
      cashSessionToHub: true,
      cashHubId,
      reason: reason?.trim() || undefined,
    };
    const saved = await this.transactionsService.createTransaction(dto);
    const expected = await this.recomputeCashSessionExpectedAmount(session);
    await this.cashSessionRepository.update(
      { id: session.id },
      { expectedAmount: expected },
    );
    return {
      success: true,
      transaction: {
        id: saved.id,
        documentNumber: saved.documentNumber,
        createdAt: saved.createdAt,
        total: Number(saved.total),
      },
      expectedAmount: expected,
    };
  }

  private async recomputeCashSessionExpectedAmount(
    cashSession: CashSession,
  ): Promise<number> {
    const transactions = await this.transactionRepository.find({
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
}
