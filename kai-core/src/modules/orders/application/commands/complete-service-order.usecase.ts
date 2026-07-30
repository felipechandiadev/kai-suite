import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType } from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { RecipesService } from '@modules/recipes/application/recipes.service';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { CreateTransactionDto, CreateTransactionLineDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { RecipeType } from '@modules/recipes/domain/recipe-type.enum';
import { recipeInputQuantityForOutput } from '@modules/recipes/application/recipe-consumption.util';

export class CompleteServiceOrderCommand {
  constructor(public readonly serviceOrderId: string) {}
}

@Injectable()
@CommandHandler(CompleteServiceOrderCommand)
export class CompleteServiceOrderUseCase implements ICommandHandler<CompleteServiceOrderCommand> {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(TransactionLine)
    private readonly txLineRepo: Repository<TransactionLine>,
    private readonly recipesService: RecipesService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async execute(command: CompleteServiceOrderCommand): Promise<{ serviceOrderId: string; stockOutTransactionId?: string | null }> {
    const serviceOrder = await this.txRepo.findOne({ where: { id: command.serviceOrderId } });
    if (!serviceOrder) throw new NotFoundException('Service order not found');
    if (serviceOrder.transactionType !== TransactionType.SERVICE_ORDER) {
      throw new BadRequestException('Transaction is not SERVICE_ORDER');
    }

    const lines = await this.txLineRepo.find({ where: { transactionId: serviceOrder.id } });
    if (lines.length === 0) {
      return { serviceOrderId: serviceOrder.id, stockOutTransactionId: null };
    }

    // For simplicity: pick first service variant line as "outputVariantId"
    const outputVariantId = lines[0].productVariantId;
    if (!outputVariantId) {
      throw new BadRequestException('SERVICE_ORDER line must have productVariantId');
    }

    const recipes = await this.recipesService.list(
      serviceOrder.companyId,
      outputVariantId,
    );
    const recipe = recipes.find((r) => r.isActive && r.type === RecipeType.SERVICE);
    if (!recipe) {
      throw new BadRequestException('No active SERVICE recipe for outputVariantId');
    }

    // Build ADJUSTMENT_OUT lines from recipe inputs * service quantity (first line)
    const serviceQty = Number(lines[0].quantity ?? 1) || 1;
    const adjLines: CreateTransactionLineDto[] = recipe.lines
      .sort((a, b) => (a.sortOrder ?? 1) - (b.sortOrder ?? 1))
      .map((rl, idx) => {
        const qty = recipeInputQuantityForOutput(
          Number(rl.qtyPerOutputUnit ?? 0),
          Number(rl.wasteFactor ?? 0),
          serviceQty,
        );
        return {
          productName: `Input ${rl.inputVariantId}`,
          productVariantId: rl.inputVariantId,
          quantity: qty,
          unitPrice: 0,
          subtotal: 0,
          total: 0,
          notes: 'Derived from recipe (service consumption)',
        } as any;
      });

    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.ADJUSTMENT_OUT;
    dto.branchId = serviceOrder.branchId as any;
    dto.userId = serviceOrder.userId as any;
    dto.storageId = serviceOrder.storageId as any;
    dto.subtotal = 0;
    dto.taxAmount = 0;
    dto.discountAmount = 0;
    dto.total = 0;
    dto.lines = adjLines;
    dto.relatedTransactionId = serviceOrder.id;
    dto.metadata = {
      origin: 'SERVICE_CONSUMPTION',
      links: {
        serviceOrderId: serviceOrder.id,
        orderId: serviceOrder.metadata?.links?.orderId ?? null,
        recipeId: recipe.id,
        recipeVersion: recipe.version,
      },
    } as any;

    const created = await this.transactionsService.createTransaction(dto);
    return { serviceOrderId: serviceOrder.id, stockOutTransactionId: created.id };
  }
}

