import { Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler, IQuery } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '@modules/transactions/domain/transaction.entity';

export class GetInventoryBlocksQuery implements IQuery {
  constructor(
    public readonly branchId?: string,
    public readonly storageId?: string,
    public readonly productId?: string,
    public readonly reason?: string,
    public readonly status?:
      | 'ACTIVE'
      | 'PARTIALLY_UNBLOCKED'
      | 'FULLY_UNBLOCKED',
  ) {}
}

export interface InventoryBlockSummary {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  storageId: string;
  storageName: string;
  branchId: string;
  branchName: string;
  reason: string;
  reasonDetails?: string;
  expectedUnblockDate?: Date;
  responsibleUserId?: string;
  responsibleUserName?: string;
  createdAt: Date;
  createdBy: string;
  status: 'ACTIVE' | 'PARTIALLY_UNBLOCKED' | 'FULLY_UNBLOCKED';
  unblockedQuantity: number;
  remainingQuantity: number;
}

@Injectable()
@QueryHandler(GetInventoryBlocksQuery)
export class GetInventoryBlocksQueryHandler implements IQueryHandler<GetInventoryBlocksQuery> {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute(query: GetInventoryBlocksQuery): Promise<any[]> {
    const { branchId, storageId, productId, reason, status } = query;

    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .select([
        't.id',
        't.notes',
        't.createdAt',
        'p.id',
        'p.name',
        'pv.id',
        'pv.name',
        's.id',
        's.name',
        'b.id',
        'b.name',
        'u.userName',
        'tl.quantity',
      ])
      .innerJoin('t.lines', 'tl')
      .innerJoin('tl.product', 'p')
      .leftJoin('tl.productVariant', 'pv')
      .innerJoin('t.storage', 's')
      .innerJoin('t.branch', 'b')
      .innerJoin('t.user', 'u')
      .where('t.type = :type', { type: 'INVENTORY_BLOCK' })
      .andWhere('t.status != :voidedStatus', { voidedStatus: 'VOIDED' });

    if (branchId) {
      qb.andWhere('b.id = :branchId', { branchId });
    }

    if (storageId) {
      qb.andWhere('s.id = :storageId', { storageId });
    }

    if (productId) {
      qb.andWhere('p.id = :productId', { productId });
    }

    if (reason) {
      qb.andWhere('t.notes LIKE :reason', { reason: `%${reason}%` });
    }

    const results = await qb.getRawMany();

    // Get unblock transactions to calculate status
    const blockIds = results.map((r) => r.t_id);
    const unblockTransactions = await this.transactionRepository
      .createQueryBuilder('t')
      .select(['t.id', 't.notes', 'tl.quantity'])
      .innerJoin('t.lines', 'tl')
      .where('t.type = :type', { type: 'INVENTORY_UNBLOCK' })
      .andWhere('t.status = :status', { status: 'COMPLETED' })
      .andWhere('t.notes LIKE :referencePattern', {
        referencePattern: 'UNBLOCK-%',
      })
      .getRawMany();

    // Create a map of block ID to unblocked quantities
    const unblockMap = new Map<string, number>();
    for (const unblock of unblockTransactions) {
      const blockIdMatch = unblock.t_notes?.match(/UNBLOCK-([a-f0-9-]+)/);
      if (blockIdMatch) {
        const blockId = blockIdMatch[1];
        unblockMap.set(
          blockId,
          (unblockMap.get(blockId) || 0) + unblock.tl_quantity,
        );
      }
    }

    return results
      .filter((result) => result !== null)
      .map((result) => {
        const blockId = result.t_id;
        const originalQuantity = result.tl_quantity;
        const unblockedQuantity = unblockMap.get(blockId) || 0;
        const remainingQuantity = originalQuantity - unblockedQuantity;

        let blockStatus: 'ACTIVE' | 'PARTIALLY_UNBLOCKED' | 'FULLY_UNBLOCKED';
        if (remainingQuantity === 0) {
          blockStatus = 'FULLY_UNBLOCKED';
        } else if (unblockedQuantity > 0) {
          blockStatus = 'PARTIALLY_UNBLOCKED';
        } else {
          blockStatus = 'ACTIVE';
        }

        // Filter by status if requested
        if (status && blockStatus !== status) {
          return null;
        }

        // Parse notes for additional information
        const notes = result.t_notes || '';
        const reasonMatch = notes.match(/Block reason: ([^-]+)/);
        const reasonDetailsMatch = notes.match(/- ([^-]+?)(?: - Expected|$)/);
        const expectedUnblockMatch = notes.match(/Expected unblock: ([^-\n]+)/);

        return {
          id: blockId,
          productId: result.p_id,
          productName: result.p_name,
          variantId: result.pv_id,
          variantName: result.pv_name,
          quantity: originalQuantity,
          storageId: result.s_id,
          storageName: result.s_name,
          branchId: result.b_id,
          branchName: result.b_name,
          reason: reasonMatch ? reasonMatch[1].trim() : 'OTHER',
          reasonDetails: reasonDetailsMatch
            ? reasonDetailsMatch[1].trim()
            : undefined,
          expectedUnblockDate: expectedUnblockMatch
            ? new Date(expectedUnblockMatch[1].trim())
            : undefined,
          responsibleUserId: undefined, // Would need to parse from notes if stored
          responsibleUserName: undefined,
          createdAt: result.t_createdAt,
          createdBy: result.u_userName,
          status: blockStatus,
          unblockedQuantity,
          remainingQuantity,
        };
      });
  }
}
