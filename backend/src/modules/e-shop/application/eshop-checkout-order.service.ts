import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '@modules/users/domain/user.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import {
  TransactionStatus,
  TransactionType,
  PaymentStatus,
} from '@modules/transactions/domain/transaction.entity';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { CompaniesService } from '@modules/companies/application/companies.service';
import { isMercadoPagoEshopCheckoutOperational } from '@modules/companies/domain/company-mercado-pago.types';
import type { EShopStoreContext } from './eshop-store.context';
import { EShopFulfillmentMethodsService } from './eshop-fulfillment-methods.service';
import { EShopCustomerUpsertService } from './eshop-customer-upsert.service';
import {
  evaluateStockPolicy,
  isEshopCheckoutCommercialBackorder,
} from './helpers/eshop-stock-policy.util';
import type {
  EShopOrderShippingAddress,
  TransactionEShopOrderMetadata,
} from '@modules/transactions/domain/transaction-eshop-order.metadata';
import { EShopOrderNotificationService } from './eshop-order-notification.service';
import { KaiMailClient } from '@shared/mail/kai-mail.client';
import { BackorderRegistrationService } from '@modules/transactions/application/backorder-registration.service';
import { PaymentGatewayIntentService } from '@modules/payment-gateways/application/payment-gateway-intent.service';
import { MercadoPagoClient } from '@modules/payment-gateways/application/mercado-pago.client';
import {
  buildEshopCheckoutBackUrls,
  resolveMpWebhookNotificationUrl,
} from '@modules/payment-gateways/application/mercado-pago-eshop-urls';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { EShopPricingStockService } from './eshop-pricing-stock.service';
import { EShopCartService } from './eshop-cart.service';
import { randomUUID } from 'crypto';
import { DeliveryOrderService } from '@modules/e-shop-delivery/application/delivery-order.service';
import { ResolveDeliveryZoneService } from '@modules/e-shop-delivery/application/resolve-delivery-zone.service';
import { DeliveryQuoteService } from '@modules/e-shop-delivery/application/delivery-quote.service';
import { DeliveryOccurrenceService } from '@modules/e-shop-delivery/application/delivery-occurrence.service';
import { DeliveryCoverageService } from '@modules/e-shop-delivery/application/delivery-coverage.service';
import { EShopDeliveryZone } from '@modules/e-shop-delivery/domain/e-shop-delivery-zone.entity';

export type CheckoutOrderBody = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  fulfillmentMethodId: string;
  address?: string;
  shippingAddress?: EShopOrderShippingAddress;
  lines?: Array<{ productVariantId: string; quantity: number }>;
  cartId?: string;
  cartToken?: string;
  notes?: string;
  authenticatedCustomerId?: string;
  paymentMode?: 'online' | 'coordinate';
  checkoutAttemptId?: string;
  deliveryZoneId?: string;
  deliveryOccurrenceId?: string;
  latitude?: number;
  longitude?: number;
};

@Injectable()
export class EShopCheckoutOrderService {
  private readonly logger = new Logger(EShopCheckoutOrderService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly companiesService: CompaniesService,
    private readonly transactionsService: TransactionsService,
    private readonly fulfillmentMethods: EShopFulfillmentMethodsService,
    private readonly customerUpsert: EShopCustomerUpsertService,
    private readonly backorderRegistration: BackorderRegistrationService,
    private readonly paymentGatewayIntents: PaymentGatewayIntentService,
    private readonly mpClient: MercadoPagoClient,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly pricingStock: EShopPricingStockService,
    private readonly cartService: EShopCartService,
    @InjectRepository(EShopDeliveryZone)
    private readonly deliveryZoneRepo: Repository<EShopDeliveryZone>,
    private readonly deliveryOrderService: DeliveryOrderService,
    private readonly resolveDeliveryZone: ResolveDeliveryZoneService,
    private readonly deliveryQuote: DeliveryQuoteService,
    private readonly deliveryOccurrences: DeliveryOccurrenceService,
    private readonly deliveryCoverage: DeliveryCoverageService,
    @Optional() private readonly orderNotifications?: EShopOrderNotificationService,
    @Optional() private readonly kaiMail?: KaiMailClient,
  ) {}

