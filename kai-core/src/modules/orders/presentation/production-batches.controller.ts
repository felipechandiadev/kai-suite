import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { QueryBus } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { TenantContext } from '@common/tenant';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductVariantProductionUnit } from '@modules/product-variants/domain/product-variant-production-unit.entity';
import { ProductVariantProductionAttribute } from '@modules/product-variants/domain/product-variant-production-attribute.entity';
import { ProductType } from '@modules/products/domain/product.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { ProductModeService } from '@shared/product-mode/product-mode.service';
import { RecipesService } from '@modules/recipes/application/recipes.service';
import { RecipeType } from '@modules/recipes/domain/recipe-type.enum';
import { SearchTransactionsQuery } from '@modules/transactions/application/queries/search-transactions.query';
import { ProductionUnitsService } from '@modules/production-units/application/production-units.service';
import { ProductionUnitPurpose } from '@modules/production-units/domain/production-unit.enums';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import {
  CreateProductionBatchDto,
  ListProductionBatchesQueryDto,
  SearchManufactureVariantsQueryDto,
} from '../application/dto/create-production-batch.dto';
import type {
  ProductionOrderAttributeSnapshot,
  ProductionOrderLotSnapshot,
  ProductionOrderMetadata,
} from '../application/production-order.metadata';

