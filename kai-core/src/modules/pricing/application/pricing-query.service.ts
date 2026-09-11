import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationalExpense } from '@modules/operational-expenses/domain/operational-expense.entity';
import { OperationalExpenseStatus } from '@modules/operational-expenses/domain/operational-expense.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Product } from '@modules/products/domain/product.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import {
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { PRICING_STRUCTURE_OPERATIONAL_GROUPS } from '../domain/pricing.types';

const EXCLUDED_TX = [TransactionStatus.CANCELLED, TransactionStatus.VOIDED];

function money(n: number): number {
  return Number(Number(n).toFixed(2));
}

export type PricingSalesWindow = { from: Date; to: Date; dateFrom: string; dateTo: string };

@Injectable()
export class PricingQueryService {
  constructor(
    @InjectRepository(OperationalExpense)
    private readonly oeRepo: Repository<OperationalExpense>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(TransactionLine)
    private readonly lineRepo: Repository<TransactionLine>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(PriceListItem)
    private readonly priceItemRepo: Repository<PriceListItem>,
  ) {}

  async sumStructureExpensesNet(
    companyId: string,
    window: PricingSalesWindow,
    branchId?: string,
  ): Promise<number> {
    const qb = this.oeRepo
      .createQueryBuilder('oe')
      .innerJoin(ExpenseCategory, 'cat', 'cat.id = oe.categoryId')
      .leftJoin(Transaction, 'tx', 'tx.id = oe.operatingExpenseTransactionId')
      .where('oe.companyId = :companyId', { companyId })
      .andWhere('oe.status IN (:...statuses)', {
        statuses: [
          OperationalExpenseStatus.APPROVED,
          OperationalExpenseStatus.PENDING_APPROVAL,
        ],
      })
      .andWhere('oe.operationDate >= :from', { from: window.dateFrom })
      .andWhere('oe.operationDate <= :to', { to: window.dateTo })
      .andWhere('cat.operationalExpenseGroup IN (:...groups)', {
        groups: [...PRICING_STRUCTURE_OPERATIONAL_GROUPS],
      });

    if (branchId) {
      qb.andWhere('(oe.branchId = :branchId OR oe.branchId IS NULL)', { branchId });
    }

    const rows = await qb
      .select([
        'oe.id AS id',
        'COALESCE(tx.subtotal, 0) AS tx_net',
        "COALESCE((oe.metadata->'linkedTributaryDocument'->>'netAmount')::numeric, 0) AS meta_net",
      ])
      .getRawMany<{ tx_net: string; meta_net: string }>();

    let total = 0;
    for (const row of rows) {
      const txNet = Number(row.tx_net) || 0;
      const metaNet = Number(row.meta_net) || 0;
      total += txNet > 0 ? txNet : metaNet;
    }
    return money(total);
  }

  async sumCompanyNetSales(
    companyId: string,
    window: PricingSalesWindow,
    branchId?: string,
  ): Promise<number> {
    const qb = this.txRepo
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :type', { type: TransactionType.SALE })
      .andWhere('t.status NOT IN (:...excluded)', { excluded: EXCLUDED_TX })
      .andWhere('t.createdAt >= :from', { from: window.from })
      .andWhere('t.createdAt <= :to', { to: window.to });

    if (branchId) {
      qb.andWhere('t.branchId = :branchId', { branchId });
    }

    const raw = await qb.select('COALESCE(SUM(t.subtotal), 0)', 'total').getRawOne<{
      total: string;
    }>();
    return money(Number(raw?.total) || 0);
  }

  async sumCategoryNetSales(
    companyId: string,
    window: PricingSalesWindow,
    categoryId: string,
    branchId?: string,
  ): Promise<number> {
    const qb = this.lineRepo
      .createQueryBuilder('l')
      .innerJoin(Transaction, 't', 't.id = l.transactionId')
      .innerJoin(Product, 'p', 'p.id = l.productId')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :type', { type: TransactionType.SALE })
      .andWhere('t.status NOT IN (:...excluded)', { excluded: EXCLUDED_TX })
      .andWhere('t.createdAt >= :from', { from: window.from })
      .andWhere('t.createdAt <= :to', { to: window.to })
      .andWhere('p.categoryId = :categoryId', { categoryId });

    if (branchId) {
      qb.andWhere('t.branchId = :branchId', { branchId });
    }

    const raw = await qb
      .select('COALESCE(SUM(l.subtotal - COALESCE(l.discountAmount, 0)), 0)', 'total')
      .getRawOne<{ total: string }>();
    return money(Number(raw?.total) || 0);
  }

  async unitsSoldByVariant(
    companyId: string,
    window: PricingSalesWindow,
    opts?: { categoryId?: string; branchId?: string },
  ): Promise<Map<string, number>> {
    const qb = this.lineRepo
      .createQueryBuilder('l')
      .innerJoin(Transaction, 't', 't.id = l.transactionId')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :type', { type: TransactionType.SALE })
      .andWhere('t.status NOT IN (:...excluded)', { excluded: EXCLUDED_TX })
      .andWhere('t.createdAt >= :from', { from: window.from })
      .andWhere('t.createdAt <= :to', { to: window.to })
      .andWhere('l.productVariantId IS NOT NULL');

    if (opts?.branchId) {
      qb.andWhere('t.branchId = :branchId', { branchId: opts.branchId });
    }
    if (opts?.categoryId) {
      qb.innerJoin(Product, 'p', 'p.id = l.productId').andWhere(
        'p.categoryId = :categoryId',
        { categoryId: opts.categoryId },
      );
    }

    const rows = await qb
      .select('l.productVariantId', 'variantId')
      .addSelect('COALESCE(SUM(l.quantityInBase), SUM(l.quantity), 0)', 'qty')
      .groupBy('l.productVariantId')
      .getRawMany<{ variantId: string; qty: string }>();

    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.variantId, Number(row.qty) || 0);
    }
    return map;
  }

  async listVariantsForPricing(
    companyId: string,
    priceListId: string,
    categoryId?: string,
  ): Promise<
    Array<{
      variant: ProductVariant;
      product: Product;
      listNet: number;
      listGross: number;
      taxIds: string[] | null;
    }>
  > {
    const items = await this.priceItemRepo.find({
      where: { companyId, priceListId } as any,
    });
    if (items.length === 0) {
      return [];
    }

    const variantIds = items
      .map((i) => i.productVariantId)
      .filter((id): id is string => Boolean(id));

    const qb = this.variantRepo
      .createQueryBuilder('v')
      .innerJoinAndSelect('v.product', 'p')
      .where('v.companyId = :companyId', { companyId })
      .andWhere('v.id IN (:...variantIds)', { variantIds });

    if (categoryId) {
      qb.andWhere('p.categoryId = :categoryId', { categoryId });
    }

    const variants = await qb.getMany();
    const itemByVariant = new Map(
      items
        .filter((i) => i.productVariantId)
        .map((i) => [String(i.productVariantId), i]),
    );

    return variants
      .map((variant) => {
        const item = itemByVariant.get(variant.id);
        if (!item) {
          return null;
        }
        return {
          variant,
          product: variant.product as Product,
          listNet: money(Number(item.netPrice) || 0),
          listGross: money(Number(item.grossPrice) || 0),
          taxIds: (item.taxIds as string[] | null) ?? null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);
  }
}
