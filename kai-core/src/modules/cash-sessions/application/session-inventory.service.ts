import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Storage } from '@modules/storages/domain/storage.entity';

/**
 * SessionInventoryService - Single Responsibility: Inventory Allocation During Session
 *
 * Responsabilidades:
 * - Reservar stock para ventas durante sesión de caja
 * - Liberar reservas (si venta se cancela)
 * - Confirmar reservas (cuando sesión cierra)
 * - Rollback reservas (si sesión se cancela)
 *
 * Patrón de dos fases:
 * 1. RESERVE: Durante venta, crear InventoryAllocation (status=RESERVED)
 *    - NOT deduct from available qty yet
 *    - Just mark as "allocated pending confirmation"
 * 2. COMMIT: Cuando sesión cierra, convertir RESERVED → COMMITTED
 *    - Deduct from Product.availableQty
 *    - Create INVENTORY_ADJUSTMENT transaction (si hay discrepancy)
 * 3. RELEASE: Si venta se cancela, marcar RESERVED → RELEASED
 *    - No deduction occurs
 * 4. ROLLBACK: Si sesión se cancela, todos RESERVED → CANCELLED
 *    - Session never finalized
 *
 * Modelo de datos:
 * CREATE TABLE inventory_allocations (
 *   id UUID PRIMARY KEY,
 *   session_id UUID NOT NULL REFERENCES cash_sessions(id),
 *   product_variant_id UUID NOT NULL REFERENCES product_variants(id),
 *   qty_allocated INT NOT NULL,
 *   status ENUM('RESERVED', 'COMMITTED', 'RELEASED', 'CANCELLED'),
 *   created_at TIMESTAMP,
 *   committed_at TIMESTAMP,
 * );
 */
@Injectable()
export class SessionInventoryService {
  constructor(
    @InjectRepository(StockLevel)
    private readonly stockLevelRepository: Repository<StockLevel>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(Storage)
    private readonly storageRepository: Repository<Storage>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Reservar stock para una venta en sesión
   *
   * Crea InventoryAllocation registro (status=RESERVED)
   * NO deducta del available qty todavía
   *
   * Validaciones:
   * - Producto/variante existe
   * - Qty disponible >= qty solicitada
   * - Storage especificado existe
   *
   * Retorna: InventoryAllocation entity con ID único
   */
  async reserveStock(
    sessionId: string,
    productVariantId: string,
    qty: number,
    storageId: string,
  ): Promise<any> {
    // Validar variante existe
    const variant = await this.productVariantRepository.findOne({
      where: { id: productVariantId },
    });
    if (!variant) {
      throw new NotFoundException(`Variante ${productVariantId} no encontrada`);
    }

    // Validar storage existe
    const storage = await this.storageRepository.findOne({
      where: { id: storageId },
    });
    if (!storage) {
      throw new NotFoundException(`Storage ${storageId} no encontrado`);
    }

    // Validar qty disponible
    const stockLevel = await this.stockLevelRepository.findOne({
      where: {
        productVariantId,
        storageId,
      },
    });

    const availableQty = stockLevel?.availableStock ?? 0;
    if (availableQty < qty) {
      throw new ConflictException(
        `Stock insuficiente. Disponible: ${availableQty}, Solicitado: ${qty}`,
      );
    }

    // TODO: Crear InventoryAllocation record
    // INSERT INTO inventory_allocations (session_id, product_variant_id, qty_allocated, status)
    // VALUES (?, ?, ?, 'RESERVED')

    return {
      success: true,
      allocation: {
        id: `alloc-${Date.now()}`,
        sessionId,
        productVariantId,
        qtyAllocated: qty,
        status: 'RESERVED',
        createdAt: new Date(),
      },
    };
  }

  /**
   * Liberar stock reservado
   *
   * Caso de uso: Venta cancelada antes de que sesión cierre
   * Marca InventoryAllocation status=RELEASED (sin deducir del available qty)
   */
  async releaseStock(allocationId: string): Promise<void> {
    // TODO: Implement
    // UPDATE inventory_allocations SET status = 'RELEASED' WHERE id = ?
  }

  /**
   * Confirmar reservas de stock
   *
   * Caso de uso: Cierre de sesión
   * Convierte todas las RESERVED allocations → COMMITTED
   * Deducta de Product.availableQty
   *
   * Retorna: count de commits exitosos/fallidos
   */
  async commitStock(
    sessionId: string,
  ): Promise<{ committed: number; failed: number }> {
    // TODO: Implementar en transacción atómica
    // 1. SELECT * FROM inventory_allocations WHERE session_id = ? AND status = 'RESERVED'
    // 2. Para cada allocation:
    //    a. UPDATE stock_levels SET available_qty = available_qty - qty_allocated
    //    b. UPDATE inventory_allocations SET status = 'COMMITTED', committed_at = NOW()
    // 3. Si alguna falla (stock insuficiente), crear INVENTORY_ADJUSTMENT transaction
    // 4. Retornar counts

    return {
      committed: 0,
      failed: 0,
    };
  }

  /**
   * Rollback de todas las reservas para una sesión
   *
   * Caso de uso: Sesión cancelada o rollback forzado
   * Marca todas las RESERVED allocations → CANCELLED
   * Sin que ningún available qty se ajuste
   *
   * Retorna: count de rolledback
   */
  async rollbackStock(sessionId: string): Promise<{ rolledBack: number }> {
    // TODO: Implement
    // UPDATE inventory_allocations SET status = 'CANCELLED' WHERE session_id = ? AND status = 'RESERVED'

    return {
      rolledBack: 0,
    };
  }

  /**
   * Query: Obtener todas las allocations para una sesión
   */
  async getAllocations(sessionId: string) {
    // TODO: Implement
    // SELECT * FROM inventory_allocations WHERE session_id = ? ORDER BY created_at DESC

    return {
      allocations: [],
    };
  }

  /**
   * Query: Obtener resumen de stock para sesión
   */
  async getStockSummary(sessionId: string) {
    // TODO: Implementar
    // SELECT
    //   pv.id, pv.sku, p.name,
    //   SUM(ia.qty_allocated) as totally_allocated,
    //   sl.available_qty,
    //   sl.available_qty - SUM(ia.qty_allocated) as remaining
    // FROM inventory_allocations ia
    // JOIN product_variants pv ON ia.product_variant_id = pv.id
    // JOIN products p ON pv.product_id = p.id
    // JOIN stock_levels sl ON pv.id = sl.product_variant_id
    // WHERE ia.session_id = ? AND ia.status IN ('RESERVED', 'COMMITTED')
    // GROUP BY pv.id

    return {
      summary: [],
    };
  }
}
