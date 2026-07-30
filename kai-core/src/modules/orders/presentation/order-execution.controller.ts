import { Controller, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CompleteServiceOrderCommand } from '../application/commands/complete-service-order.usecase';
import { CompleteProductionBatchCommand } from '../application/commands/complete-production-batch.usecase';

@Controller('execution')
export class OrderExecutionController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('service-orders/:id/complete')
  async completeServiceOrder(@Param('id') id: string) {
    return this.commandBus.execute(new CompleteServiceOrderCommand(id));
  }

  @Post('production-batches/:id/complete')
  async completeProductionBatch(@Param('id') id: string) {
    return this.commandBus.execute(new CompleteProductionBatchCommand(id));
  }
}

