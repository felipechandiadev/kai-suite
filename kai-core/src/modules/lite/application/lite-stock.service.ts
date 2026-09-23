import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';

export type LiteStockItem = {
  variantId: string;
  sku: string;
  name: string;
  physicalStock: number;
  storageId: string;
  storageName: string;
};

/**
 * Lite MVP stock: DB `stock_levels` is source of truth after writes;
 * `memoryStockByVariantId` is a read-through cache of totals per variant.
 */
@Injectable()
export class LiteStockService {
  private readonly memoryStockByVariantId = new Map<string, number>();

  constructor(
    @InjectRepository(StockLevel)
    private readonly stockLevelRepo: Repository<StockLevel>,
    @InjectRepository(Storage)
    private readonly storageRepo: Repository<Storage>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
  ) {}

  async resolveDefaultStorageId(companyId: string): Promise<string | null> {
    const preferred = await this.storageRepo.findOne({
      where: { companyId, isDefault: true },
      order: { createdAt: 'ASC' },
    });
    if (preferred) return preferred.id;

    const first = await this.storageRepo.findOne({
      where: { companyId },
      order: { createdAt: 'ASC' },
    });
    return first?.id ?? null;
  }

  async getPhysicalStock(companyId: string, variantId: string): Promise<number> {
    if (this.memoryStockByVariantId.has(variantId)) {
      return this.memoryStockByVariantId.get(variantId)!;
    }

    const total = await this.sumPhysicalStock(companyId, variantId);
    this.memoryStockByVariantId.set(variantId, total);
    return total;
  }

  async adjustPhysicalStock(
    companyId: string,
    variantId: string,
    delta: number,
    storageId?: string | null,
  ): Promise<number> {
    const resolvedStorageId =
      storageId ?? (await this.resolveDefaultStorageId(companyId));
    if (!resolvedStorageId) {
      throw new BadRequestException(
        'No hay almacén configurado para ajustar stock',
      );
    }

    let level = await this.stockLevelRepo.findOne({
      where: {
        companyId,
        productVariantId: variantId,
        storageId: resolvedStorageId,
      },
    });

    if (!level) {
      level = this.stockLevelRepo.create({
        companyId,
        productVariantId: variantId,
        storageId: resolvedStorageId,
        physicalStock: 0,
        committedStock: 0,
        availableStock: 0,
        incomingStock: 0,
      });
    }

    const current = Number(level.physicalStock ?? 0);
    const next = current + delta;
    // Lite: permitir stock negativo (ventas sin bloquear por existencia).
    level.physicalStock = next;
    level.availableStock = next - Number(level.committedStock ?? 0);
    await this.stockLevelRepo.save(level);

    const total = await this.sumPhysicalStock(companyId, variantId);
    this.memoryStockByVariantId.set(variantId, total);
    return total;
  }

  /**
   * Set absolute physical stock at a storage (default if null).
   * Delta = targetQty - current; returns total across storages.
   */
  async setPhysicalStock(
    companyId: string,
    variantId: string,
    storageId: string | null,
    targetQty: number,
  ): Promise<number> {
    if (!Number.isFinite(targetQty) || targetQty < 0) {
      throw new BadRequestException('targetQty debe ser >= 0');
    }

    const resolvedStorageId =
      storageId ?? (await this.resolveDefaultStorageId(companyId));
    if (!resolvedStorageId) {
      throw new BadRequestException(
        'No hay almacén configurado para ajustar stock',
      );
    }

    let level = await this.stockLevelRepo.findOne({
      where: {
        companyId,
        productVariantId: variantId,
        storageId: resolvedStorageId,
      },
    });

    if (!level) {
      level = this.stockLevelRepo.create({
        companyId,
        productVariantId: variantId,
        storageId: resolvedStorageId,
        physicalStock: 0,
        committedStock: 0,
        availableStock: 0,
        incomingStock: 0,
      });
    }

    const current = Number(level.physicalStock ?? 0);
    const delta = targetQty - current;
    if (delta === 0) {
      return this.getPhysicalStock(companyId, variantId);
    }

    return this.adjustPhysicalStock(
      companyId,
      variantId,
      delta,
      resolvedStorageId,
    );
  }

