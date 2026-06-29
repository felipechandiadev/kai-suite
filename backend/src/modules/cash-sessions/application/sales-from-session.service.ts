import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, In, type EntityManager } from 'typeorm';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  PaymentStatus,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import {
  CashSession,
  CashSessionStatus,
} from '@modules/cash-sessions/domain/cash-session.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { User } from '@modules/users/domain/user.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { VariantQuantityConversionService } from '@modules/product-variants/application/variant-quantity-conversion.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CollectPendingSalesDto } from './dto/collect-pending-sales.dto';
import { CollectPendingQuotasDto } from './dto/collect-pending-quotas.dto';
import { PayoutCustomerCreditNotesDto } from './dto/payout-customer-credit-notes.dto';
import { CreateBackorderDto } from './dto/create-backorder.dto';
import {
  isSaleCollectible,
  saleBalanceDue,
} from './collect-pending-sales.util';
import {
  isInstallmentCollectible,
  installmentPendingAmount,
  resolveInstallmentSaleId,
} from './collect-pending-quotas.util';
import {
  Installment,
  InstallmentSourceType,
  InstallmentStatus,
} from '@modules/installments/domain/installment.entity';
import { InstallmentRepository } from '@modules/installments/infrastructure/installment.repository';
import { InstallmentService } from '@modules/installments/application/services/installment.service';
import {
  resolveSalePaymentStatusFromReceived,
  saleAmountPaidField,
} from './sale-payment-status.util';
import { CreateSaleReturnDto } from './dto/create-sale-return.dto';
import type { TransactionBackorderMetadata } from '@modules/transactions/domain/transaction-backorder.metadata';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  CreateTransactionDto,
  CreateTransactionLineDto,
} from '@modules/transactions/application/dto/create-transaction.dto';
import { CompaniesService } from '@modules/companies/application/companies.service';
import { PromotionsService } from '@modules/promotions/application/promotions.service';
import { applyPromotions } from '@modules/promotions/application/discount-engine';
import type { AppliedSnapshot } from '@modules/promotions/application/discount-engine.types';
import { Promotion } from '@modules/promotions/domain/promotion.entity';
import { PromotionRedemption } from '@modules/promotions/domain/promotion-redemption.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { CustomerPaymentSourcesService } from '@modules/customers/application/customer-payment-sources.service';
import { CustomersService } from '@modules/customers/application/customers.service';
import { StockCommitmentService } from '@modules/stock-levels/application/stock-commitment.service';
import { BackorderRegistrationService } from '@modules/transactions/application/backorder-registration.service';
import { EshopBackorderSyncService } from '@modules/transactions/application/eshop-backorder-sync.service';
import { MercadoPagoSalePaymentService } from '@modules/payment-gateways/application/mercado-pago-sale-payment.service';
import { PresaleTicketsService } from '@modules/presale-tickets/application/presale-tickets.service';
import {
  PresaleTicket,
  PresaleTicketStatus,
} from '@modules/presale-tickets/domain/presale-ticket.entity';
import {
  readAcceptsPresaleTickets,
  readPosKind,
} from '@modules/points-of-sale/domain/pos-settings.types';
import { computeCashSessionExpectedAmount } from './cash-session-expected-amount.util';
import {
  buildPaymentSnapshotsFromSalePayments,
  buildPaymentsMetadataFields,
  getRepresentativePaymentMethod,
  type SalePaymentInput,
} from '@modules/transactions/application/payment-snapshots.util';

type PosCommercialRegisterConfig = {
  transactionType:
    | TransactionType.SALE
    | TransactionType.BACKORDER
    | TransactionType.SALE_RETURN;
  skipStockCheck: boolean;
  /** Devolución: no validar stock disponible (entrada de inventario). */
  skipStockAvailabilityCheck?: boolean;
  originalSaleId?: string;
  /** Devolución: reembolso en caja con medios de pago (salida de efectivo). */
  immediateRefund?: boolean;
  backorderDepositAmount?: number;
  backorderDepositPercent?: number;
  /** Venta que liquida un encargo/reserva abierto. */
  fulfillBackorderId?: string;
  /** Venta que cobra uno o más tickets de preventa. */
  fulfillPresaleTicketIds?: string[];
  /** Venta POS sin cobro inmediato (cuenta por cobrar / cobro posterior). */
  deferPayment?: boolean;
};

/**
 * SalesFromSessionService - Single Responsibility: Sale Transaction Creation
 *
 * Responsabilidades:
 * - Crear transacciones SALE desde una sesión de caja
 * - Gestionar líneas de venta (add, update, delete)
 * - Queries de ventas por sesión
 *
 * Delegaciones:
 * - Transacción atómica + asientos → TransactionsService.createTransaction()
 * - Validaciones V1-V7 → TransactionsService (enforced at creation)
 * - Stock management → SessionInventoryService
 *
 * IMPORTANTE: Cada SALE que se crea aquí genera automáticamente:
 * - 1 Transaction record (SALE type)
 * - N TransactionLine records (1 per product)
 * - M LedgerEntry records (auto-generated via TransactionsService)
 * - Validation gates V1-V7 enforced
 * - Audit trail recorded
 */
