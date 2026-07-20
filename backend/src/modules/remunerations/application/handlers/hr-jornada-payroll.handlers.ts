import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OvertimeGeneratedEvent,
  ShiftExceptionSettledEvent,
} from '@modules/hr-jornada/domain/events/hr-jornada.events';
import {
  PayrollLineSuggestion,
  PayrollLineSuggestionStatus,
} from '../../domain/payroll-line-suggestion.entity';
import {
  PayrollDeductionTypeId,
  PayrollEarningTypeId,
} from '../../domain/payroll-line-type.enum';

@Injectable()
@EventsHandler(ShiftExceptionSettledEvent)
export class ShiftExceptionSettledHandler
  implements IEventHandler<ShiftExceptionSettledEvent>
{
  private readonly logger = new Logger(ShiftExceptionSettledHandler.name);

  constructor(
    @InjectRepository(PayrollLineSuggestion)
    private readonly suggestionRepo: Repository<PayrollLineSuggestion>,
  ) {}

  async handle(event: ShiftExceptionSettledEvent): Promise<void> {
    try {
      const existing = await this.suggestionRepo.findOne({
        where: { sourceEventId: event.id },
      });
      if (existing) return;
      if (!event.amountCents || event.amountCents === '0') return;

      await this.suggestionRepo.save(
        this.suggestionRepo.create({
          companyId: event.companyId,
          employeeId: event.employeeId,
          periodStart: event.periodStart,
          periodEnd: event.periodEnd,
          typeId: PayrollDeductionTypeId.DEDUCTION_EXTRA,
          amountCents: event.amountCents,
          sourceEventId: event.id,
          sourceEventType: 'ShiftExceptionSettledEvent',
          description: `Excepción ${event.exceptionType} (${event.minutes} min) — ${event.workDate}`,
          status: PayrollLineSuggestionStatus.PENDING,
          metadata: {
            exceptionId: event.exceptionId,
            exceptionType: event.exceptionType,
            minutes: event.minutes,
            workDate: event.workDate,
          },
        }),
      );
    } catch (err) {
      this.logger.warn(
        `ShiftExceptionSettledHandler failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

@Injectable()
@EventsHandler(OvertimeGeneratedEvent)
export class OvertimeGeneratedHandler
  implements IEventHandler<OvertimeGeneratedEvent>
{
  private readonly logger = new Logger(OvertimeGeneratedHandler.name);

  constructor(
    @InjectRepository(PayrollLineSuggestion)
    private readonly suggestionRepo: Repository<PayrollLineSuggestion>,
  ) {}

  async handle(event: OvertimeGeneratedEvent): Promise<void> {
    try {
      const existing = await this.suggestionRepo.findOne({
        where: { sourceEventId: event.id },
      });
      if (existing) return;
      if (!event.amountCents || event.amountCents === '0') return;

      await this.suggestionRepo.save(
        this.suggestionRepo.create({
          companyId: event.companyId,
          employeeId: event.employeeId,
          periodStart: event.periodStart,
          periodEnd: event.periodEnd,
          typeId: PayrollEarningTypeId.OVERTIME,
          amountCents: event.amountCents,
          sourceEventId: event.id,
          sourceEventType: 'OvertimeGeneratedEvent',
          description: `HE planificadas ${event.overtimeMinutes} min — ${event.workDate}`,
          status: PayrollLineSuggestionStatus.PENDING,
          metadata: {
            assignmentId: event.assignmentId,
            overtimeMinutes: event.overtimeMinutes,
            workDate: event.workDate,
          },
        }),
      );
    } catch (err) {
      this.logger.warn(
        `OvertimeGeneratedHandler failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