  /**
   * Delta relativo en un almacén ( Lite: aumentar / reducir ).
   */
  async applyDelta(
    companyId: string,
    variantId: string,
    storageId: string,
    delta: number,
  ): Promise<number> {
    if (!Number.isFinite(delta) || delta === 0) {
      throw new BadRequestException('delta debe ser un número distinto de 0');
    }
    const storage = await this.storageRepo.findOne({
      where: { id: storageId, companyId },
    });
    if (!storage) {
      throw new BadRequestException(`Almacén no encontrado: ${storageId}`);
    }
    return this.adjustPhysicalStock(companyId, variantId, delta, storageId);
  }

  /**
   * Traslado origen → destino. Compensa si falla el ingreso al destino.
   */
  async transfer(
    companyId: string,
    params: {
      variantId: string;
      sourceStorageId: string;
      targetStorageId: string;
      quantity: number;
    },
  ): Promise<{ variantId: string; quantity: number; physicalStock: number }> {
    const { variantId, sourceStorageId, targetStorageId, quantity } = params;
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('quantity debe ser mayor a 0');
    }
    if (sourceStorageId === targetStorageId) {
      throw new BadRequestException(
        'El almacén origen y destino deben ser distintos',
      );
    }

    const [source, target] = await Promise.all([
      this.storageRepo.findOne({ where: { id: sourceStorageId, companyId } }),
      this.storageRepo.findOne({ where: { id: targetStorageId, companyId } }),
    ]);
    if (!source) {
      throw new BadRequestException(
        `Almacén origen no encontrado: ${sourceStorageId}`,
      );
    }
    if (!target) {
      throw new BadRequestException(
        `Almacén destino no encontrado: ${targetStorageId}`,
      );
    }

    await this.adjustPhysicalStock(
      companyId,
      variantId,
      -quantity,
      sourceStorageId,
    );
    try {
      const physicalStock = await this.adjustPhysicalStock(
        companyId,
        variantId,
        quantity,
        targetStorageId,
      );
      return { variantId, quantity, physicalStock };
    } catch (e) {
      await this.adjustPhysicalStock(
        companyId,
        variantId,
        quantity,
        sourceStorageId,
      );
      throw e;
    }
  }

  async listStock(companyId: string): Promise<{ items: LiteStockItem[] }> {
    const levels = await this.stockLevelRepo.find({
      where: { companyId },
      relations: ['variant', 'variant.product', 'storage'],
      order: { lastUpdated: 'DESC' },
    });

    const items: LiteStockItem[] = [];
    const seen = new Set<string>();

    for (const level of levels) {
      const variant = level.variant as ProductVariant | undefined;
      if (!variant) continue;
      const product = variant.product;
      const key = `${level.productVariantId}:${level.storageId}`;
      seen.add(key);
      items.push({
        variantId: level.productVariantId,
        sku: variant.sku,
        name: product?.name ?? variant.sku,
        physicalStock: Number(level.physicalStock ?? 0),
        storageId: level.storageId,
        storageName: level.storage?.name ?? level.storageId,
      });
    }

    // Include trackInventory variants without a stock_level row (qty 0).
    const defaultStorageId = await this.resolveDefaultStorageId(companyId);
    if (defaultStorageId) {
      const storage = await this.storageRepo.findOne({
        where: { id: defaultStorageId },
      });
      const variants = await this.variantRepo.find({
          where: { companyId, trackInventory: true },
          relations: ['product'],
          order: { sku: 'ASC' },
        });
      for (const variant of variants) {
        const key = `${variant.id}:${defaultStorageId}`;
        if (seen.has(key)) continue;
        if (variant.deletedAt || !variant.product || variant.product.deletedAt) {
          continue;
        }
        items.push({
          variantId: variant.id,
          sku: variant.sku,
          name: variant.product.name,
          physicalStock: 0,
          storageId: defaultStorageId,
          storageName: storage?.name ?? defaultStorageId,
        });
      }
    }

    return { items };
  }

  async countLowStock(companyId: string, threshold = 5): Promise<number> {
    const levels = await this.stockLevelRepo.find({ where: { companyId } });
    return levels.filter((l) => {
      const physical = Number(l.physicalStock ?? 0);
      const min =
        l.minimumStock != null ? Number(l.minimumStock) : threshold;
      return physical <= min;
    }).length;
  }

  private async sumPhysicalStock(
    companyId: string,
    variantId: string,
  ): Promise<number> {
    const levels = await this.stockLevelRepo.find({
      where: { companyId, productVariantId: variantId },
    });
    return levels.reduce(
      (sum, row) => sum + Number(row.physicalStock ?? 0),
      0,
    );
  }
}