@Injectable()
export class SalesFromSessionService {
  private readonly logger = new Logger(SalesFromSessionService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionLine)
    private readonly transactionLineRepository: Repository<TransactionLine>,
    @InjectRepository(CashSession)
    private readonly cashSessionRepository: Repository<CashSession>,
    @InjectRepository(PointOfSale)
    private readonly pointOfSaleRepository: Repository<PointOfSale>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>,
    private readonly dataSource: DataSource,
    private readonly transactionsService: TransactionsService,
    private readonly companiesService: CompaniesService,
    private readonly promotionsService: PromotionsService,
    private readonly variantQuantityConversion: VariantQuantityConversionService,
    private readonly customerPaymentSourcesService: CustomerPaymentSourcesService,
    private readonly customersService: CustomersService,
    private readonly stockCommitment: StockCommitmentService,
    private readonly backorderRegistration: BackorderRegistrationService,
    private readonly eshopBackorderSync: EshopBackorderSyncService,
    private readonly installmentRepository: InstallmentRepository,
    private readonly installmentService: InstallmentService,
    private readonly mpSalePayment: MercadoPagoSalePaymentService,
    private readonly presaleTicketsService: PresaleTicketsService,
  ) {}

  /**
   * Query: Obtener todas las ventas de una sesión
   */
  async getSalesForSession(cashSessionId: string) {
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
      amount: transaction.total, // ✅ FIXED: usar total, no taxAmount
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
          totalAmount: line.total, // ✅ FIXED: usar line.total
        })) || [],
    }));

    return {
      success: true,
      cashSessionId,
      totalSales: sales.length,
      sales: mappedSales,
    };
  }

  /**
   * Crear una nueva SALE desde sesión de caja
   *
   * IMPORTANTE DELEGACIÓN: Esta función crea la transacción PERO DELEGA
   * la generación de asientos a TransactionsService.createTransaction()
   *
   * Flujo:
   * 1. Validaciones básicas (líneas no vacías, etc)
   * 2. Validar usuario, POS, sesión
   * 3. Validar productos/variantes
   * 4. Calcular totales (subtotal, tax, discount, total)
   * 5. Crear Transaction en BD
   * 6. Crear TransactionLine records
   * 7. Delegar a TransactionsService.createTransaction() para:
   *    - Generar documentNumber único
   *    - Validaciones V1-V7 (saldo cliente, inventario, etc)
   *    - Generación automática de asientos
   *    - Audit trail
   * 8. Reservar stock (SessionInventoryService)
   * 9. Retornar transacción con asientos
   */
  async createSale(createSaleDto: CreateSaleDto) {
    const fulfillBackorderId = createSaleDto.fulfillBackorderId?.trim() || undefined;
    const fulfillPresaleTicketIds = [
      ...new Set(
        [
          ...(createSaleDto.fulfillPresaleTicketIds ?? []),
          ...(createSaleDto.fulfillPresaleTicketId
            ? [createSaleDto.fulfillPresaleTicketId]
            : []),
        ]
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];
    if (fulfillBackorderId && fulfillPresaleTicketIds.length > 0) {
      throw new BadRequestException(
        'No se puede liquidar encargo y ticket de preventa en la misma venta.',
      );
    }
    if (createSaleDto.deferPayment && fulfillBackorderId) {
      throw new BadRequestException(
        'No se puede diferir el cobro al liquidar un encargo.',
      );
    }
    if (createSaleDto.deferPayment && fulfillPresaleTicketIds.length > 0) {
      throw new BadRequestException(
        'No se puede diferir el cobro al cobrar un ticket de preventa.',
      );
    }
    return this.registerPosCommercial(createSaleDto, {
      transactionType: TransactionType.SALE,
      skipStockCheck: false,
      skipStockAvailabilityCheck: Boolean(fulfillBackorderId),
      fulfillBackorderId,
      fulfillPresaleTicketIds,
      deferPayment: Boolean(createSaleDto.deferPayment),
    });
  }

  /**
   * Cobro consolidado de ventas POS con saldo pendiente (cuenta por cobrar).
   * Un PAYMENT_IN con allocations en metadata; no crea ventas nuevas.
   */
  async collectPendingSales(dto: CollectPendingSalesDto) {
    const customerId = dto.customerId.trim();
    const saleIds = [
      ...new Set(
        (dto.saleTransactionIds ?? [])
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];
    if (!customerId) {
      throw new BadRequestException('customerId es obligatorio');
    }
    if (saleIds.length === 0) {
      throw new BadRequestException('Debes indicar al menos una venta a cobrar');
    }

    const paymentsForCollect = (dto.payments ?? []).filter(
      (p) => (Number(p.amount) || 0) > 0,
    );
    if (paymentsForCollect.length === 0) {
      throw new BadRequestException(
        'Debes enviar al menos un pago con monto > 0 en payments.',
      );
    }

    const pointOfSale = await this.pointOfSaleRepository.findOne({
      where: { id: dto.pointOfSaleId, deletedAt: IsNull() },
    });
    if (!pointOfSale?.branchId) {
      throw new BadRequestException('Punto de venta sin sucursal');
    }
    const user = await this.userRepository.findOne({
      where: { userName: dto.userName, deletedAt: IsNull() },
    });
    if (!user) {
      throw new NotFoundException(`Usuario ${dto.userName} no encontrado`);
    }

    const cashSession = await this.cashSessionRepository.findOne({
      where: { id: dto.cashSessionId },
    });
    if (!cashSession) {
      throw new NotFoundException(
        `Sesión de caja ${dto.cashSessionId} no encontrada`,
      );
    }
    if (cashSession.status !== CashSessionStatus.OPEN) {
      throw new ConflictException(
        `La sesión de caja está en estado ${cashSession.status}, no se pueden registrar operaciones`,
      );
    }

    const sales = await this.transactionRepository.find({
      where: { id: In(saleIds) },
    });
    if (sales.length !== saleIds.length) {
      throw new NotFoundException('Una o más ventas no existen');
    }

    const allocations: Array<{
      saleId: string;
      documentNumber: string;
      amount: number;
    }> = [];
    let balanceTotal = 0;

    for (const sale of sales) {
      if (sale.customerId?.trim() !== customerId) {
        throw new BadRequestException(
          'Todas las ventas deben pertenecer al mismo cliente.',
        );
      }
      if (
        !isSaleCollectible({
          transactionType: sale.transactionType,
          paymentStatus: sale.paymentStatus,
          total: Number(sale.total),
          amountPaid: Number(sale.amountPaid),
        })
      ) {
        throw new BadRequestException(
          `La venta ${sale.documentNumber ?? sale.id} no tiene saldo pendiente de cobro.`,
        );
      }
      const due = saleBalanceDue(Number(sale.total), Number(sale.amountPaid));
      balanceTotal += due;
      allocations.push({
        saleId: sale.id,
        documentNumber: sale.documentNumber ?? '',
        amount: due,
      });
    }

    const paidTotal = paymentsForCollect.reduce(
      (acc, p) => acc + (Number(p.amount) || 0),
      0,
    );
    // Cobro AR: debe cubrir al menos el saldo seleccionado; el exceso en efectivo es vuelto.
    if (paidTotal + 1 < balanceTotal) {
      throw new BadRequestException(
        `El total recibido (${Math.round(paidTotal)}) es menor al saldo a cobrar (${Math.round(balanceTotal)}).`,
      );
    }

    const salePaymentInputs: SalePaymentInput[] = paymentsForCollect.map((p) => ({
      paymentMethod: p.paymentMethod,
      amount: Number(p.amount) || 0,
      companyPaymentMethodId: p.companyPaymentMethodId,
      bankAccountId: p.bankAccountId,
      reference: p.reference,
      checkData: p.checkData as Record<string, unknown> | undefined,
      creditNoteTransactionId: p.creditNoteTransactionId,
      backorderTransactionId: p.backorderTransactionId,
    }));

    for (const p of paymentsForCollect) {
      const method = (p.paymentMethod ?? '').trim().toUpperCase();
      if (method === PaymentMethod.INTERNAL_CREDIT) {
        throw new BadRequestException(
          'El cobro de ventas pendientes no admite crédito interno.',
        );
      }
      if (p.backorderTransactionId?.trim()) {
        throw new BadRequestException(
          'El cobro de ventas pendientes no admite abono de encargo como medio.',
        );
      }
    }

    await this.customerPaymentSourcesService.validatePaymentsForCustomer(
      customerId,
      paymentsForCollect,
    );

    let catalog: Awaited<ReturnType<CompaniesService['getPaymentMethods']>> = [];
    try {
      if (pointOfSale.companyId) {
        catalog = await this.companiesService.getPaymentMethods(
          pointOfSale.companyId,
        );
      }
    } catch {
      catalog = [];
    }

    const paymentSnapshots = buildPaymentSnapshotsFromSalePayments(
      salePaymentInputs,
      catalog,
    );
    const finalPaymentMethod = getRepresentativePaymentMethod(
      paymentSnapshots,
      PaymentMethod.CASH,
    );

    const changeAmount = Math.max(0, paidTotal - balanceTotal);

    return this.dataSource.transaction(async (manager) => {
      const paymentInDto = new CreateTransactionDto();
      Object.assign(paymentInDto, {
        transactionType: TransactionType.PAYMENT_IN,
        branchId: pointOfSale.branchId,
        userId: user.id,
        pointOfSaleId: pointOfSale.id,
        cashSessionId: cashSession.id,
        customerId,
        relatedTransactionId: allocations[0]?.saleId ?? undefined,
        subtotal: paidTotal,
        taxAmount: 0,
        discountAmount: 0,
        total: paidTotal,
        paymentMethod: finalPaymentMethod,
        paymentStatus: PaymentStatus.PAID,
        amountPaid: paidTotal,
        changeAmount,
        metadata: {
          source: 'pos_ar_collection',
          allocations,
          ...buildPaymentsMetadataFields(paymentSnapshots),
        },
      });
      paymentInDto.lines = [];
      const paymentIn =
        await this.transactionsService.createTransaction(paymentInDto);

      for (const alloc of allocations) {
        const sale = sales.find((s) => s.id === alloc.saleId);
        if (!sale) continue;
        const newPaid = Math.round(Number(sale.total) || 0);
        await manager.getRepository(Transaction).update(alloc.saleId, {
          amountPaid: newPaid,
          paymentStatus: PaymentStatus.PAID,
        });
      }

      await this.customerPaymentSourcesService.applyPaymentsToSources(
        customerId,
        paymentsForCollect,
        paymentIn.id,
      );

      return {
        success: true,
        paymentIn: {
          id: paymentIn.id,
          documentNumber: paymentIn.documentNumber,
          total: paidTotal,
        },
        allocations,
      };
    });
  }

  async collectPendingQuotas(dto: CollectPendingQuotasDto) {
    const customerId = dto.customerId.trim();
    const installmentIds = [
      ...new Set(
        (dto.installmentIds ?? []).map((id) => id.trim()).filter(Boolean),
      ),
    ];
    if (!customerId) {
      throw new BadRequestException('customerId es obligatorio');
    }
    if (installmentIds.length === 0) {
      throw new BadRequestException('Debes indicar al menos una cuota a cobrar');
    }

    const paymentsForCollect = (dto.payments ?? []).filter(
      (p) => (Number(p.amount) || 0) > 0,
    );
    if (paymentsForCollect.length === 0) {
      throw new BadRequestException(
        'Debes enviar al menos un pago con monto > 0 en payments.',
      );
    }

    const pointOfSale = await this.pointOfSaleRepository.findOne({
      where: { id: dto.pointOfSaleId, deletedAt: IsNull() },
    });
    if (!pointOfSale?.branchId) {
      throw new BadRequestException('Punto de venta sin sucursal');
    }
    const user = await this.userRepository.findOne({
      where: { userName: dto.userName, deletedAt: IsNull() },
    });
    if (!user) {
      throw new NotFoundException(`Usuario ${dto.userName} no encontrado`);
    }

    const cashSession = await this.cashSessionRepository.findOne({
      where: { id: dto.cashSessionId },
    });
    if (!cashSession) {
      throw new NotFoundException(
        `Sesión de caja ${dto.cashSessionId} no encontrada`,
      );
    }
    if (cashSession.status !== CashSessionStatus.OPEN) {
      throw new ConflictException(
        `La sesión de caja está en estado ${cashSession.status}, no se pueden registrar operaciones`,
      );
    }

    const installments = await this.installmentRepository.find({
      where: { id: In(installmentIds) },
      relations: ['saleTransaction'],
    });
    if (installments.length !== installmentIds.length) {
      throw new NotFoundException('Una o más cuotas no existen');
    }

    const allocations: Array<{
      installmentId: string;
      saleTransactionId: string;
      documentNumber: string;
      amount: number;
    }> = [];
    let balanceTotal = 0;

    for (const installment of installments) {
      const saleCustomerId = installment.saleTransaction?.customerId?.trim();
      if (!saleCustomerId || saleCustomerId !== customerId) {
        throw new BadRequestException(
          'Todas las cuotas deben pertenecer al mismo cliente.',
        );
      }
      if (!isInstallmentCollectible(installment)) {
        throw new BadRequestException(
          `La cuota ${installment.installmentNumber} no tiene saldo pendiente de cobro.`,
        );
      }
      const due = installmentPendingAmount(installment);
      balanceTotal += due;
      allocations.push({
        installmentId: installment.id,
        saleTransactionId: resolveInstallmentSaleId(installment) ?? '',
        documentNumber: installment.saleTransaction?.documentNumber ?? '',
        amount: due,
      });
    }

    const paidTotal = paymentsForCollect.reduce(
      (acc, p) => acc + (Number(p.amount) || 0),
      0,
    );
    if (paidTotal + 1 < balanceTotal) {
      throw new BadRequestException(
        `El total recibido (${Math.round(paidTotal)}) es menor al saldo a cobrar (${Math.round(balanceTotal)}).`,
      );
    }

    const salePaymentInputs: SalePaymentInput[] = paymentsForCollect.map((p) => ({
      paymentMethod: p.paymentMethod,
      amount: Number(p.amount) || 0,
      companyPaymentMethodId: p.companyPaymentMethodId,
      bankAccountId: p.bankAccountId,
      reference: p.reference,
      checkData: p.checkData as Record<string, unknown> | undefined,
      creditNoteTransactionId: p.creditNoteTransactionId,
      backorderTransactionId: p.backorderTransactionId,
    }));

    for (const p of paymentsForCollect) {
      const method = (p.paymentMethod ?? '').trim().toUpperCase();
      if (method === PaymentMethod.INTERNAL_CREDIT) {
        throw new BadRequestException(
          'El cobro de cuotas no admite crédito interno.',
        );
      }
      if (p.backorderTransactionId?.trim()) {
        throw new BadRequestException(
          'El cobro de cuotas no admite abono de encargo como medio.',
        );
      }
    }

    await this.customerPaymentSourcesService.validatePaymentsForCustomer(
      customerId,
      paymentsForCollect,
    );

    let catalog: Awaited<ReturnType<CompaniesService['getPaymentMethods']>> = [];
    try {
      if (pointOfSale.companyId) {
        catalog = await this.companiesService.getPaymentMethods(
          pointOfSale.companyId,
        );
      }
    } catch {
      catalog = [];
    }

    const paymentSnapshots = buildPaymentSnapshotsFromSalePayments(
      salePaymentInputs,
      catalog,
    );
    const finalPaymentMethod = getRepresentativePaymentMethod(
      paymentSnapshots,
      PaymentMethod.CASH,
    );

    const changeAmount = Math.max(0, paidTotal - balanceTotal);

    return this.dataSource.transaction(async (manager) => {
      const paymentInDto = new CreateTransactionDto();
      Object.assign(paymentInDto, {
        transactionType: TransactionType.PAYMENT_IN,
        branchId: pointOfSale.branchId,
        userId: user.id,
        pointOfSaleId: pointOfSale.id,
        cashSessionId: cashSession.id,
        customerId,
        relatedTransactionId: allocations[0]?.saleTransactionId || undefined,
        subtotal: paidTotal,
        taxAmount: 0,
        discountAmount: 0,
        total: paidTotal,
        paymentMethod: finalPaymentMethod,
        paymentStatus: PaymentStatus.PAID,
        amountPaid: paidTotal,
        changeAmount,
        metadata: {
          source: 'pos_quota_collection',
          allocations,
          ...buildPaymentsMetadataFields(paymentSnapshots),
        },
      });
      paymentInDto.lines = [];
      const paymentIn =
        await this.transactionsService.createTransaction(paymentInDto);

      const installmentRepo = manager.getRepository(Installment);
      const affectedSaleIds = new Set<string>();

      for (const alloc of allocations) {
        const installment = installments.find((i) => i.id === alloc.installmentId);
        if (!installment) continue;

        const newAmountPaid =
          Math.round(Number(installment.amountPaid) || 0) + alloc.amount;
        const installmentTotal = Math.round(Number(installment.amount) || 0);
        let status = installment.status;
        if (newAmountPaid >= installmentTotal) {
          status = InstallmentStatus.PAID;
        } else if (newAmountPaid > 0) {
          status = InstallmentStatus.PARTIAL;
        }

        await installmentRepo.update(alloc.installmentId, {
          amountPaid: newAmountPaid,
          paymentTransactionId: paymentIn.id,
          status,
        });

        const saleId = alloc.saleTransactionId?.trim();
        if (saleId) affectedSaleIds.add(saleId);
      }

      for (const saleId of affectedSaleIds) {
        await this.syncSalePaymentStatusFromInstallments(manager, saleId);
      }

      await this.customerPaymentSourcesService.applyPaymentsToSources(
        customerId,
        paymentsForCollect,
        paymentIn.id,
      );

      return {
        success: true,
        paymentIn: {
          id: paymentIn.id,
          documentNumber: paymentIn.documentNumber,
          total: paidTotal,
        },
        allocations,
      };
    });
  }

  private async syncSalePaymentStatusFromInstallments(
    manager: EntityManager,
    saleId: string,
  ): Promise<void> {
    const sale = await manager.getRepository(Transaction).findOne({
      where: { id: saleId },
    });
    if (!sale || sale.transactionType !== TransactionType.SALE) return;

    const installments = await manager.getRepository(Installment).find({
      where: [
        { saleTransactionId: saleId, sourceType: InstallmentSourceType.SALE },
        { sourceTransactionId: saleId, sourceType: InstallmentSourceType.SALE },
      ],
    });
    if (installments.length === 0) return;

    const totalPaid = installments.reduce(
      (acc, inst) => acc + Math.round(Number(inst.amountPaid) || 0),
      0,
    );
    const saleTotal = Math.round(Number(sale.total) || 0);
    const allPaid = installments.every(
      (inst) => inst.status === InstallmentStatus.PAID,
    );

    if (allPaid || totalPaid >= saleTotal - 1) {
      await manager.getRepository(Transaction).update(saleId, {
        amountPaid: saleTotal,
        paymentStatus: PaymentStatus.PAID,
      });
      return;
    }

    if (totalPaid > 0) {
      await manager.getRepository(Transaction).update(saleId, {
        amountPaid: totalPaid,
        paymentStatus: PaymentStatus.PARTIAL,
      });
    }
  }

  /**
   * Devolución en caja del saldo disponible de notas de crédito del cliente (100 % del disponible por NC).
   * Transacción CUSTOMER_CREDIT_NOTE_PAYOUT; el efectivo sale de caja (ver expected-amount util).
   */
  async payoutCustomerCreditNotes(dto: PayoutCustomerCreditNotesDto) {
    const customerId = dto.customerId.trim();
    const ncIds = [
      ...new Set(
        (dto.creditNoteTransactionIds ?? [])
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];
    if (!customerId) {
      throw new BadRequestException('customerId es obligatorio');
    }
    if (ncIds.length === 0) {
      throw new BadRequestException(
        'Debes indicar al menos una nota de crédito a liquidar',
      );
    }

    const paymentsForPayout = (dto.payments ?? []).filter(
      (p) => (Number(p.amount) || 0) > 0,
    );
    if (paymentsForPayout.length === 0) {
      throw new BadRequestException(
        'Debes enviar al menos un pago con monto > 0 en payments.',
      );
    }

    const pointOfSale = await this.pointOfSaleRepository.findOne({
      where: { id: dto.pointOfSaleId, deletedAt: IsNull() },
    });
    if (!pointOfSale?.branchId) {
      throw new BadRequestException('Punto de venta sin sucursal');
    }
    const user = await this.userRepository.findOne({
      where: { userName: dto.userName, deletedAt: IsNull() },
    });
    if (!user) {
      throw new NotFoundException(`Usuario ${dto.userName} no encontrado`);
    }

    const cashSession = await this.cashSessionRepository.findOne({
      where: { id: dto.cashSessionId },
    });
    if (!cashSession) {
      throw new NotFoundException(
        `Sesión de caja ${dto.cashSessionId} no encontrada`,
      );
    }
    if (cashSession.status !== CashSessionStatus.OPEN) {
      throw new ConflictException(
        `La sesión de caja está en estado ${cashSession.status}, no se pueden registrar operaciones`,
      );
    }

    const sources =
      await this.customerPaymentSourcesService.listForCustomer(customerId);
    const ncById = new Map(sources.creditNotes.map((r) => [r.id, r]));

    const allocations: Array<{
      creditNoteId: string;
      documentNumber: string;
      amount: number;
    }> = [];
    let balanceTotal = 0;

    for (const ncId of ncIds) {
      const row = ncById.get(ncId);
      if (!row) {
        throw new BadRequestException(
          `La nota de crédito ${ncId} no está disponible para este cliente.`,
        );
      }
      const amount = Math.round(row.availableAmount);
      if (amount < 1) {
        throw new BadRequestException(
          `La nota de crédito ${row.documentNumber} no tiene saldo disponible.`,
        );
      }
      balanceTotal += amount;
      allocations.push({
        creditNoteId: ncId,
        documentNumber: row.documentNumber,
        amount,
      });
    }

    const paidTotal = paymentsForPayout.reduce(
      (acc, p) => acc + (Number(p.amount) || 0),
      0,
    );
    if (Math.abs(paidTotal - balanceTotal) > 1) {
      throw new BadRequestException(
        `La suma de medios de pago (${Math.round(paidTotal)}) debe coincidir con el total a devolver (${Math.round(balanceTotal)}).`,
      );
    }

    const ncPayoutAllowed = new Set<string>([
      PaymentMethod.CASH,
      PaymentMethod.TRANSFER,
      PaymentMethod.CHECK,
    ]);

    for (const p of paymentsForPayout) {
      const method = (p.paymentMethod ?? '').trim().toUpperCase();
      if (!ncPayoutAllowed.has(method)) {
        throw new BadRequestException(
          'La devolución de saldo NC solo admite efectivo, transferencia o cheque.',
        );
      }
      if (method === PaymentMethod.INTERNAL_CREDIT) {
        throw new BadRequestException(
          'La devolución de notas de crédito no admite crédito interno.',
        );
      }
      if (method === PaymentMethod.CUSTOMER_CREDIT_NOTE) {
        throw new BadRequestException(
          'No puede usar otra nota de crédito como medio de devolución.',
        );
      }
      if (p.backorderTransactionId?.trim()) {
        throw new BadRequestException(
          'La devolución de notas de crédito no admite abono de encargo.',
        );
      }
      if (p.creditNoteTransactionId?.trim()) {
        throw new BadRequestException(
          'La devolución de notas de crédito no admite nota de crédito como medio.',
        );
      }
    }

    const salePaymentInputs: SalePaymentInput[] = paymentsForPayout.map((p) => ({
      paymentMethod: p.paymentMethod,
      amount: Number(p.amount) || 0,
      companyPaymentMethodId: p.companyPaymentMethodId,
      bankAccountId: p.bankAccountId,
      reference: p.reference,
      checkData: p.checkData as Record<string, unknown> | undefined,
    }));

    let catalog: Awaited<ReturnType<CompaniesService['getPaymentMethods']>> = [];
    try {
      if (pointOfSale.companyId) {
        catalog = await this.companiesService.getPaymentMethods(
          pointOfSale.companyId,
        );
      }
    } catch {
      catalog = [];
    }

    const paymentSnapshots = buildPaymentSnapshotsFromSalePayments(
      salePaymentInputs,
      catalog,
    );
    const finalPaymentMethod = getRepresentativePaymentMethod(
      paymentSnapshots,
      PaymentMethod.CASH,
    );

    return this.dataSource.transaction(async () => {
      const payoutDto = new CreateTransactionDto();
      Object.assign(payoutDto, {
        transactionType: TransactionType.CUSTOMER_CREDIT_NOTE_PAYOUT,
        branchId: pointOfSale.branchId,
        userId: user.id,
        pointOfSaleId: pointOfSale.id,
        cashSessionId: cashSession.id,
        customerId,
        relatedTransactionId: allocations[0]?.creditNoteId ?? undefined,
        subtotal: paidTotal,
        taxAmount: 0,
        discountAmount: 0,
        total: paidTotal,
        paymentMethod: finalPaymentMethod,
        paymentStatus: PaymentStatus.PAID,
        amountPaid: paidTotal,
        changeAmount: 0,
        metadata: {
          allocations,
          ...buildPaymentsMetadataFields(paymentSnapshots),
        },
      });
      payoutDto.lines = [];
      const payoutTx =
        await this.transactionsService.createTransaction(payoutDto);

      for (const alloc of allocations) {
        await this.customerPaymentSourcesService.consumeCreditNoteForPayout(
          alloc.creditNoteId,
          alloc.amount,
          payoutTx.id,
          customerId,
        );
      }

      return {
        success: true,
        payout: {
          id: payoutTx.id,
          documentNumber: payoutTx.documentNumber,
          total: paidTotal,
        },
        allocations,
      };
    });
  }

  /**
   * Encargo / reserva: transacción BACKORDER (no SALE), sin movimiento de stock.
   * Líneas y promociones como venta; `amountPaid` = abono cobrado.
   */
  /**
   * Devolución de venta (SALE_RETURN) desde POS.
   * `immediateRefund`: medios de pago y salida de efectivo en sesión de caja.
   */
  async createSaleReturn(
    createSaleReturnDto: CreateSaleReturnDto,
    opts?: { immediateRefund?: boolean },
  ) {
    const immediateRefund = opts?.immediateRefund === true;
    const originalSaleId = createSaleReturnDto.originalSaleId?.trim();
    if (!originalSaleId) {
      throw new BadRequestException('originalSaleId es requerido');
    }
    if (!createSaleReturnDto.customerId?.trim()) {
      throw new BadRequestException('customerId es requerido para la devolución');
    }
    const hasPaidLines = (createSaleReturnDto.payments ?? []).some(
      (p) => (Number(p.amount) || 0) > 0,
    );
    if (immediateRefund && !hasPaidLines) {
      throw new BadRequestException(
        'El reembolso inmediato requiere al menos un medio de pago con monto mayor que cero.',
      );
    }
    if (!immediateRefund && hasPaidLines) {
      throw new BadRequestException(
        'La devolución en modo documento no admite pagos. Use el endpoint de reembolso inmediato.',
      );
    }
    if (immediateRefund && hasPaidLines) {
      for (const p of createSaleReturnDto.payments ?? []) {
        if ((Number(p.amount) || 0) <= 0) continue;
        const method = String(p.paymentMethod ?? '')
          .trim()
          .toUpperCase();
        if (
          method === PaymentMethod.CREDIT_CARD ||
          method === PaymentMethod.DEBIT_CARD
        ) {
          throw new BadRequestException(
            'El reembolso inmediato no admite tarjeta de crédito ni débito. Use efectivo, transferencia o cheque.',
          );
        }
      }
    }
    await this.assertReturnQuantitiesAllowed(
      originalSaleId,
      createSaleReturnDto.lines.map((l) => ({
        productVariantId: l.productVariantId,
        quantity: Number(l.quantity) || 0,
      })),
    );
    return this.registerPosCommercial(createSaleReturnDto, {
      transactionType: TransactionType.SALE_RETURN,
      skipStockCheck: false,
      skipStockAvailabilityCheck: true,
      originalSaleId,
      immediateRefund,
    });
  }

  /**
   * Modo documento: SALE_RETURN + CUSTOMER_CREDIT_NOTE (sin reembolso en caja).
   */
  async confirmCustomerReturnWithCreditNote(dto: CreateSaleReturnDto) {
    return this.confirmCustomerReturnWithCreditNoteCore(dto, false);
  }

  /**
   * Reembolso inmediato: SALE_RETURN con pagos + CUSTOMER_CREDIT_NOTE + salida de caja.
   */
  async confirmCustomerReturnWithImmediateRefund(dto: CreateSaleReturnDto) {
    return this.confirmCustomerReturnWithCreditNoteCore(dto, true);
  }

  private async confirmCustomerReturnWithCreditNoteCore(
    dto: CreateSaleReturnDto,
    immediateRefund: boolean,
  ) {
    const originalSaleId = dto.originalSaleId?.trim();
    if (!originalSaleId) {
      throw new BadRequestException('originalSaleId es requerido');
    }
    const originalSale = await this.transactionRepository.findOne({
      where: {
        id: originalSaleId,
        transactionType: TransactionType.SALE,
      },
    });
    if (!originalSale) {
      throw new NotFoundException('Venta origen no encontrada');
    }

    const saleReturnResult = await this.createSaleReturn(dto, {
      immediateRefund,
    });
    const srTx = saleReturnResult.transaction;

    const pointOfSale = await this.pointOfSaleRepository.findOne({
      where: { id: dto.pointOfSaleId, deletedAt: IsNull() },
    });
    if (!pointOfSale?.branchId) {
      throw new BadRequestException('Punto de venta sin sucursal');
    }
    const user = await this.userRepository.findOne({
      where: { userName: dto.userName, deletedAt: IsNull() },
    });
    if (!user) {
      throw new NotFoundException(`Usuario ${dto.userName} no encontrado`);
    }

    const creditNote = await this.createCustomerCreditNoteForReturn({
      saleReturnId: srTx.id,
      saleId: originalSaleId,
      saleDocumentNumber: originalSale.documentNumber,
      customerId: dto.customerId!.trim(),
      branchId: pointOfSale.branchId,
      userId: user.id,
      pointOfSaleId: pointOfSale.id,
      cashSessionId: dto.cashSessionId,
      subtotal: Number(srTx.subtotal ?? saleReturnResult.lines.reduce((a, l) => a + Number(l.subtotal ?? 0), 0)),
      taxAmount: Number(srTx.taxAmount ?? 0),
      discountAmount: Number(srTx.discountAmount ?? 0),
      total: Number(srTx.total),
    });

    return {
      success: true,
      originalSale: {
        id: originalSale.id,
        documentNumber: originalSale.documentNumber,
      },
      saleReturn: {
        id: srTx.id,
        documentNumber: srTx.documentNumber,
        total: Number(srTx.total),
        subtotal: Number(srTx.subtotal ?? 0),
        taxAmount: Number(srTx.taxAmount ?? 0),
        discountAmount: Number(srTx.discountAmount ?? 0),
      },
      creditNote: {
        id: creditNote.id,
        documentNumber: creditNote.documentNumber,
        total: Number(creditNote.total),
      },
    };
  }

  private async assertReturnQuantitiesAllowed(
    originalSaleId: string,
    lines: Array<{ productVariantId: string; quantity: number }>,
  ): Promise<void> {
    const sale = await this.transactionRepository.findOne({
      where: { id: originalSaleId, transactionType: TransactionType.SALE },
      relations: ['lines'],
    });
    if (!sale) {
      throw new NotFoundException('Venta origen no encontrada');
    }

    const soldByVariant = new Map<string, number>();
    for (const sl of sale.lines ?? []) {
      const vid = sl.productVariantId?.trim();
      if (!vid) continue;
      const q = Number(sl.quantity) || 0;
      soldByVariant.set(vid, (soldByVariant.get(vid) ?? 0) + q);
    }

    const priorReturns = await this.transactionRepository.find({
      where: {
        relatedTransactionId: originalSaleId,
        transactionType: TransactionType.SALE_RETURN,
      },
      relations: ['lines'],
    });
    const returnedByVariant = new Map<string, number>();
    for (const pr of priorReturns) {
      for (const rl of pr.lines ?? []) {
        const vid = rl.productVariantId?.trim();
        if (!vid) continue;
        const q = Number(rl.quantity) || 0;
        returnedByVariant.set(vid, (returnedByVariant.get(vid) ?? 0) + q);
      }
    }

    for (const line of lines) {
      const vid = line.productVariantId?.trim();
      const qty = Number(line.quantity) || 0;
      if (!vid || qty <= 0) continue;
      const sold = soldByVariant.get(vid) ?? 0;
      if (sold <= 0) {
        throw new BadRequestException(
          `La variante ${vid} no pertenece a la venta origen.`,
        );
      }
      const already = returnedByVariant.get(vid) ?? 0;
      if (already + qty > sold + 0.0001) {
        throw new BadRequestException(
          `Cantidad a devolver excede lo vendido para la variante ${vid} (vendido: ${sold}, ya devuelto: ${already}, solicitud: ${qty}).`,
        );
      }
    }
  }

  private async createCustomerCreditNoteForReturn(params: {
    saleReturnId: string;
    saleId: string;
    saleDocumentNumber?: string;
    customerId: string;
    branchId: string;
    userId: string;
    pointOfSaleId?: string;
    cashSessionId?: string;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
  }) {
    const dto = new CreateTransactionDto();
    Object.assign(dto, {
      transactionType: TransactionType.CUSTOMER_CREDIT_NOTE,
      branchId: params.branchId,
      userId: params.userId,
      customerId: params.customerId,
      pointOfSaleId: params.pointOfSaleId,
      cashSessionId: params.cashSessionId,
      relatedTransactionId: params.saleReturnId,
      subtotal: params.subtotal,
      taxAmount: params.taxAmount,
      discountAmount: params.discountAmount,
      total: params.total,
      paymentMethod: PaymentMethod.CASH,
      amountPaid: 0,
      notes: params.saleDocumentNumber
        ? `NC por devolución · venta ${params.saleDocumentNumber}`
        : undefined,
      metadata: {
        origin: 'CUSTOMER_CREDIT_NOTE',
        links: {
          saleReturnId: params.saleReturnId,
          saleId: params.saleId,
        },
      },
      lines: [],
    });
    return this.transactionsService.createTransaction(dto);
  }

  async createBackorder(createBackorderDto: CreateBackorderDto) {
    if (!createBackorderDto.customerId?.trim()) {
      throw new BadRequestException('El encargo requiere un cliente');
    }
    const deposit = Math.round(
      Number(createBackorderDto.backorderDepositAmount) || 0,
    );
    if (deposit < 0) {
      throw new BadRequestException('El abono del encargo no puede ser negativo');
    }
    return this.registerPosCommercial(createBackorderDto, {
      transactionType: TransactionType.BACKORDER,
      skipStockCheck: true,
      backorderDepositAmount: deposit,
      backorderDepositPercent: createBackorderDto.backorderDepositPercent,
    });
  }

  private async registerPosCommercial(
    createSaleDto: CreateSaleDto,
    config: PosCommercialRegisterConfig,
  ) {
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
      promotionSnapshot,
    } = createSaleDto;

    /** Medios con monto > 0: montos en cero no cuentan como uso en la venta. */
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

    const isSaleReturn = config.transactionType === TransactionType.SALE_RETURN;
    const immediateReturnRefund =
      isSaleReturn && config.immediateRefund === true;
    const isSale = config.transactionType === TransactionType.SALE;
    const deferPayment = isSale && Boolean(config.deferPayment);
    const customerIdTrimmedEarly = customerId?.trim() ?? '';

    if (deferPayment && !customerIdTrimmedEarly) {
      throw new BadRequestException(
        'La venta sin pago inmediato requiere un cliente.',
      );
    }

    const paymentsUsed =
      deferPayment || (isSaleReturn && !immediateReturnRefund)
        ? []
        : (paymentsForSale ?? []);

    if (
      !isSaleReturn &&
      !deferPayment &&
      paymentsUsed.length === 0 &&
      !paymentMethod?.trim()
    ) {
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
      paymentGatewayIntentId: (p as { paymentGatewayIntentId?: string })
        .paymentGatewayIntentId,
    }));

    let finalPaymentMethod: PaymentMethod =
      isSaleReturn && !immediateReturnRefund
        ? PaymentMethod.CASH
        : deferPayment
          ? PaymentMethod.CREDIT
          : (paymentMethod as PaymentMethod);
    if (paymentsUsed.length > 0) {
      const preliminarySnapshots = buildPaymentSnapshotsFromSalePayments(
        salePaymentInputs,
        [],
      );
      finalPaymentMethod = getRepresentativePaymentMethod(
        preliminarySnapshots,
        finalPaymentMethod,
      );
    }

    const customerIdTrimmed = customerIdTrimmedEarly;
    if (isSale && customerIdTrimmed && paymentsUsed.length > 0) {
      await this.customerPaymentSourcesService.validatePaymentsForCustomer(
        customerIdTrimmed,
        paymentsUsed,
      );
      await this.assertInternalCreditPaymentsAllowed(
        pointOfSaleId,
        customerIdTrimmed,
        paymentsUsed,
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

      // Verificar POS
      const pointOfSale = await manager.getRepository(PointOfSale).findOne({
        where: { id: pointOfSaleId, deletedAt: IsNull() },
      });
      if (!pointOfSale) {
        throw new NotFoundException(
          `Punto de venta ${pointOfSaleId} no encontrado`,
        );
      }

      if (!pointOfSale.companyId) {
        throw new BadRequestException('Punto de venta sin empresa asociada.');
      }
      const companyIdForUnits = pointOfSale.companyId;
      const unitRows = await manager.getRepository(Unit).find({
        where: { companyId: companyIdForUnits, deletedAt: IsNull() },
      });
      const unitsById = new Map(unitRows.map((u) => [u.id, u]));

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
          `La sesión de caja está en estado ${cashSession.status}, no se pueden registrar operaciones`,
        );
      }

      // Calcular totales
      let subtotal = 0;
      let taxAmount = 0;
      let discountAmount = 0;

      const transactionLines: Partial<TransactionLine>[] = [];
      // Paralelo a `transactionLines`: el contexto que el motor necesita
      // (lineId estable, categoryId, etc.). Usamos un lineId determinista
      // basado en el índice para correlacionar de vuelta los resolvedLines.
      const engineCartLines: Array<{
        lineId: string;
        variantId: string;
        productId: string;
        categoryId: string | null;
        unitPrice: number;
        quantity: number;
      }> = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Verificar variante existe
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
          productId: variant.productId,
          productVariantId: line.productVariantId,
          productName: variant.product.name,
          productSku: variant.sku,
          variantName: variant.product.name,
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

        engineCartLines.push({
          lineId: `srv-${i}`,
          variantId: line.productVariantId,
          productId: variant.productId ?? '',
          categoryId: (variant.product as any).categoryId ?? null,
          unitPrice: Number(line.unitPrice) || 0,
          quantity: Number(line.quantity) || 0,
        });
      }

      if (config.fulfillBackorderId) {
        if (!customerIdTrimmed) {
          throw new BadRequestException(
            'Liquidar una reserva requiere cliente en la venta.',
          );
        }
        await this.assertFulfillBackorderMatches(
          manager,
          config.fulfillBackorderId,
          customerIdTrimmed,
          lines,
          pointOfSale.companyId!,
        );
      }

      if (config.fulfillPresaleTicketIds?.length) {
        await this.assertFulfillPresaleTicketsSatisfiable(
          manager,
          config.fulfillPresaleTicketIds,
          lines,
          pointOfSale,
        );
      }

      let total = subtotal - discountAmount + taxAmount;

      // ============================================================
      // RE-VALIDACIÓN DE PROMOCIONES (PR 5)
      // ------------------------------------------------------------
      // Si el cliente envió `promotionSnapshot`, re-ejecutamos el
      // motor canónico con datos del servidor. Comparamos por promoción
      // con tolerancia (epsilon = 1 unidad monetaria) y, si hay
      // divergencia material, abortamos. Al pasar la validación,
      // sobreescribimos `discountAmount` y los descuentos por línea con
      // los valores autoritativos del servidor; el snapshot inmutable
      // queda en `metadata.promotionSnapshot`.
      // ============================================================
      const clientSnapshot = Array.isArray(promotionSnapshot)
        ? promotionSnapshot
        : [];
      const companyId = pointOfSale.companyId!;

      let serverAppliedPromotions: AppliedSnapshot[] = [];
      let reservedPromotionIds: string[] = [];

      if (clientSnapshot.length > 0) {
        const effective = await this.promotionsService.findEffective(
          companyId,
          pointOfSale.branchId!,
          pointOfSale.id,
          true,
        );

        const paymentMethodIds: string[] = paymentsUsed
          .map((p) => (p as any).companyPaymentMethodId as string | undefined)
          .filter((x): x is string => !!x);

        const manualSelections = clientSnapshot
          .filter(
            (s) => s.activation === 'MANUAL' || s.activation === 'CODE_ENTRY',
          )
          .map((s) => ({ promotionId: s.promotionId }));

        let customerHistory: {
          promotionId: string;
          usesByThisCustomer: number;
        }[] = [];
        if (customerId) {
          const histRows = await manager.query<
            { promotion_id: string; cnt: string }[]
          >(
            `SELECT promotion_id, COUNT(*) AS cnt
               FROM promotion_redemptions
              WHERE customer_id = $1 AND amount_discounted > 0
              GROUP BY promotion_id`,
            [customerId],
          );
          customerHistory = (histRows ?? []).map((r) => ({
            promotionId: r.promotion_id,
            usesByThisCustomer: Number(r.cnt) || 0,
          }));
        }

        const serverResult = applyPromotions({
          cart: {
            lines: engineCartLines,
            customerId: customerId ?? null,
            paymentMethodIds,
          },
          ctx: {
            companyId,
            branchId: pointOfSale.branchId!,
            pointOfSaleId: pointOfSale.id,
            now: new Date(),
          },
          promotions: effective,
          manualSelections,
          customerHistory,
        });

        // Validación: comparar por promoción y total contra el snapshot.
        const epsilon = 1;
        const clientById = new Map<string, number>();
        for (const s of clientSnapshot) {
          clientById.set(
            s.promotionId,
            (clientById.get(s.promotionId) ?? 0) +
              (Number(s.amountDiscounted) || 0),
          );
        }
        const serverById = new Map<string, number>();
        for (const ap of serverResult.appliedPromotions) {
          serverById.set(
            ap.promotionId,
            (serverById.get(ap.promotionId) ?? 0) +
              (Number(ap.amountDiscounted) || 0),
          );
        }
        const allIds = new Set<string>([
          ...clientById.keys(),
          ...serverById.keys(),
        ]);
        for (const id of allIds) {
          const c = clientById.get(id) ?? 0;
          const s = serverById.get(id) ?? 0;
          if (Math.abs(c - s) > epsilon) {
            throw new BadRequestException(
              `El descuento de la promoción ${id} no coincide con el cálculo del servidor (${c} vs ${s}). La venta no se procesará.`,
            );
          }
        }

        // Aplicar resultado canónico a líneas y totales.
        let recomputedSubtotal = 0;
        let recomputedLineDiscount = 0;
        let recomputedTax = 0;
        for (let i = 0; i < transactionLines.length; i++) {
          const tl = transactionLines[i];
          const resolved = serverResult.resolvedLines.find(
            (r) => r.lineId === `srv-${i}`,
          );
          const lineQty = Number(tl.quantity) || 0;
          const lineUnit = Number(tl.unitPrice) || 0;
          const lineSubtotal = lineQty * lineUnit;
          const lineTax = Number(tl.taxAmount) || 0;
          const ld = resolved?.discount?.discountAmount ?? 0;
          const lp = resolved?.discount?.discountPercentage ?? 0;
          tl.discountAmount = ld;
          tl.discountPercentage = lp;
          tl.subtotal = lineSubtotal - ld;
          tl.total = lineSubtotal - ld + lineTax;
          recomputedSubtotal += lineSubtotal;
          recomputedLineDiscount += ld;
          recomputedTax += lineTax;
        }
        subtotal = recomputedSubtotal;
        taxAmount = recomputedTax;
        discountAmount =
          recomputedLineDiscount +
          (Number(serverResult.orderDiscountAmount) || 0);
        total = subtotal - discountAmount + taxAmount;

        // Reserva atómica de `uses_count` ANTES de crear la transacción.
        // Si alguna promoción se agotó entre el cálculo y el cierre, el
        // UPDATE no devolverá filas y abortamos antes de persistir nada.
        for (const ap of serverResult.appliedPromotions) {
          const updated = await manager.query<{ id: string }[]>(
            `UPDATE promotions
                SET uses_count = uses_count + 1,
                    updated_at = now()
              WHERE id = $1
                AND deleted_at IS NULL
                AND (max_uses_total IS NULL OR uses_count < max_uses_total)
              RETURNING id`,
            [ap.promotionId],
          );
          if (!updated || updated.length === 0) {
            // Compensar reservas previas dentro del mismo cierre.
            for (const pid of reservedPromotionIds) {
              try {
                await manager.query(
                  `UPDATE promotions SET uses_count = GREATEST(uses_count - 1, 0), updated_at = now() WHERE id = $1`,
                  [pid],
                );
              } catch {
                /* swallow compensation errors */
              }
            }
            throw new ConflictException(
              `La promoción '${ap.promotionCode}' alcanzó su límite total de usos.`,
            );
          }
          reservedPromotionIds.push(ap.promotionId);
        }
        serverAppliedPromotions = serverResult.appliedPromotions;
      }

      let paymentSnapshots: ReturnType<
        typeof buildPaymentSnapshotsFromSalePayments
      > = [];
      if (paymentsUsed.length > 0) {
        const companyId = pointOfSale.companyId;
        let catalog: Awaited<
          ReturnType<CompaniesService['getPaymentMethods']>
        > = [];
        try {
          if (companyId) {
            catalog = await this.companiesService.getPaymentMethods(companyId);
          }
        } catch {
          catalog = [];
        }
        paymentSnapshots = buildPaymentSnapshotsFromSalePayments(
          salePaymentInputs,
          catalog,
        );
        finalPaymentMethod = getRepresentativePaymentMethod(
          paymentSnapshots,
          finalPaymentMethod,
        );
      }

      // Almacén para stock y automation: debe persistirse en `transactions.storageId`
      // (UpdateStockActionHandler lo exige). Sin `storageId`, el listener no mueve inventario.
      let effectiveStorageId =
        typeof storageId === 'string' && storageId.trim()
          ? storageId.trim()
          : undefined;
      if (!effectiveStorageId && pointOfSale.storageId) {
        effectiveStorageId = pointOfSale.storageId;
      }
      if (!effectiveStorageId && pointOfSale.branchId) {
        const storageRepo = manager.getRepository(Storage);
        const branchId = pointOfSale.branchId;
        let chosen = await storageRepo.findOne({
          where: {
            branchId,
            isDefault: true,
            isActive: true,
            deletedAt: IsNull(),
          },
          order: { name: 'ASC' },
        });
        if (!chosen) {
          chosen = await storageRepo.findOne({
            where: {
              branchId,
              isActive: true,
              deletedAt: IsNull(),
            },
            order: { isDefault: 'DESC', name: 'ASC' },
          });
        }
        effectiveStorageId = chosen?.id;
      }

      if (!config.skipStockCheck && !config.skipStockAvailabilityCheck) {
        const qtyNeedByVariant = new Map<string, number>();
        for (const tl of transactionLines) {
          const vid = tl.productVariantId as string | undefined;
          if (!vid) continue;
          const q = Number(tl.quantityInBase) || 0;
          if (q <= 0) continue;
          qtyNeedByVariant.set(vid, (qtyNeedByVariant.get(vid) ?? 0) + q);
        }
        const variantIdsToCheck = [...qtyNeedByVariant.keys()];
        if (effectiveStorageId && variantIdsToCheck.length > 0) {
          const variantsToCheck = await manager
            .getRepository(ProductVariant)
            .find({
              where: { id: In(variantIdsToCheck) },
              select: ['id', 'sku', 'trackInventory', 'allowNegativeStock'],
            });
          for (const v of variantsToCheck) {
            if (!v.trackInventory || v.allowNegativeStock) continue;
            const need = qtyNeedByVariant.get(v.id) ?? 0;
            const sl = await manager.getRepository(StockLevel).findOne({
              where: {
                productVariantId: v.id,
                storageId: effectiveStorageId,
              },
            });
            const avail = Number(sl?.availableStock ?? 0);
            if (need > avail) {
              throw new BadRequestException(
                `Stock insuficiente en sala de venta para ${v.sku ?? v.id}: se requieren ${need} (unidad base), disponible ${avail}.`,
              );
            }
          }
        }

        const hasStockLines = transactionLines.some((l) => l.productVariantId);
        if (hasStockLines && !effectiveStorageId) {
          this.logger.error(
            `Venta sin storageId: POS=${pointOfSaleId} branch=${pointOfSale.branchId ?? 'null'}. ` +
              `UpdateStock omitirá el descuento de inventario.`,
          );
          throw new BadRequestException(
            'No hay almacén para descontar stock en esta sucursal. Marque un almacén como predeterminado ' +
              '(Inventario → Almacenes) o envíe storageId en la venta.',
          );
        }
      }

      // ✅ DELEGAR: Usar TransactionsService.createTransaction() para generar asientos
      // Esto asegura:
      // 1. documentNumber único generado
      // 2. Validaciones V1-V7
      // 3. Asientos contables automáticos (revenue, receivable, COGS, inventory)
      // 4. Audit trail completo
      // construir DTO de transacción usando la clase para que métodos como validate() existan
      const isBackorder = config.transactionType === TransactionType.BACKORDER;
      const depositAmount = config.backorderDepositAmount ?? 0;
      const paidReceived = isSaleReturn
        ? 0
        : deferPayment
          ? 0
          : isBackorder
            ? depositAmount
            : Number(amountPaid) || total;
      const paidForTx =
        isSaleReturn || isBackorder
          ? paidReceived
          : saleAmountPaidField({
              deferPayment,
              total,
              paidReceived,
            });
      const salePaymentStatus = isSale
        ? resolveSalePaymentStatusFromReceived({
            deferPayment,
            hasPayments: paymentsUsed.length > 0,
            total,
            paidReceived,
          })
        : undefined;

      const rawSnap = (metadata as { backorderCustomerSnapshot?: unknown } | undefined)
        ?.backorderCustomerSnapshot;
      const customerSnapshot =
        rawSnap && typeof rawSnap === 'object'
          ? ({
              name:
                typeof (rawSnap as { name?: unknown }).name === 'string'
                  ? (rawSnap as { name: string }).name
                  : null,
              document:
                typeof (rawSnap as { document?: unknown }).document === 'string'
                  ? (rawSnap as { document: string }).document
                  : null,
              phone:
                typeof (rawSnap as { phone?: unknown }).phone === 'string'
                  ? (rawSnap as { phone: string }).phone
                  : null,
            } satisfies TransactionBackorderMetadata['customerSnapshot'])
          : undefined;

      const backorderMeta: TransactionBackorderMetadata | undefined = isBackorder
        ? {
            reservationStatus: 'OPEN',
            depositAmount,
            depositConsumedAmount: 0,
            ...(config.backorderDepositPercent != null &&
            Number.isFinite(config.backorderDepositPercent)
              ? { depositPercent: Math.round(config.backorderDepositPercent) }
              : {}),
            ...(customerSnapshot ? { customerSnapshot } : {}),
          }
        : undefined;

      if (immediateReturnRefund) {
        const paidSum = paymentsUsed.reduce(
          (acc, p) => acc + (Number(p.amount) || 0),
          0,
        );
        if (paymentsUsed.length === 0) {
          throw new BadRequestException(
            'Reembolso inmediato: agrega al menos un medio de pago.',
          );
        }
        if (Math.abs(paidSum - total) > 1) {
          throw new BadRequestException(
            `Reembolso inmediato: la suma de pagos (${paidSum}) debe coincidir con el total a devolver (${total}).`,
          );
        }
      }

      const saleReturnMeta =
        isSaleReturn && config.originalSaleId
          ? {
              origin: 'SALE_RETURN',
              refundMode: immediateReturnRefund ? 'immediate' : 'document',
              links: { saleId: config.originalSaleId },
            }
          : {};

      const quotationId =
        metadata && typeof metadata === 'object'
          ? String((metadata as any)?.quotation?.id ?? '').trim()
          : '';
      const quotationDocumentNumber =
        metadata && typeof metadata === 'object'
          ? String((metadata as any)?.quotation?.documentNumber ?? '').trim()
          : '';

      const dto = new CreateTransactionDto();
      Object.assign(dto, {
        transactionType: config.transactionType,
        branchId: pointOfSale.branchId,
        userId: user.id,
        pointOfSaleId: pointOfSale.id,
        cashSessionId: cashSession.id,
        storageId: isBackorder ? undefined : effectiveStorageId,
        customerId: customerId || undefined,
        ...(isSaleReturn && config.originalSaleId
          ? { relatedTransactionId: config.originalSaleId }
          : {}),
        subtotal,
        taxAmount,
        discountAmount,
        total,
        paymentMethod: finalPaymentMethod,
        paymentStatus: salePaymentStatus,
        amountPaid: paidForTx,
        changeAmount: isSaleReturn ? 0 : changeAmount || 0,
        externalReference: externalReference || undefined,
        notes: notes || undefined,
        bankAccountKey: bankAccountKey || undefined,
        metadata: {
          ...metadata,
          ...saleReturnMeta,
          ...(deferPayment ? { deferredPayment: true, collectionSource: 'pos_defer' } : {}),
          ...(backorderMeta ? { backorder: backorderMeta } : {}),
          ...(isSale && quotationId
            ? {
                origin: 'SALE_FROM_QUOTATION',
                links: {
                  ...((metadata as any)?.links ?? {}),
                  quotationId,
                  ...(quotationDocumentNumber
                    ? { quotationDocumentNumber }
                    : {}),
                },
              }
            : {}),
          ...(isSale && config.fulfillPresaleTicketIds?.length
            ? {
                presaleTickets: { ids: config.fulfillPresaleTicketIds },
              }
            : {}),
          ...buildPaymentsMetadataFields(paymentSnapshots),
          storageId: isBackorder ? undefined : effectiveStorageId || undefined,
          promotionSnapshot:
            serverAppliedPromotions.length > 0
              ? serverAppliedPromotions
              : undefined,
        },
      });

      // transformar líneas a instancias de CreateTransactionLineDto
      dto.lines = transactionLines.map((line) => {
        const lineDto = new CreateTransactionLineDto();
        Object.assign(lineDto, line);
        return lineDto;
      });

      // Delegar a TransactionsService para obtener transacción con asientos generados.
      // Si esto falla, devolvemos `uses_count` a su valor previo para no
      // dejar reservas huérfanas.
      let finalTransaction: Awaited<
        ReturnType<TransactionsService['createTransaction']>
      >;
      try {
        finalTransaction =
          await this.transactionsService.createTransaction(dto);
      } catch (err) {
        for (const pid of reservedPromotionIds) {
          try {
            await manager.query(
              `UPDATE promotions SET uses_count = GREATEST(uses_count - 1, 0), updated_at = now() WHERE id = $1`,
              [pid],
            );
          } catch {
            /* swallow compensation errors */
          }
        }
        throw err;
      }

      if (isSale && pointOfSale.companyId) {
        await this.installmentService.createFromTransactionMetadata(
          finalTransaction,
          pointOfSale.companyId,
        );
      }

      if (isSale && pointOfSale.companyId && paymentsUsed.length > 0) {
        await this.mpSalePayment.validateAndConsumePointPayments({
          companyId: pointOfSale.companyId,
          transactionId: finalTransaction.id,
          payments: paymentsUsed.map((p) => ({
            amount: Number(p.amount) || 0,
            paymentGatewayIntentId: (p as { paymentGatewayIntentId?: string })
              .paymentGatewayIntentId,
            reference: (p as { reference?: string }).reference,
          })),
        });
      }

      // Si la venta proviene de una cotización cargada en POS, dejarla como CONVERTED
      // para que no se pueda reutilizar (independiente de líneas vendidas).
      if (isSale && quotationId) {
        const quotationTx = await manager.getRepository(Transaction).findOne({
          where: { id: quotationId, transactionType: TransactionType.QUOTATION },
        });
        if (!quotationTx) {
          throw new BadRequestException('Cotización no encontrada para convertir');
        }
        if (quotationTx.companyId !== pointOfSale.companyId) {
          throw new ForbiddenException('Cotización no pertenece a la empresa del POS');
        }
        if (quotationTx.status === TransactionStatus.COMPLETED) {
          throw new BadRequestException('La cotización ya fue convertida y no puede reutilizarse');
        }
        if (quotationTx.status === TransactionStatus.CANCELLED) {
          throw new BadRequestException('La cotización está anulada y no puede utilizarse');
        }

        quotationTx.status = TransactionStatus.COMPLETED;
        quotationTx.metadata = {
          ...(quotationTx.metadata ?? {}),
          quotation: {
            ...(quotationTx.metadata?.quotation ?? {}),
            convertedToTransactionId: finalTransaction.id,
            convertedToDocumentNumber: finalTransaction.documentNumber,
            convertedAt: new Date().toISOString(),
            convertedTargetType: TransactionType.SALE,
          },
        };
        await manager.getRepository(Transaction).save(quotationTx);
      }

      if (isSale && customerIdTrimmed && paymentsUsed.length > 0) {
        await this.customerPaymentSourcesService.applyPaymentsToSources(
          customerIdTrimmed,
          paymentsUsed,
          finalTransaction.id,
        );
      }

      if (
        isSale &&
        config.fulfillBackorderId &&
        effectiveStorageId?.trim()
      ) {
        await this.fulfillBackorderAfterSale(manager, {
          fulfillBackorderId: config.fulfillBackorderId,
          companyId: pointOfSale.companyId!,
          storageId: effectiveStorageId.trim(),
          saleTransaction: {
            id: finalTransaction.id,
            documentNumber: finalTransaction.documentNumber ?? '',
          },
          transactionLines,
        });
      }

      if (isSale && config.fulfillPresaleTicketIds?.length) {
        for (const ticketId of config.fulfillPresaleTicketIds) {
          await this.presaleTicketsService.redeemAfterSale({
            companyId: pointOfSale.companyId!,
            ticketId,
            saleTransactionId: finalTransaction.id,
            salePointOfSaleId: pointOfSale.id,
            manager,
          });
        }
      }

      // Cobro explícito: la grilla «Pagos recibidos» lista PAYMENT_IN, no la venta SALE.
      if (isSale && !isBackorder && paymentsUsed.length > 0) {
        const paidTotal = paymentsUsed.reduce(
          (acc, p) => acc + (Number(p.amount) || 0),
          0,
        );
        if (paidTotal > 0) {
          const paymentInDto = new CreateTransactionDto();
          Object.assign(paymentInDto, {
            transactionType: TransactionType.PAYMENT_IN,
            branchId: pointOfSale.branchId,
            userId: user.id,
            pointOfSaleId: pointOfSale.id,
            cashSessionId: cashSession.id,
            customerId: customerId || undefined,
            relatedTransactionId: finalTransaction.id,
            subtotal: paidTotal,
            taxAmount: 0,
            discountAmount: 0,
            total: paidTotal,
            paymentMethod: finalPaymentMethod,
            paymentStatus: PaymentStatus.PAID,
            amountPaid: paidTotal,
            changeAmount: changeAmount || 0,
            metadata: {
              saleTransactionId: finalTransaction.id,
              ...buildPaymentsMetadataFields(paymentSnapshots),
              source: 'pos_sale',
            },
          });
          paymentInDto.lines = [];
          await this.transactionsService.createTransaction(paymentInDto);
        }
      }

      if (isBackorder) {
        await this.backorderRegistration.createStockReservationForBackorder({
          companyId: pointOfSale.companyId!,
          branchId: pointOfSale.branchId!,
          storageId: effectiveStorageId,
          customerId: customerIdTrimmed,
          userId: user.id,
          backorderTransaction: finalTransaction,
          lines: transactionLines.map((line) => ({
            productId: line.productId!,
            productVariantId: line.productVariantId!,
            productName: line.productName ?? '',
            variantName: line.variantName,
            quantity: line.quantity ?? 0,
            quantityInBase: line.quantityInBase ?? line.quantity ?? 0,
            unitOfMeasure: line.unitOfMeasure,
          })),
          manager,
        });
      }

      // Persistir redenciones inmutables vinculadas a la transacción
      // recién creada. El snapshot inmutable de cada promoción sobrevive
      // a ediciones futuras de la regla.
      if (serverAppliedPromotions.length > 0) {
        for (const ap of serverAppliedPromotions) {
          await manager.getRepository(PromotionRedemption).insert({
            companyId,
            promotionId: ap.promotionId,
            transactionId: finalTransaction.id,
            customerId: customerId ?? null,
            amountDiscounted: Number(ap.amountDiscounted) || 0,
            snapshot: ap as unknown as Record<string, any>,
          });
        }
      }

      // Recalcular efectivo esperado (entradas − vuelto − salidas) con la misma
      // regla que cierre de caja y tesorería.
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
          id: finalTransaction.id,
          documentNumber: finalTransaction.documentNumber,
          transactionType: finalTransaction.transactionType,
          total: Number(finalTransaction.total),
          subtotal: Number(finalTransaction.subtotal ?? subtotal),
          taxAmount: Number(finalTransaction.taxAmount ?? taxAmount),
          discountAmount: Number(finalTransaction.discountAmount ?? discountAmount),
          status: finalTransaction.status,
          createdAt: finalTransaction.createdAt,
          paymentMethod: finalTransaction.paymentMethod,
          lines: transactionLines,
        },
        lines: transactionLines,
      };
    });
  }

  /**
   * Agregar línea a una venta existente
   *
   * Triggers:
   * - Recalcular totales
   * - Re-generar asientos (LedgerEntriesService.regenerateForTransaction)
   * - Reservar stock nuevamente
   */
  async addLineItem(saleId: string, lineItem: any) {
    // TODO: Implement
    throw new Error('Not implemented yet');
  }

  /**
   * Actualizar línea de venta existente
   *
   * Triggers:
   * - Recalcular totales
   * - Re-generar asientos
   * - Ajustar stock
   */
  async updateLineItem(saleId: string, lineItemId: string, updates: any) {
    // TODO: Implement
    throw new Error('Not implemented yet');
  }

  /**
   * Eliminar línea de venta
   *
   * Triggers:
   * - Recalcular totales
   * - Re-generar asientos
   * - Liberar stock
   */
  async deleteLineItem(saleId: string, lineItemId: string) {
    // TODO: Implement
    throw new Error('Not implemented yet');
  }

  private generateTempDocumentNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `TEMP-${timestamp}-${random}`;
  }

  private async assertFulfillBackorderMatches(
    manager: EntityManager,
    fulfillBackorderId: string,
    customerId: string,
    saleLines: CreateSaleDto['lines'],
    companyId: string,
  ): Promise<void> {
    const backorder = await manager.getRepository(Transaction).findOne({
      where: {
        id: fulfillBackorderId,
        companyId,
        transactionType: TransactionType.BACKORDER,
      },
      relations: ['lines'],
    });
    if (!backorder) {
      throw new NotFoundException('Reserva (encargo) no encontrada.');
    }

    const bo = (backorder.metadata?.backorder ??
      {}) as TransactionBackorderMetadata;
    const status = String(bo.reservationStatus ?? 'OPEN').toUpperCase();
    if (status !== 'OPEN') {
      throw new BadRequestException(
        `La reserva ya no está abierta (estado: ${status}).`,
      );
    }

    const backorderCustomerId = backorder.customerId?.trim() ?? '';
    if (backorderCustomerId && backorderCustomerId !== customerId.trim()) {
      throw new BadRequestException(
        'El cliente de la venta no coincide con el de la reserva.',
      );
    }

    const expected = new Map<string, number>();
    for (const bl of backorder.lines ?? []) {
      const vid = bl.productVariantId?.trim();
      if (!vid) continue;
      // En POS, al liquidar encargo, la validación de “cantidad distinta” debe ser en **unidad de venta**
      // (misma unidad que el carrito y boleta). `quantityInBase` puede ser ml/g/cm y NO debe usarse aquí.
      const qty = Number(bl.quantity) > 0 ? Number(bl.quantity) : Number(bl.quantityInBase) || 0;
      if (qty <= 0) continue;
      expected.set(vid, (expected.get(vid) ?? 0) + qty);
    }

    const actual = new Map<string, number>();
    for (const sl of saleLines) {
      const vid = sl.productVariantId?.trim();
      if (!vid) continue;
      const qty = Number(sl.quantity) || 0;
      if (qty <= 0) continue;
      actual.set(vid, (actual.get(vid) ?? 0) + qty);
    }

    if (expected.size !== actual.size) {
      throw new BadRequestException(
        'Las líneas del carrito no coinciden con la reserva (productos distintos).',
      );
    }
    for (const [vid, expQty] of expected) {
      const actQty = actual.get(vid) ?? 0;
      if (Math.abs(expQty - actQty) > 0.0001) {
        throw new BadRequestException(
          `Cantidad distinta a la reservada para variante ${vid}.`,
        );
      }
    }
  }

  private async assertFulfillPresaleTicketsSatisfiable(
    manager: EntityManager,
    fulfillPresaleTicketIds: string[],
    saleLines: CreateSaleDto['lines'],
    pointOfSale: PointOfSale,
  ): Promise<void> {
    if (fulfillPresaleTicketIds.length === 0) return;

    const remaining = new Map<string, number>();
    for (const sl of saleLines) {
      const vid = sl.productVariantId?.trim();
      if (!vid) continue;
      const qty = Number(sl.quantity) || 0;
      if (qty <= 0) continue;
      remaining.set(vid, (remaining.get(vid) ?? 0) + qty);
    }

    for (const ticketId of fulfillPresaleTicketIds) {
      await this.assertFulfillPresaleTicketSatisfiable(
        manager,
        ticketId,
        remaining,
        pointOfSale,
      );
    }
  }

  private async assertFulfillPresaleTicketSatisfiable(
    manager: EntityManager,
    fulfillPresaleTicketId: string,
    remaining: Map<string, number>,
    pointOfSale: PointOfSale,
  ): Promise<void> {
    const companyId = pointOfSale.companyId!;
    if (readPosKind(pointOfSale.settings) !== 'SALE') {
      throw new BadRequestException(
        'Solo un punto de caja puede cobrar tickets de preventa.',
      );
    }
    if (!readAcceptsPresaleTickets(pointOfSale.settings)) {
      throw new BadRequestException(
        'Este punto de venta no acepta tickets de preventa.',
      );
    }

    const ticket = await manager.getRepository(PresaleTicket).findOne({
      where: { id: fulfillPresaleTicketId, companyId },
      relations: ['lines'],
    });
    if (!ticket) {
      throw new NotFoundException('Ticket de preventa no encontrado.');
    }
    if (ticket.status !== PresaleTicketStatus.READY) {
      throw new BadRequestException(
        'El ticket de preventa ya no está disponible para cobro.',
      );
    }
    if ((pointOfSale.branchId ?? null) !== ticket.branchId) {
      throw new BadRequestException(
        'El ticket solo puede cobrarse en la misma sucursal donde se emitió.',
      );
    }

    const expected = new Map<string, number>();
    for (const tl of ticket.lines ?? []) {
      const vid = tl.productVariantId?.trim();
      if (!vid) continue;
      const qty = Number(tl.quantity) || 0;
      if (qty <= 0) continue;
      expected.set(vid, (expected.get(vid) ?? 0) + qty);
    }

    for (const [vid, expQty] of expected) {
      const available = remaining.get(vid) ?? 0;
      if (available + 0.0001 < expQty) {
        throw new BadRequestException(
          `Cantidad insuficiente en el carrito para el ticket de preventa (variante ${vid}).`,
        );
      }
      remaining.set(vid, available - expQty);
    }
  }

  private async fulfillBackorderAfterSale(
    manager: EntityManager,
    params: {
      fulfillBackorderId: string;
      companyId: string;
      storageId: string;
      saleTransaction: { id: string; documentNumber: string };
      transactionLines: Partial<TransactionLine>[];
    },
  ): Promise<void> {
    const reservation = await manager.getRepository(Transaction).findOne({
      where: {
        companyId: params.companyId,
        transactionType: TransactionType.INVENTORY_RESERVATION,
        relatedTransactionId: params.fulfillBackorderId,
      },
      relations: ['lines'],
      order: { createdAt: 'DESC' },
    });

    const releaseLines = reservation?.lines?.length
      ? reservation.lines
      : params.transactionLines;

    for (const rl of releaseLines) {
      const vid = rl.productVariantId?.trim();
      if (!vid) continue;
      const qty =
        Number(rl.quantityInBase) > 0
          ? Number(rl.quantityInBase)
          : Number(rl.quantity) || 0;
      if (qty <= 0) continue;
      await this.stockCommitment.release(manager, {
        companyId: params.companyId,
        variantId: vid,
        storageId: params.storageId,
        qty,
        lastTransactionId: params.saleTransaction.id,
      });
    }

    const backorder = await manager.getRepository(Transaction).findOne({
      where: { id: params.fulfillBackorderId },
    });
    if (!backorder) return;

    const meta = { ...(backorder.metadata ?? {}) } as Record<string, unknown>;
    const bo = {
      ...((meta.backorder ?? {}) as TransactionBackorderMetadata),
    };
    bo.reservationStatus = 'FULFILLED';
    bo.fulfilledByTransactionId = params.saleTransaction.id;
    bo.fulfilledByDocumentNumber =
      params.saleTransaction.documentNumber?.trim() || null;
    meta.backorder = bo;
    backorder.metadata = meta;
    await manager.getRepository(Transaction).save(backorder);

    await this.eshopBackorderSync.syncOnBackorderFulfilled(params.fulfillBackorderId, {
      id: params.saleTransaction.id,
      documentNumber: params.saleTransaction.documentNumber,
    });
  }

  /**
   * Valida política empresa y cupo disponible cuando la venta usa INTERNAL_CREDIT.
   */
  private async assertInternalCreditPaymentsAllowed(
    pointOfSaleId: string,
    customerId: string,
    payments: Array<{ paymentMethod?: string; amount?: number }>,
  ): Promise<void> {
    const internalAmount = payments
      .filter(
        (p) =>
          String(p.paymentMethod ?? '')
            .trim()
            .toUpperCase() === PaymentMethod.INTERNAL_CREDIT,
      )
      .reduce((sum, p) => sum + Math.round(Number(p.amount) || 0), 0);
    if (internalAmount <= 0) {
      return;
    }

    const pos = await this.pointOfSaleRepository.findOne({
      where: { id: pointOfSaleId, deletedAt: IsNull() },
    });
    if (!pos?.companyId) {
      throw new BadRequestException('Punto de venta sin empresa asociada.');
    }

    const ctx = await this.companiesService.getInternalCustomerCreditContext(
      pos.companyId,
    );
    if (!ctx.internalCustomerCredit?.enabled) {
      throw new BadRequestException(
        'El crédito interno no está habilitado para esta empresa.',
      );
    }
    if (!ctx.internalCreditPaymentMethod?.id) {
      throw new BadRequestException(
        'No hay medio de crédito interno activo en la empresa.',
      );
    }

    const customer = await this.customersService.findOne(customerId);
    const available = Math.round(Number(customer?.availableCredit) || 0);
    if (internalAmount > available + 1) {
      throw new BadRequestException(
        `El monto al crédito interno (${internalAmount}) supera el disponible del cliente (${available}).`,
      );
    }
  }
}
