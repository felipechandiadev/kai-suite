import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductType } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  CreateTransactionDto,
  CreateTransactionLineDto,
} from '@modules/transactions/application/dto/create-transaction.dto';
import {
  Transaction,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { DiningOrder } from '../domain/dining-order.entity';
import { KitchenItemStatus } from '../domain/dining.enums';
import { DiningMaterialReservationService } from './dining-material-reservation.service';

@Injectable()
export class DiningBackflushService {
  private readonly logger = new Logger(DiningBackflushService.name);

  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly transactionsService: TransactionsService,
    private readonly materialReservation: DiningMaterialReservationService,
  ) {}

  /**
   * Release reservas + backflush físico PREPARADO al cerrar con SALE.
   * Idempotente por diningOrderId + saleTransactionId.
   */
  async backflushForClosedOrder(
    order: DiningOrder,
    saleTransactionId: string,
    userId: string,
  ): Promise<void> {
    if (!saleTransactionId?.trim()) {
      return;
    }

    const already = await this.transactionRepo
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId: order.companyId })
      .andWhere('t.transactionType = :type', {
        type: TransactionType.ADJUSTMENT_OUT,
      })
      .andWhere(`t.metadata ->> 'origin' = :origin`, {
        origin: 'DINING_BACKFLUSH',
      })
      .andWhere(`t.metadata #>> '{links,diningOrderId}' = :orderId`, {
        orderId: order.id,
      })
      .andWhere(`t.metadata #>> '{links,saleTransactionId}' = :saleId`, {
        saleId: saleTransactionId,
      })
      .getCount();

    if (already > 0) {
      this.logger.log(
        `Backflush dining ya aplicado order=${order.id} sale=${saleTransactionId}`,
      );
      return;
    }

    const lines = (order.lines ?? []).filter(
      (l) =>
        l.kitchenStatus !== KitchenItemStatus.CANCELLED &&
        Number(l.quantity) > 0,
    );
    if (lines.length === 0) {
      return;
    }

    const variantIds = [...new Set(lines.map((l) => l.productVariantId))];
    const variants = await this.variantRepo.find({
      where: variantIds.map((id) => ({ id })),
      relations: ['product'],
    });
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    const preparadoLines = lines.filter((l) => {
      const v = variantMap.get(l.productVariantId);
      return v?.product?.productType === ProductType.PREPARADO;
    });

    // Liberar committed antes de bajar físico (CTP política B).
    await this.materialReservation.releaseForOrderLines(preparadoLines);

    const groups = await this.materialReservation.resolveBackflushGroups(
      order.companyId,
      preparadoLines,
    );

    for (const group of groups) {
      if (group.adjLines.length === 0) continue;

      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.ADJUSTMENT_OUT;
      dto.branchId = order.branchId as any;
      dto.userId = userId as any;
      dto.storageId = group.storageId as any;
      dto.subtotal = 0;
      dto.taxAmount = 0;
      dto.discountAmount = 0;
      dto.total = 0;
      dto.relatedTransactionId = saleTransactionId;
      dto.lines = group.adjLines.map(
        (l) =>
          ({
            productName: l.productName,
            productVariantId: l.productVariantId,
            quantity: l.quantity,
            unitPrice: 0,
            subtotal: 0,
            total: 0,
            notes: 'Backflush dining PREPARADO',
          }) as CreateTransactionLineDto,
      );
      dto.metadata = {
        origin: 'DINING_BACKFLUSH',
        links: {
          diningOrderId: order.id,
          saleTransactionId,
          recipeLinks: group.recipeLinks,
          storageId: group.storageId,
        },
      } as any;

      await this.transactionsService.createTransaction(dto);
    }
  }
}
