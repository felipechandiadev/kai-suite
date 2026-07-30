import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { TransactionCreatedEvent } from '@shared/events/transaction-created.event';
import { AutomationEngine } from '../automation.engine';
import { AutomationEventType } from '../../domain/automation-event-type.enum';
import { UpdateStockActionHandler } from './actions/update-stock.action';

@EventsHandler(TransactionCreatedEvent)
export class TransactionCreatedAutomationHandler
  implements IEventHandler<TransactionCreatedEvent>
{
  private readonly logger = new Logger(TransactionCreatedAutomationHandler.name);

  constructor(
    private readonly engine: AutomationEngine,
    private readonly updateStock: UpdateStockActionHandler,
  ) {}

  async handle(event: TransactionCreatedEvent) {
    const companyId = event.companyId;
    if (!companyId) {
      this.logger.warn(`Missing companyId for transaction=${event.transaction?.id}`);
      return;
    }

    try {
      await this.updateStock.execute(
        {
          companyId,
          eventType: AutomationEventType.TRANSACTION_CREATED,
          payload: event,
        },
        null,
      );
    } catch (e) {
      this.logger.error(
        `UpdateStock failed after transaction=${event.transaction?.id}: ${
          e instanceof Error ? e.message : String(e)
        }`,
        e instanceof Error ? e.stack : undefined,
      );
    }

    const enabled = process.env.AUTOMATION_ENGINE_ENABLED === 'true';
    if (!enabled) {
      return;
    }
    await this.engine.handle({
      companyId,
      eventType: AutomationEventType.TRANSACTION_CREATED,
      payload: event,
    });
  }
}