@Controller('production-batches')
export class ProductionBatchesController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly transactionsService: TransactionsService,
    private readonly recipesService: RecipesService,
    private readonly productionUnitsService: ProductionUnitsService,
    private readonly productModeService: ProductModeService,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(TransactionLine)
    private readonly txLineRepo: Repository<TransactionLine>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(ProductVariantProductionUnit)
    private readonly routingRepo: Repository<ProductVariantProductionUnit>,
    @InjectRepository(ProductVariantProductionAttribute)
    private readonly attrRepo: Repository<ProductVariantProductionAttribute>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  private async resolveBatchOutputTypes(): Promise<ProductType[]> {
    const companyId = TenantContext.getCompanyId();
    if (!companyId) {
      throw new BadRequestException('Empresa activa requerida');
    }
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      select: ['id', 'kaiProduct'],
    });
    return this.productModeService.batchProductionOutputTypes(company?.kaiProduct);
  }

  @Get('manufacture-variants')
  async searchManufactureVariants(
    @Query(new ValidationPipe({ whitelist: true, transform: true }))
    query: SearchManufactureVariantsQueryDto,
  ) {
    const productionUnitId = query.productionUnitId?.trim();
    if (!productionUnitId) {
      throw new BadRequestException('productionUnitId es requerido');
    }
    const limit = Math.max(1, Math.min(50, parseInt(query.limit || '30', 10) || 30));
    const q = (query.q ?? '').trim();
    const allowedTypes = await this.resolveBatchOutputTypes();

    const routedRows = await this.routingRepo
      .createQueryBuilder('routing')
      .select('DISTINCT routing.productVariantId', 'variantId')
      .where('routing.productionUnitId = :productionUnitId', { productionUnitId })
      .getRawMany<{ variantId: string }>();
    const routedIds = [
      ...new Set(
        routedRows
          .map((r) => r.variantId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (routedIds.length === 0) {
      return { items: [] };
    }

    const qb = this.variantRepo
      .createQueryBuilder('v')
      .innerJoinAndSelect('v.product', 'product')
      .where('v.id IN (:...routedIds)', { routedIds })
      .andWhere('v.deletedAt IS NULL')
      .andWhere('product.deletedAt IS NULL')
      .andWhere('product.productType IN (:...allowedTypes)', { allowedTypes })
      .orderBy('product.name', 'ASC')
      .addOrderBy('v.sku', 'ASC')
      .take(limit);

    if (q.length >= 1) {
      const like = `%${q.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(product.name) LIKE :like OR LOWER(v.sku) LIKE :like OR LOWER(COALESCE(v.barcode, \'\')) LIKE :like)',
        { like },
      );
    }

    const companyId = TenantContext.getCompanyId();
    if (!companyId) {
      throw new BadRequestException('Empresa activa requerida');
    }

    const variants = await qb.getMany();
    const variantIds = variants.map((v) => v.id);
    const attrCounts = new Map<string, number>();
    if (variantIds.length > 0) {
      const rows = await this.attrRepo
        .createQueryBuilder('a')
        .select('a.productVariantId', 'productVariantId')
        .addSelect('COUNT(*)', 'cnt')
        .where('a.productVariantId IN (:...ids)', { ids: variantIds })
        .andWhere('a.deletedAt IS NULL')
        .groupBy('a.productVariantId')
        .getRawMany<{ productVariantId: string; cnt: string }>();
      for (const row of rows) {
        attrCounts.set(row.productVariantId, Number(row.cnt) || 0);
      }
    }

    const items: Array<{
      variantId: string;
      sku: string;
      productName: string;
      productType: string;
      hasRecipe: boolean;
      attributesCount: number;
    }> = [];
    for (const v of variants) {
      const recipes = await this.recipesService.list(companyId, v.id);
      const hasRecipe = recipes.some(
        (r) => r.isActive && r.type === RecipeType.PRODUCTION,
      );
      const productType = v.product?.productType ?? allowedTypes[0]!;
      items.push({
        variantId: v.id,
        sku: v.sku,
        productName: v.product?.name ?? v.sku,
        productType,
        hasRecipe,
        attributesCount: attrCounts.get(v.id) ?? 0,
      });
    }
    return { items };
  }

  @Get()
  async list(@Query() query: ListProductionBatchesQueryDto) {
    const p = Math.max(1, parseInt(query.page || '1', 10) || 1);
    const l = Math.max(1, Math.min(100, parseInt(query.limit || '25', 10) || 25));
    const result = await this.queryBus.execute(
      new SearchTransactionsQuery(
        p,
        l,
        TransactionType.PRODUCTION_BATCH,
        query.status,
        undefined,
        query.branchId,
        undefined,
        undefined,
        undefined,
        query.dateFrom,
        query.dateTo,
      ),
    );

    let data = Array.isArray(result?.data) ? [...result.data] : [];
    if (query.storageId?.trim()) {
      const storageId = query.storageId.trim();
      data = data.filter(
        (row: { storageId?: string | null }) => row.storageId === storageId,
      );
    }

    const ids = data
      .map((row: { id?: string }) => row.id)
      .filter((id): id is string => Boolean(id));
    if (ids.length > 0) {
      const lines = await this.txLineRepo.find({
        where: { transactionId: In(ids) },
        order: { lineNumber: 'ASC', createdAt: 'ASC' },
      });
      const linesByTx = new Map<string, TransactionLine[]>();
      for (const line of lines) {
        const txId = line.transactionId?.trim();
        if (!txId) continue;
        const list = linesByTx.get(txId) ?? [];
        list.push(line);
        linesByTx.set(txId, list);
      }
      data = data.map((row: Record<string, unknown>) => {
        const txLines = linesByTx.get(String(row.id)) ?? [];
        return {
          ...row,
          lotCount: txLines.length,
          lines: txLines.map((line) => ({
            id: line.id,
            productVariantId: line.productVariantId,
            productName: line.productName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            total: line.total,
            notes: line.notes,
          })),
        };
      });
    }

    return {
      ...result,
      data,
      total: query.storageId?.trim() ? data.length : result.total,
    };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const tx = await this.transactionsService.findOne(id);
    if (tx.transactionType !== TransactionType.PRODUCTION_BATCH) {
      throw new BadRequestException('Transaction is not PRODUCTION_BATCH');
    }
    const lines = await this.txLineRepo.find({
      where: { transactionId: id },
      order: { lineNumber: 'ASC', createdAt: 'ASC' },
    });
    return {
      ...tx,
      lotCount: lines.length,
      lines: lines.map((line) => ({
        id: line.id,
        productVariantId: line.productVariantId,
        productName: line.productName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        total: line.total,
        notes: line.notes,
      })),
    };
  }

  @Post()
  async create(
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: CreateProductionBatchDto,
  ) {
    if (!body.lines?.length) {
      throw new BadRequestException('Se requiere al menos una línea de producto de salida');
    }

    const companyId = TenantContext.getCompanyId();
    if (!companyId) {
      throw new BadRequestException('Empresa activa requerida');
    }

    const productionUnitId = body.productionUnitId?.trim();
    if (!productionUnitId) {
      throw new BadRequestException('productionUnitId es requerido');
    }

    const unit = await this.productionUnitsService.findOne(productionUnitId);
    if (!unit) {
      throw new BadRequestException('Unidad de producción no encontrada.');
    }
    if (unit.purpose !== ProductionUnitPurpose.BATCH) {
      throw new BadRequestException(
        'La unidad de producción debe ser de tipo lotes (producción planificada).',
      );
    }

    let storageId = body.storageId?.trim() || '';
    let outputStorageId = body.outputStorageId?.trim() || '';
    if (!storageId && unit.defaultInputStorageId) {
      storageId = unit.defaultInputStorageId;
    }
    if (!storageId) {
      throw new BadRequestException(
        'Se requiere almacén de insumos (storageId) o una unidad de producción con insumos definidos.',
      );
    }
    if (!outputStorageId) {
      throw new BadRequestException(
        'Se requiere almacén de salida (outputStorageId) en la orden de producción.',
      );
    }

    const variantIds = [...new Set(body.lines.map((l) => l.productVariantId))];
    const variants = await this.variantRepo.find({
      where: { id: In(variantIds) },
      relations: ['product'],
    });
    const variantById = new Map(variants.map((v) => [v.id, v]));

    const routings = await this.routingRepo.find({
      where: {
        productVariantId: In(variantIds),
        productionUnitId,
      },
    });
    const routedVariantIds = new Set(routings.map((r) => r.productVariantId));

    const attrs = await this.attrRepo.find({
      where: { productVariantId: In(variantIds) },
      relations: ['options'],
      order: { displayOrder: 'ASC' },
    });
    // Ensure options are present even if relation soft-delete quirks omit them
    for (const a of attrs) {
      if (!a.options) a.options = [];
    }
    const attrsByVariant = new Map<string, ProductVariantProductionAttribute[]>();
    for (const a of attrs) {
      const list = attrsByVariant.get(a.productVariantId) ?? [];
      list.push(a);
      attrsByVariant.set(a.productVariantId, list);
    }

    const allowedTypes = await this.resolveBatchOutputTypes();
    const allowedLabel = allowedTypes.join(' / ');

    const lots: ProductionOrderLotSnapshot[] = [];
    const txLines: CreateTransactionDto['lines'] = [];

    for (const line of body.lines) {
      const variant = variantById.get(line.productVariantId);
      if (!variant?.product) {
        throw new NotFoundException(
          `Variante de salida no encontrada: ${line.productVariantId}`,
        );
      }
      if (!allowedTypes.includes(variant.product.productType)) {
        throw new BadRequestException(
          `Solo se permiten productos ${allowedLabel} (SKU ${variant.sku}).`,
        );
      }
      if (!routedVariantIds.has(variant.id)) {
        throw new BadRequestException(
          `La variante ${variant.sku} no está habilitada en la unidad de producción seleccionada.`,
        );
      }

      const attributeSnapshots = this.resolveAttributeSnapshots(
        line.attributes ?? [],
        attrsByVariant.get(variant.id) ?? [],
        variant.sku,
      );

      const lineKey = line.lineKey?.trim() || randomUUID();
      lots.push({
        lineKey,
        productVariantId: variant.id,
        quantity: line.quantity,
        notes: line.notes?.trim() || undefined,
        attributes: attributeSnapshots,
      });

      txLines.push({
        productVariantId: variant.id,
        quantity: line.quantity,
        productName:
          line.productName?.trim() ||
          `${variant.product.name} (${variant.sku})`,
        unitPrice: 0,
        subtotal: 0,
        total: 0,
        notes: line.notes?.trim() || undefined,
      } as any);
    }

    const productionOrder: ProductionOrderMetadata = {
      productionUnitId,
      capacity:
        body.capacity == null || !Number.isFinite(Number(body.capacity))
          ? null
          : Number(body.capacity),
      plannedStartAt: body.plannedStartAt?.trim() || null,
      plannedDeliveryAt: body.plannedDeliveryAt?.trim() || null,
      lots,
    };

    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.PRODUCTION_BATCH;
    dto.transactionStatus = TransactionStatus.DRAFT;
    dto.branchId = body.branchId;
    dto.userId = body.userId;
    dto.storageId = storageId;
    dto.subtotal = 0;
    dto.taxAmount = 0;
    dto.discountAmount = 0;
    dto.total = 0;
    dto.notes = body.notes ?? undefined;
    dto.metadata = {
      origin: 'PRODUCTION_BATCH',
      links: {
        productionUnitId,
        outputStorageId,
      },
      productionOrder,
    };
    dto.lines = txLines;

    return this.transactionsService.createTransaction(dto);
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string) {
    const batch = await this.txRepo.findOne({ where: { id } });
    if (!batch) throw new NotFoundException('Production batch not found');
    if (batch.transactionType !== TransactionType.PRODUCTION_BATCH) {
      throw new BadRequestException('Transaction is not PRODUCTION_BATCH');
    }
    if (batch.status === TransactionStatus.COMPLETED) {
      throw new BadRequestException('No se puede cancelar una producción ya completada');
    }
    if (batch.status === TransactionStatus.CANCELLED) {
      return batch;
    }
    if (
      batch.status !== TransactionStatus.DRAFT &&
      batch.status !== TransactionStatus.CONFIRMED
    ) {
      throw new BadRequestException(`Estado no cancelable: ${batch.status}`);
    }
    batch.status = TransactionStatus.CANCELLED;
    return this.txRepo.save(batch);
  }

  private resolveAttributeSnapshots(
    selections: Array<{ attributeId: string; optionId: string }>,
    variantAttrs: ProductVariantProductionAttribute[],
    sku: string,
  ): ProductionOrderAttributeSnapshot[] {
    if (!selections.length) return [];
    const attrById = new Map(variantAttrs.map((a) => [a.id, a]));
    const snapshots: ProductionOrderAttributeSnapshot[] = [];
    const seen = new Set<string>();

    for (const sel of selections) {
      const attributeId = sel.attributeId?.trim();
      const optionId = sel.optionId?.trim();
      if (!attributeId || !optionId) {
        throw new BadRequestException(
          `Atributo de producción incompleto para ${sku}.`,
        );
      }
      if (seen.has(attributeId)) {
        throw new BadRequestException(
          `Atributo duplicado en la línea de ${sku}.`,
        );
      }
      seen.add(attributeId);
      const attr = attrById.get(attributeId);
      if (!attr) {
        throw new BadRequestException(
          `Atributo ${attributeId} no pertenece a la variante ${sku}.`,
        );
      }
      const options = attr.options ?? [];
      const option = options.find((o) => o.id === optionId);
      if (!option) {
        throw new BadRequestException(
          `Opción ${optionId} inválida para atributo ${attr.name} (${sku}).`,
        );
      }
      snapshots.push({
        attributeId: attr.id,
        optionId: option.id,
        tagKey: attr.tagKey ?? null,
        attributeName: attr.name,
        optionLabel: option.label,
      });
    }
    return snapshots;
  }
}
