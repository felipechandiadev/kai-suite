import { Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler, IQuery } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '@modules/transactions/domain/transaction.entity';

export class GetActiveInventoryReservationsQuery implements IQuery {
  constructor(
    public readonly branchId?: string,
    public readonly storageId?: string,
    public readonly productId?: string,
    public readonly variantId?: string,
    public readonly customerId?: string,
  ) {}
}

export interface InventoryReservationSummary {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  quantityInBase?: number;
  unitOfMeasure?: string;
  customerId: string;
  customerName: string;
  storageId: string;
  storageName: string;
  branchId: string;
  branchName: string;
  createdAt: Date;
  expiresAt?: Date;
  orderReference?: string;
  notes?: string;
  isExpired: boolean;
}

@Injectable()
@QueryHandler(GetActiveInventoryReservationsQuery)
export class GetActiveInventoryReservationsQueryHandler implements IQueryHandler<GetActiveInventoryReservationsQuery> {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute(
    query: GetActiveInventoryReservationsQuery,
  ): Promise<InventoryReservationSummary[]> {
    const { branchId, storageId, productId, variantId, customerId } = query;

    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .select([
        't.id',
        't.externalReference',
        't.notes',
        't.createdAt',
        't.metadata',
        'p.id',
        'p.name',
        'pv.id',
        'c.id',
        'cp.firstName',
        'cp.lastName',
        's.id',
        's.name',
        'b.id',
        'b.name',
        'tl.quantity',
        'tl.quantityInBase',
        'tl.unitOfMeasure',
        'tl.variantName',
      ])
      .innerJoin('t.lines', 'tl')
      .innerJoin('tl.product', 'p')
      .leftJoin('tl.productVariant', 'pv')
      .innerJoin('t.customer', 'c')
      .leftJoin('c.person', 'cp')
      .innerJoin('t.storageEntry', 's')
      .innerJoin('t.branch', 'b')
      .where('t.transactionType = :type', { type: 'INVENTORY_RESERVATION' })
      .andWhere('t.status = :status', { status: 'COMPLETED' });

    if (branchId) {
      qb.andWhere('b.id = :branchId', { branchId });
    }

    if (storageId) {
      qb.andWhere('s.id = :storageId', { storageId });
    }

    if (productId) {
      qb.andWhere('p.id = :productId', { productId });
    }

    if (variantId) {
      qb.andWhere('tl.productVariantId = :variantId', { variantId });
    }

    if (customerId) {
      qb.andWhere('c.id = :customerId', { customerId });
    }

    const results = await qb.getRawMany();

    const now = new Date();
    return results.map((result) => {
      let expiresAt: Date | undefined;
      const rawExpires = result.t_metadata?.expiresAt;
      if (rawExpires) {
        expiresAt = new Date(rawExpires);
      }

      return {
        id: result.t_id,
        productId: result.p_id,
        productName: result.p_name,
        variantId: result.pv_id,
        variantName: result.tl_variantName ?? null,
        quantity: result.tl_quantity,
        quantityInBase: result.tl_quantityInBase ?? null,
        unitOfMeasure: result.tl_unitOfMeasure ?? null,
        customerId: result.c_id,
        customerName: `${result.cp_firstName || ''} ${result.cp_lastName || ''}`.trim(),
        storageId: result.s_id,
        storageName: result.s_name,
        branchId: result.b_id,
        branchName: result.b_name,
        createdAt: result.t_createdAt,
        expiresAt,
        orderReference: result.t_externalReference,
        notes: result.t_notes,
        isExpired: expiresAt ? expiresAt < now : false,
      };
    });
  }
}
