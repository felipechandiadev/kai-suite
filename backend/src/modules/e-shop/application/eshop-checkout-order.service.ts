import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { In, IsNull, Repository } from 'typeorm';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { User } from '@modules/users/domain/user.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import {
  TransactionStatus,
  TransactionType,
  PaymentStatus,
} from '@modules/transactions/domain/transaction.entity';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { CompaniesService } from '@modules/companies/application/companies.service';
import type { EShopStoreContext } from './eshop-store.context';
import { EShopFulfillmentMethodsService } from './eshop-fulfillment-methods.service';
import { EShopCustomerUpsertService } from './eshop-customer-upsert.service';
import {
  evaluateStockPolicy,
  isEshopCheckoutCommercialBackorder,
  type StockCheckLine,
} from './helpers/eshop-stock-policy.util';
import { resolveEShopOperationalContext } from './helpers/eshop-operational-context.util';
import type {
  EShopOrderShippingAddress,
  TransactionEShopOrderMetadata,
} from '@modules/transactions/domain/transaction-eshop-order.metadata';
import { EShopOrderNotificationService } from './eshop-order-notification.service';
import { KaiMailClient } from '@shared/mail/kai-mail.client';
import { BackorderRegistrationService } from '@modules/transactions/application/backorder-registration.service';

export type CheckoutOrderBody = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  fulfillmentMethodId: string;
  address?: string;
  shippingAddress?: EShopOrderShippingAddress;
  lines: Array<{ productVariantId: string; quantity: number }>;
  notes?: string;
  authenticatedCustomerId?: string;
};

