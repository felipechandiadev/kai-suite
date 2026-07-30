import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

/**
 * Previously generated OE from due recurring templates.
 * Disabled: templates are manual (create OE from plantilla in UI).
 */
@Injectable()
export class RecurringOperationalExpenseWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RecurringOperationalExpenseWorkerService.name);

  onModuleInit() {
    this.logger.log(
      'Recurring OE worker disabled (templates are manual; no schedule)',
    );
  }

  onModuleDestroy() {
    // no timers
  }
}
