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
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductType } from '@modules/products/domain/product.entity';
import { RecipesService } from '@modules/recipes/application/recipes.service';
import { RecipeType } from '@modules/recipes/domain/recipe-type.enum';
import { SearchTransactionsQuery } from '@modules/transactions/application/queries/search-transactions.query';
import { ProductionUnitsService } from '@modules/production-units/application/production-units.service';
import { ProductionUnitPurpose } from '@modules/production-units/domain/production-unit.enums';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import {
  CreateProductionBatchDto,
  ListProductionBatchesQueryDto,
} from '../application/dto/create-production-batch.dto';

const FINISHED_TYPES = new Set<string>([
  ProductType.MANUFACTURADO,
  ProductType.ELABORADO,
  ProductType.PREPARADO,
]);

@Controller('production-batches')
export class ProductionBatchesController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly transactionsService: TransactionsService,
    private readonly recipesService: RecipesService,
    private readonly productionUnitsService: ProductionUnitsService,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(TransactionLine)
    private readonly txLineRepo: Repository<TransactionLine>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
  ) {}

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
        order: { createdAt: 'ASC' },
      });
      const firstByTx = new Map<string, TransactionLine>();
      for (const line of lines) {
        const txId = line.transactionId?.trim();
        if (!txId || firstByTx.has(txId)) continue;
        firstByTx.set(txId, line);
      }
      data = data.map((row: Record<string, unknown>) => {
        const first = firstByTx.get(String(row.id));
        return {
          ...row,
          lines: first
            ? [
                {
                  id: first.id,
                  productVariantId: first.productVariantId,
                  productName: first.productName,
                  quantity: first.quantity,
                  unitPrice: first.unitPrice,
                  total: first.total,
                },
              ]
            : [],
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
    return tx;
  }

  @Post()
  async create(
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: CreateProductionBatchDto,
  ) {
    if (!body.lines?.length) {
      throw new BadRequestException('Se requiere al menos una línea de producto de salida');
    }
    const outputLine = body.lines[0];
    const variant = await this.variantRepo.findOne({
      where: { id: outputLine.productVariantId },
      relations: ['product'],
    });
    if (!variant?.product) {
      throw new NotFoundException('Variante de salida no encontrada');
    }
    if (!FINISHED_TYPES.has(variant.product.productType)) {
      throw new BadRequestException(
        'La variante de salida debe ser MANUFACTURADO, ELABORADO o PREPARADO',
      );
    }

    const recipes = await this.recipesService.list(outputLine.productVariantId);
    const recipe =
      (body.recipeId ? recipes.find((r) => r.id === body.recipeId) : undefined) ??
      recipes.find((r) => r.isActive && r.type === RecipeType.PRODUCTION);
    if (!recipe || !recipe.isActive || recipe.type !== RecipeType.PRODUCTION) {
      throw new BadRequestException(
        'Se requiere una receta PRODUCTION activa para la variante de salida',
      );
    }

    let storageId = body.storageId?.trim() || '';
    let outputStorageId = body.outputStorageId?.trim() || '';
    const productionUnitId = body.productionUnitId?.trim() || null;

    if (productionUnitId) {
      const unit = await this.productionUnitsService.findOne(productionUnitId);
      if (!unit) {
        throw new BadRequestException('Unidad de producción no encontrada.');
      }
      if (unit.purpose !== ProductionUnitPurpose.BATCH) {
        throw new BadRequestException(
          'La unidad de producción debe ser de tipo lotes (producción planificada).',
        );
      }
      if (!storageId && unit.defaultInputStorageId) {
        storageId = unit.defaultInputStorageId;
      }
      if (!outputStorageId && unit.defaultOutputStorageId) {
        outputStorageId = unit.defaultOutputStorageId;
      }
    }

    if (!storageId) {
      throw new BadRequestException(
        'Se requiere almacén de insumos (storageId) o una unidad de producción con insumos definidos.',
      );
    }
    if (!outputStorageId) {
      throw new BadRequestException(
        'Se requiere almacén de salida (outputStorageId) o una unidad de producción con salida definida.',
      );
    }

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
        recipeId: recipe.id,
        recipeVersion: recipe.version,
        productionUnitId,
        outputStorageId,
      },
    };
    dto.lines = body.lines.map((line) => ({
      productVariantId: line.productVariantId,
      quantity: line.quantity,
      productName:
        line.productName?.trim() ||
        variant.product?.name ||
        variant.sku ||
        `Output ${line.productVariantId}`,
      unitPrice: 0,
      subtotal: 0,
      total: 0,
    })) as any;

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
}