@Injectable()
export class EShopCheckoutOrderService {
  private readonly logger = new Logger(EShopCheckoutOrderService.name);

  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(StockLevel)
    private readonly stockRepo: Repository<StockLevel>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(PriceListItem)
    private readonly priceListItemRepo: Repository<PriceListItem>,
    private readonly companiesService: CompaniesService,
    private readonly transactionsService: TransactionsService,
    private readonly fulfillmentMethods: EShopFulfillmentMethodsService,
    private readonly customerUpsert: EShopCustomerUpsertService,
    private readonly backorderRegistration: BackorderRegistrationService,
    @Optional() private readonly orderNotifications?: EShopOrderNotificationService,
    @Optional() private readonly kaiMail?: KaiMailClient,
  ) {}

  async createCheckoutOrder(store: EShopStoreContext, body: CheckoutOrderBody) {
    if (!body.lines?.length) {
      throw new BadRequestException('El carrito está vacío');
    }
    if (!body.fulfillmentMethodId?.trim()) {
      throw new BadRequestException('Seleccione un método de entrega');
    }

    const settings = await this.companiesService.getEShopFlatSettings(store.companyId);
    const stockPolicy = settings.eShopStockPolicy;

    const method = await this.fulfillmentMethods.findActiveById(
      store.companyId,
      body.fulfillmentMethodId.trim(),
    );
    if (!method) {
      throw new BadRequestException('Método de entrega no válido');
    }
    if (!body.authenticatedCustomerId && !body.customerPhone?.trim()) {
      throw new BadRequestException(
        'El teléfono es obligatorio para confirmar un encargo sin cuenta',
      );
    }
    if (method.requiresPhone && !body.customerPhone?.trim()) {
      throw new BadRequestException('El teléfono es obligatorio para este método de entrega');
    }
    const shippingAddress = this.resolveShippingAddress(body, method.requiresAddress);

    const variantIds = body.lines.map((l) => l.productVariantId);
    const variants = await this.variantRepo.find({
      where: {
        id: In(variantIds),
        companyId: store.companyId,
        isActive: true,
        visibleInEShop: true,
      },
      relations: ['product'],
    });
    const byId = new Map(variants.map((v) => [v.id, v]));

    const operational = await resolveEShopOperationalContext(
      store.companyId,
      store.eShop,
      this.branchRepo,
    );
    const storageId = operational.storageId;
    const stockMap = await this.loadStockMap(store.companyId, variantIds, storageId);
    const priceMap = await this.loadPriceMap(
      store.companyId,
      variantIds,
      operational.priceListId,
    );

    const stockLines: StockCheckLine[] = [];
    let subtotal = 0;
    const dtoLines: CreateTransactionDto['lines'] = [];

    for (const line of body.lines) {
      const variant = byId.get(line.productVariantId);
      if (!variant || variant.product?.visibleInEShop !== true) {
        throw new BadRequestException(`Variante no válida: ${line.productVariantId}`);
      }
      const qty = Math.max(1, Math.floor(line.quantity));
      const trackInventory = variant.trackInventory === true;
      const availableQty = trackInventory
        ? (stockMap.get(variant.id) ?? 0)
        : Number.MAX_SAFE_INTEGER;
      stockLines.push({
        variantId: variant.id,
        requestedQty: qty,
        availableQty,
        trackInventory,
      });

      const unitPrice =
        priceMap.get(variant.id) ?? (Number(variant.basePrice) || 0);
      const lineSubtotal = unitPrice * qty;
      subtotal += lineSubtotal;

      dtoLines.push({
        productId: variant.productId!,
        productVariantId: variant.id,
        productName: variant.product?.name ?? variant.sku,
        productSku: variant.sku,
        variantName: variant.product?.name ?? variant.sku,
        unitId: variant.saleUnitId,
        quantity: qty,
        unitPrice,
        unitCost: Number(variant.baseCost) || 0,
        discountPercentage: 0,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        subtotal: lineSubtotal,
        total: lineSubtotal,
      });
    }

    const { hasShortage, shortages } = evaluateStockPolicy(stockPolicy, stockLines);
    const useBackorder = isEshopCheckoutCommercialBackorder();

    const shippingCost = this.fulfillmentMethods.calculateShippingCost(
      method,
      subtotal,
      settings.eShopFreeShippingThreshold,
    );
    const total = subtotal;

    const customer = await this.resolveCheckoutCustomer(store.companyId, body);

    const branchId = operational.branchId;
    const userId = await this.resolveSystemUserId(store.companyId);

    const now = new Date().toISOString();
    const eShopOrderMeta: TransactionEShopOrderMetadata = {
      fulfillmentStatus: 'SUBMITTED',
      fulfillmentMethodId: method.id,
      fulfillmentMethodSnapshot: this.fulfillmentMethods.toSnapshot(method, shippingCost),
      shippingCost,
      shippingAddress,
      customerSnapshot: {
        name: body.customerName.trim(),
        email: body.customerEmail.trim(),
        phone: body.customerPhone?.trim() || null,
      },
      stockPolicyApplied: stockPolicy,
      stockSnapshot: stockLines.map((s) => ({
        variantId: s.variantId,
        requestedQty: s.requestedQty,
        availableQty: Math.min(s.availableQty, s.requestedQty),
      })),
      statusHistory: [{ status: 'SUBMITTED', at: now }],
      paymentExpectation: 'NONE',
      customerNotes: body.notes?.trim() || null,
    };

    const dto = new CreateTransactionDto();
    dto.transactionType = useBackorder
      ? TransactionType.BACKORDER
      : TransactionType.CUSTOMER_ORDER;
    dto.transactionStatus = TransactionStatus.PENDING;
    dto.paymentStatus = PaymentStatus.PENDING;
    dto.customerId = customer.id;
    dto.branchId = branchId;
    dto.userId = userId;
    dto.subtotal = subtotal;
    dto.taxAmount = 0;
    dto.discountAmount = 0;
    dto.total = total;
    dto.amountPaid = 0;
    dto.notes =
      body.notes?.trim() ||
      `Pedido eShop — ${body.customerName.trim()} (${method.name})`;
    dto.lines = dtoLines;
    dto.metadata = {
      source: 'e-shop',
      eShopOrder: eShopOrderMeta,
      customerName: body.customerName.trim(),
      customerEmail: body.customerEmail.trim(),
      customerPhone: body.customerPhone?.trim() || null,
      shippingAddress: (shippingAddress?.line1 ?? body.address?.trim()) || null,
    };

    if (useBackorder) {
      dto.metadata.backorder = this.backorderRegistration.buildInitialBackorderMetadata({
        depositAmount: 0,
        customerSnapshot: {
          name: body.customerName.trim(),
          phone: body.customerPhone?.trim() || null,
        },
        expectedAvailabilityNote: hasShortage
          ? 'Pedido web con líneas sin stock suficiente'
          : null,
      });
    }

    const tx = await this.transactionsService.createTransaction(dto);

    if (useBackorder && storageId?.trim()) {
      await this.backorderRegistration.createStockReservationForBackorder({
        companyId: store.companyId,
        branchId,
        storageId: storageId.trim(),
        customerId: customer.id,
        userId,
        backorderTransaction: tx,
        lines: dtoLines.map((l) => ({
          productId: l.productId,
          productVariantId: l.productVariantId,
          productName: l.productName,
          variantName: l.variantName,
          quantity: l.quantity,
          quantityInBase: l.quantity,
          unitOfMeasure: l.productSku ?? undefined,
        })),
      });
    }

    try {
      await this.orderNotifications?.publishOrderCreated(store.companyId, tx);
    } catch (err) {
      this.logger.warn('No se pudo publicar notificación de pedido eShop', err);
    }

    try {
      await this.kaiMail?.sendOrderTemplate({
        template: 'order.received',
        to: body.customerEmail.trim(),
        idempotencyKey: `order:${tx.id}:received`,
        variables: {
          customerName: body.customerName.trim(),
          orderNumber: tx.documentNumber ?? tx.id,
          total: String(Math.round(total)),
          fulfillmentMethod: method.name,
          storeName: store.companyName ?? 'Tienda',
        },
      });
    } catch (err) {
      this.logger.warn('No se pudo encolar email de pedido eShop', err);
    }

    return {
      transactionId: tx.id,
      documentNumber: tx.documentNumber,
      total: Number(tx.total),
      transactionType: tx.transactionType,
      fulfillmentStatus: eShopOrderMeta.fulfillmentStatus,
      hasStockShortage: hasShortage,
      shortageVariantIds: shortages.map((s) => s.variantId),
    };
  }

  private async resolveCheckoutCustomer(companyId: string, body: CheckoutOrderBody) {
    const email = body.customerEmail.trim().toLowerCase();
    if (body.authenticatedCustomerId?.trim()) {
      const linked = await this.customerRepo.findOne({
        where: { id: body.authenticatedCustomerId.trim(), companyId },
        relations: ['person'],
      });
      if (!linked) {
        throw new BadRequestException('Sesión de cliente no válida');
      }
      const linkedEmail = linked.person?.email?.trim().toLowerCase();
      if (linkedEmail && linkedEmail !== email) {
        throw new BadRequestException('El correo no coincide con la cuenta autenticada');
      }
      return this.customerUpsert.upsertByEmail({
        companyId,
        name: body.customerName,
        email: body.customerEmail,
        phone: body.customerPhone,
        address: body.shippingAddress?.line1 ?? body.address,
      });
    }
    return this.customerUpsert.upsertByEmail({
      companyId,
      name: body.customerName,
      email: body.customerEmail,
      phone: body.customerPhone,
      address: body.shippingAddress?.line1 ?? body.address,
    });
  }

  private resolveShippingAddress(
    body: CheckoutOrderBody,
    requiresAddress: boolean,
  ): EShopOrderShippingAddress | null {
    const structured = body.shippingAddress;
    const line1 = structured?.line1?.trim() || body.address?.trim() || null;
    if (requiresAddress && !line1) {
      throw new BadRequestException('La dirección es obligatoria para este método de entrega');
    }
    if (!line1 && !structured?.commune && !structured?.region) {
      return null;
    }
    return {
      line1,
      commune: structured?.commune?.trim() || null,
      region: structured?.region?.trim() || null,
      notes: structured?.notes?.trim() || null,
    };
  }

  private async loadStockMap(
    companyId: string,
    variantIds: string[],
    storageId: string | null,
  ): Promise<Map<string, number>> {
    if (!storageId || variantIds.length === 0) {
      return new Map();
    }
    const rows = await this.stockRepo
      .createQueryBuilder('sl')
      .select('sl.productVariantId', 'variantId')
      .addSelect('COALESCE(sl.availableStock, 0)', 'qty')
      .where('sl.companyId = :companyId', { companyId })
      .andWhere('sl.storageId = :storageId', { storageId })
      .andWhere('sl.productVariantId IN (:...variantIds)', { variantIds })
      .getRawMany<{ variantId: string; qty: string }>();
    return new Map(rows.map((r) => [r.variantId, Math.max(0, Number(r.qty) || 0)]));
  }

  private async loadPriceMap(
    companyId: string,
    variantIds: string[],
    priceListId: string | null,
  ): Promise<Map<string, number>> {
    if (!priceListId || variantIds.length === 0) {
      return new Map();
    }
    const items = await this.priceListItemRepo.find({
      where: {
        companyId,
        priceListId,
        productVariantId: In(variantIds),
        deletedAt: IsNull(),
      },
    });
    return new Map(
      items.map((i) => [i.productVariantId!, Number(i.grossPrice) || 0]),
    );
  }

  private async resolveSystemUserId(companyId: string): Promise<string> {
    const systemUser = await this.userRepo.findOne({
      where: { companyId },
      order: { id: 'ASC' },
    });
    if (!systemUser) {
      throw new BadRequestException(
        'No hay usuario del sistema para registrar pedidos eShop',
      );
    }
    return systemUser.id;
  }
}
