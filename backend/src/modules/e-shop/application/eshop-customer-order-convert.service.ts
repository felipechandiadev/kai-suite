import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentStatus,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import type { TransactionEShopOrderMetadata } from '@modules/transactions/domain/transaction-eshop-order.metadata';
import { CompaniesService } from '@modules/companies/application/companies.service';

@Injectable()
export class EshopCustomerOrderConvertService {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    private readonly transactionsService: TransactionsService,
    private readonly companiesService: CompaniesService,
  ) {}

  async convertToSale(
    companyId: string,
    customerOrderId: string,
    opts: { userId: string; pointOfSaleId?: string; cashSessionId?: string },
  ) {
    const order = await this.txRepo.findOne({
      where: { id: customerOrderId, companyId },
      relations: ['lines'],
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }
    if (order.transactionType !== TransactionType.CUSTOMER_ORDER) {
      throw new BadRequestException('Solo se pueden convertir pedidos CUSTOMER_ORDER');
    }
    const meta = { ...(order.metadata ?? {}) } as Record<string, unknown>;
    if (meta.source !== 'e-shop') {
      throw new BadRequestException('El pedido no es de eShop');
    }
    const links = (meta.links ?? {}) as Record<string, unknown>;
    if (typeof links.convertedSaleId === 'string' && links.convertedSaleId.trim()) {
      throw new BadRequestException('El pedido ya fue convertido a venta');
    }

    const settings = await this.companiesService.getEShopFlatSettings(companyId);
    const storageId = settings.eShopDefaultStorageId;
    if (!storageId?.trim()) {
      throw new BadRequestException('Configure eShopDefaultStorageId para convertir pedidos');
    }

    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.SALE;
    dto.transactionStatus = TransactionStatus.CONFIRMED;
    dto.paymentStatus = PaymentStatus.PENDING;
    dto.customerId = order.customerId ?? undefined;
    const branchId = order.branchId ?? settings.eShopDefaultBranchId;
    if (!branchId) {
      throw new BadRequestException('Configure eShopDefaultBranchId para convertir pedidos');
    }
    dto.branchId = branchId;
    dto.userId = opts.userId;
    dto.pointOfSaleId = opts.pointOfSaleId;
    dto.cashSessionId = opts.cashSessionId;
    dto.storageId = storageId;
    dto.subtotal = Number(order.subtotal);
    dto.taxAmount = Number(order.taxAmount);
    dto.discountAmount = Number(order.discountAmount);
    dto.total = Number(order.total);
    dto.amountPaid = 0;
    dto.notes = `Venta por pedido web ${order.documentNumber ?? order.id}`;
    dto.lines = (order.lines ?? []).map((l) => ({
      productId: l.productId!,
      productVariantId: l.productVariantId!,
      productName: l.productName,
      productSku: l.productSku,
      variantName: l.variantName,
      unitId: l.unitId,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      unitCost: Number(l.unitCost) || 0,
      discountPercentage: Number(l.discountPercentage) || 0,
      discountAmount: Number(l.discountAmount) || 0,
      taxRate: Number(l.taxRate) || 0,
      taxAmount: Number(l.taxAmount) || 0,
      subtotal: Number(l.subtotal),
      total: Number(l.total),
    }));
    dto.metadata = {
      source: 'e-shop',
      origin: 'CUSTOMER_ORDER_CONVERT',
      links: { customerOrderId: order.id },
    };

    const sale = await this.transactionsService.createTransaction(dto);

    const eShopOrder = {
      ...((meta.eShopOrder ?? {}) as TransactionEShopOrderMetadata),
    };
    const now = new Date().toISOString();
    eShopOrder.fulfillmentStatus = 'DELIVERED';
    eShopOrder.statusHistory = [
      ...(eShopOrder.statusHistory ?? []),
      {
        status: 'DELIVERED' as const,
        at: now,
        note: `Convertido a venta ${sale.documentNumber ?? sale.id}`,
      },
    ];
    meta.eShopOrder = eShopOrder;
    meta.links = {
      ...links,
      convertedSaleId: sale.id,
      convertedSaleDocumentNumber: sale.documentNumber ?? null,
    };
    order.metadata = meta;
    order.relatedTransactionId = sale.id;
    await this.txRepo.save(order);

    return { sale, order };
  }
}