  async createCheckoutOrder(store: EShopStoreContext, body: CheckoutOrderBody) {
    const checkoutAttemptId = body.checkoutAttemptId?.trim() || randomUUID();
    const settings = await this.companiesService.getEShopFlatSettings(store.companyId);
    const stockPolicy = settings.eShopStockPolicy;

    if (!body.fulfillmentMethodId?.trim()) {
      throw new BadRequestException('Seleccione un método de entrega');
    }

    const method = await this.fulfillmentMethods.findActiveById(
      store.companyId,
      body.fulfillmentMethodId.trim(),
    );
    if (!method) {
      throw new BadRequestException('Método de entrega no válido');
    }
    if (method.type === 'LOCAL_DELIVERY') {
      const deliverySettings = await this.deliveryCoverage.getSettings(store.companyId);
      if (!deliverySettings.localDeliveryEnabled) {
        throw new BadRequestException('El reparto local no está habilitado');
      }
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

    let deliveryZoneId: string | null = body.deliveryZoneId?.trim() || null;
    let deliveryOccurrenceId: string | null = body.deliveryOccurrenceId?.trim() || null;
    let latitude = body.latitude ?? null;
    let longitude = body.longitude ?? null;

    let pricedLines: Awaited<
      ReturnType<EShopPricingStockService['resolvePricedLines']>
    >['pricedLines'];
    let stockLines: Awaited<
      ReturnType<EShopPricingStockService['resolvePricedLines']>
    >['stockLines'];
    let cartId: string | null = null;

    if (body.cartToken?.trim()) {
      const resolved = await this.cartService.resolveCheckoutLines(store, {
        cartToken: body.cartToken.trim(),
        customerId: body.authenticatedCustomerId,
      });
      pricedLines = resolved.pricedLines;
      stockLines = resolved.stockLines;
      cartId = resolved.cart.id;
      if (resolved.issues.some((i) => i.code === 'VARIANT_UNAVAILABLE')) {
        throw new BadRequestException(
          'El carrito contiene productos no disponibles. Revísalo antes de continuar.',
        );
      }
    } else if (body.lines?.length) {
      const resolved = await this.pricingStock.resolvePricedLines(store, {
        lines: body.lines,
      });
      pricedLines = resolved.pricedLines;
      stockLines = resolved.stockLines;
      if (pricedLines.length !== body.lines.length) {
        throw new BadRequestException('Una o más variantes del carrito no son válidas');
      }
    } else {
      throw new BadRequestException('El carrito está vacío');
    }

    if (!pricedLines.length) {
      throw new BadRequestException('El carrito está vacío');
    }

    const { hasShortage, shortages } = evaluateStockPolicy(stockPolicy, stockLines);
    const useBackorder = isEshopCheckoutCommercialBackorder();

    let subtotal = 0;
    const dtoLines: CreateTransactionDto['lines'] = [];
    for (const line of pricedLines) {
      const lineSubtotal = line.unitPrice * line.quantity;
      subtotal += lineSubtotal;
      dtoLines.push({
        productId: line.productId,
        productVariantId: line.productVariantId,
        productName: line.productName,
        productSku: line.variantName,
        variantName: line.variantName,
        unitId: undefined,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        unitCost: 0,
        discountPercentage: 0,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        subtotal: lineSubtotal,
        total: lineSubtotal,
      });
    }

    const shippingCost = await this.resolveShippingCost(
      store.companyId,
      method,
      subtotal,
      settings.eShopFreeShippingThreshold,
      {
        type: method.type,
        deliveryZoneId,
        deliveryOccurrenceId,
        latitude,
        longitude,
        communeCode: shippingAddress?.commune ?? null,
      },
    );
    const total = subtotal;

    const customer = await this.resolveCheckoutCustomer(store.companyId, body);
    const operational = await this.pricingStock.resolveOperationalContext(store);
    const branchId = operational.branchId;
    const storageId = operational.storageId;
    const userId = await this.resolveSystemUserId(store.companyId);

    const now = new Date().toISOString();
    const paymentMode = body.paymentMode ?? 'coordinate';
    const mpSettings = await this.companiesService.getMercadoPagoSettingsInternal(
      store.companyId,
    );
    const wantsOnline =
      paymentMode === 'online' &&
      isMercadoPagoEshopCheckoutOperational(mpSettings);

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
      paymentExpectation: wantsOnline ? 'ONLINE_REQUIRED' : 'COORDINATE_LATER',
      paymentGatewayIntentId: null,
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
      checkoutAttemptId,
      cartId,
      cartToken: body.cartToken?.trim() || null,
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

    const payableTotal = Math.round(subtotal + shippingCost);
    const tx = await this.transactionsService.createTransaction(dto);

    if (method.type === 'LOCAL_DELIVERY') {
      await this.deliveryOrderService.createFromCheckout({
        companyId: store.companyId,
        transactionId: tx.id,
        fulfillmentType: 'LOCAL_DELIVERY',
        deliveryZoneId,
        deliveryOccurrenceId,
        addressLine1: shippingAddress?.line1 ?? body.address ?? null,
        commune: shippingAddress?.commune ?? null,
        region: shippingAddress?.region ?? null,
        latitude,
        longitude,
        shippingFee: shippingCost,
        customerName: body.customerName.trim(),
        customerPhone: body.customerPhone?.trim() || null,
        notes: body.notes?.trim() || null,
      });
    } else if (method.type === 'PICKUP') {
      await this.deliveryOrderService.createFromCheckout({
        companyId: store.companyId,
        transactionId: tx.id,
        fulfillmentType: 'PICKUP',
        shippingFee: 0,
        customerName: body.customerName.trim(),
        customerPhone: body.customerPhone?.trim() || null,
        notes: body.notes?.trim() || null,
      });
    }

    let paymentIntent: Awaited<
      ReturnType<PaymentGatewayIntentService['createIntent']>
    > | null = null;
    let preferenceId: string | null = null;
    if (wantsOnline) {
      paymentIntent = await this.paymentGatewayIntents.createIntent({
        companyId: store.companyId,
        channel: 'ESHOP_CHECKOUT',
        amount: payableTotal,
        transactionId: tx.id,
      });
      if (!mpSettings.accessToken?.trim()) {
        throw new BadRequestException('Falta Access Token de Mercado Pago');
      }
      const preference = await this.mpClient.createCheckoutPreference({
        accessToken: mpSettings.accessToken,
        environment: mpSettings.environment,
        title: `Pedido ${tx.documentNumber ?? tx.id.slice(0, 8)}`,
        unitPrice: payableTotal,
        externalReference: paymentIntent.externalReference,
        payerEmail: body.customerEmail.trim(),
        notificationUrl: resolveMpWebhookNotificationUrl(),
        backUrls: buildEshopCheckoutBackUrls(),
      });
      preferenceId = preference.id?.trim() ?? null;
      if (!preferenceId) {
        throw new BadRequestException(
          'Mercado Pago no devolvió preferenceId para el checkout',
        );
      }
      paymentIntent = await this.paymentGatewayIntents.saveMpPreferenceId(
        paymentIntent,
        preferenceId,
      );
      const meta = { ...(tx.metadata ?? {}) } as Record<string, unknown>;
      const eShopOrder = {
        ...((meta.eShopOrder ?? {}) as TransactionEShopOrderMetadata),
        paymentGatewayIntentId: paymentIntent.id,
      };
      meta.eShopOrder = eShopOrder;
      tx.metadata = meta;
      await this.transactionRepo.save(tx);
    }

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

    if (cartId) {
      await this.cartService.setCheckoutAttemptId(cartId, checkoutAttemptId);
      if (!wantsOnline) {
        await this.cartService.markConverted(cartId, checkoutAttemptId);
      }
    }

    try {
      if (!wantsOnline) {
        await this.orderNotifications?.publishOrderCreated(store.companyId, tx);
      }
    } catch (err) {
      this.logger.warn('No se pudo publicar notificación de pedido eShop', err);
    }

    try {
      if (!wantsOnline) {
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
      }
    } catch (err) {
      this.logger.warn('No se pudo encolar email de pedido eShop', err);
    }

    this.logger.log(
      JSON.stringify({
        event: 'eshop_checkout_created',
        companyId: store.companyId,
        transactionId: tx.id,
        cartId,
        checkoutAttemptId,
        paymentMode: wantsOnline ? 'online' : 'coordinate',
      }),
    );

    return {
      transactionId: tx.id,
      documentNumber: tx.documentNumber,
      total: Number(tx.total),
      payableTotal,
      transactionType: tx.transactionType,
      fulfillmentStatus: eShopOrderMeta.fulfillmentStatus,
      hasStockShortage: hasShortage,
      shortageVariantIds: shortages.map((s) => s.variantId),
      paymentMode: wantsOnline ? 'online' : 'coordinate',
      paymentIntentId: paymentIntent?.id ?? null,
      preferenceId,
      publicKey: wantsOnline ? mpSettings.publicKey : null,
      mercadoPagoEnvironment: wantsOnline ? mpSettings.environment : null,
      checkoutAttemptId,
      cartId,
    };
  }

  async prepareOnlineCheckout(store: EShopStoreContext, body: CheckoutOrderBody) {
    return this.createCheckoutOrder(store, { ...body, paymentMode: 'online' });
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

  private async resolveShippingCost(
    companyId: string,
    method: { type: string; id: string },
    subtotal: number,
    globalFreeThreshold: number | null,
    delivery: {
      type: string;
      deliveryZoneId: string | null;
      deliveryOccurrenceId: string | null;
      latitude: number | null;
      longitude: number | null;
      communeCode: string | null;
    },
  ): Promise<number> {
    if (method.type === 'LOCAL_DELIVERY') {
      if (!delivery.deliveryZoneId || !delivery.deliveryOccurrenceId) {
        throw new BadRequestException('Seleccione zona y franja de reparto');
      }
      if (delivery.latitude == null || delivery.longitude == null) {
        throw new BadRequestException('No se pudo validar la ubicación de entrega');
      }
      const zoneRow = await this.deliveryZoneRepo.findOne({
        where: { companyId, id: delivery.deliveryZoneId, isActive: true },
      });
      if (!zoneRow) throw new BadRequestException('Zona de reparto no válida');

      const resolved = await this.resolveDeliveryZone.resolveByPoint(
        companyId,
        delivery.latitude,
        delivery.longitude,
        delivery.communeCode,
      );
      if (!resolved || resolved.zoneId !== delivery.deliveryZoneId) {
        throw new BadRequestException('La dirección queda fuera de la zona de cobertura');
      }

      await this.deliveryOccurrences.assertOccurrenceAvailable(
        companyId,
        delivery.deliveryOccurrenceId,
        delivery.deliveryZoneId,
      );

      const quote = await this.deliveryQuote.quote(companyId, resolved, subtotal);
      return quote.shippingFee;
    }

    return this.fulfillmentMethods.calculateShippingCost(
      method as any,
      subtotal,
      globalFreeThreshold,
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
