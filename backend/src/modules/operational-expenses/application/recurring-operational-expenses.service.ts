import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  RecurringOperationalExpense,
  RecurringOperationalExpenseFrequency,
} from '../domain/recurring-operational-expense.entity';
import {
  RecurringOperationalExpenseRun,
  RecurringOperationalExpenseRunStatus,
} from '../domain/recurring-operational-expense-run.entity';
import {
  OperationalExpenseDocumentKind,
  OperationalExpenseStatus,
} from '../domain/operational-expense.entity';
import { OperationalExpensesService } from './operational-expenses.service';
import { CreateRecurringOperationalExpenseDto } from './dto/create-recurring-operational-expense.dto';
import { UpdateRecurringOperationalExpenseDto } from './dto/update-recurring-operational-expense.dto';
import {
  computeNextRunAt,
  periodKeyFor,
  validateRecurrenceSchedule,
} from './recurring-operational-expense-schedule.util';

export type GenerateRecurringResult = {
  skipped: boolean;
  reason?: string;
  run: RecurringOperationalExpenseRun | null;
  operationalExpenseId?: string;
};

@Injectable()
export class RecurringOperationalExpensesService {
  private readonly logger = new Logger(RecurringOperationalExpensesService.name);

  constructor(
    @InjectRepository(RecurringOperationalExpense)
    private readonly templateRepo: Repository<RecurringOperationalExpense>,
    @InjectRepository(RecurringOperationalExpenseRun)
    private readonly runRepo: Repository<RecurringOperationalExpenseRun>,
    private readonly operationalExpenses: OperationalExpensesService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(params: {
    companyId: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: RecurringOperationalExpense[]; total: number }> {
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;
    const [data, total] = await this.templateRepo.findAndCount({
      where: { companyId: params.companyId },
      relations: ['category', 'supplier', 'supplier.person'],
      order: { name: 'ASC' },
      take: limit,
      skip: offset,
    });
    return { data, total };
  }

  async findOne(id: string): Promise<RecurringOperationalExpense> {
    const row = await this.templateRepo.findOne({
      where: { id },
      relations: ['category', 'supplier', 'supplier.person'],
    });
    if (!row) throw new NotFoundException(`Recurring expense ${id} not found`);
    return row;
  }

  async listRuns(
    recurringExpenseId: string,
    limit = 50,
  ): Promise<RecurringOperationalExpenseRun[]> {
    await this.findOne(recurringExpenseId);
    return this.runRepo.find({
      where: { recurringExpenseId },
      order: { ranAt: 'DESC' },
      take: limit,
    });
  }

  async create(
    dto: CreateRecurringOperationalExpenseDto,
  ): Promise<RecurringOperationalExpense> {
    this.assertSchedule(dto.frequency, dto.dayOfWeek, dto.dayOfMonth);
    this.assertAmounts(dto.amountNet, dto.taxAmount, dto.total);

    const nextRunAt = computeNextRunAt(new Date(), {
      frequency: dto.frequency,
      dayOfWeek: dto.dayOfWeek,
      dayOfMonth: dto.dayOfMonth,
    });

    const entity = this.templateRepo.create({
      companyId: dto.companyId,
      branchId: dto.branchId ?? null,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      categoryId: dto.categoryId,
      supplierId: dto.supplierId,
      documentKind: OperationalExpenseDocumentKind.OTHER,
      amountNet: String(dto.amountNet),
      taxAmount: String(dto.taxAmount),
      total: String(dto.total),
      taxId: dto.taxId ?? null,
      frequency: dto.frequency,
      dayOfWeek:
        dto.frequency === RecurringOperationalExpenseFrequency.WEEKLY
          ? dto.dayOfWeek!
          : null,
      dayOfMonth:
        dto.frequency === RecurringOperationalExpenseFrequency.WEEKLY
          ? null
          : dto.dayOfMonth!,
      nextRunAt,
      lastRunAt: null,
      isActive: dto.isActive ?? true,
      createdBy: dto.createdBy,
    });

    return this.templateRepo.save(entity);
  }

  async update(
    id: string,
    dto: UpdateRecurringOperationalExpenseDto,
  ): Promise<RecurringOperationalExpense> {
    const row = await this.findOne(id);

    if (dto.name != null) row.name = dto.name.trim();
    if (dto.description !== undefined) {
      row.description = dto.description?.trim() || null;
    }
    if (dto.branchId !== undefined) row.branchId = dto.branchId;
    if (dto.categoryId != null) row.categoryId = dto.categoryId;
    if (dto.supplierId != null) row.supplierId = dto.supplierId;
    if (dto.taxId !== undefined) row.taxId = dto.taxId;
    if (dto.isActive != null) row.isActive = dto.isActive;

    if (dto.amountNet != null) row.amountNet = String(dto.amountNet);
    if (dto.taxAmount != null) row.taxAmount = String(dto.taxAmount);
    if (dto.total != null) row.total = String(dto.total);

    const amountNet = Number(row.amountNet);
    const taxAmount = Number(row.taxAmount);
    const total = Number(row.total);
    this.assertAmounts(amountNet, taxAmount, total);

    const frequency = dto.frequency ?? row.frequency;
    const dayOfWeek =
      dto.dayOfWeek !== undefined ? dto.dayOfWeek : row.dayOfWeek;
    const dayOfMonth =
      dto.dayOfMonth !== undefined ? dto.dayOfMonth : row.dayOfMonth;

    this.assertSchedule(frequency, dayOfWeek, dayOfMonth);

    const scheduleChanged =
      dto.frequency != null ||
      dto.dayOfWeek !== undefined ||
      dto.dayOfMonth !== undefined;

    row.frequency = frequency;
    row.dayOfWeek =
      frequency === RecurringOperationalExpenseFrequency.WEEKLY
        ? dayOfWeek!
        : null;
    row.dayOfMonth =
      frequency === RecurringOperationalExpenseFrequency.WEEKLY
        ? null
        : dayOfMonth!;

    if (scheduleChanged) {
      row.nextRunAt = computeNextRunAt(new Date(), {
        frequency,
        dayOfWeek,
        dayOfMonth,
      });
    }

    return this.templateRepo.save(row);
  }

  async pause(id: string): Promise<RecurringOperationalExpense> {
    return this.update(id, { isActive: false });
  }

  async resume(id: string): Promise<RecurringOperationalExpense> {
    const row = await this.findOne(id);
    row.isActive = true;
    if (row.nextRunAt.getTime() < Date.now()) {
      row.nextRunAt = computeNextRunAt(new Date(), {
        frequency: row.frequency,
        dayOfWeek: row.dayOfWeek,
        dayOfMonth: row.dayOfMonth,
      });
    }
    return this.templateRepo.save(row);
  }

  /**
   * Generates an operational expense for the period of `at` (default now).
   * Idempotent: SUCCESS for same periodKey returns existing without creating another OE.
   * FAILED rows are retried without advancing nextRunAt until success.
   */
  async generate(
    id: string,
    options?: { at?: Date; advanceSchedule?: boolean },
  ): Promise<GenerateRecurringResult> {
    const at = options?.at ?? new Date();
    const advanceSchedule = options?.advanceSchedule ?? true;
    const template = await this.findOne(id);
    const periodKey = periodKeyFor(at, template.frequency);

    const existing = await this.runRepo.findOne({
      where: { recurringExpenseId: id, periodKey },
    });

    if (
      existing?.status === RecurringOperationalExpenseRunStatus.SUCCESS &&
      existing.operationalExpenseId
    ) {
      if (advanceSchedule && template.nextRunAt.getTime() <= at.getTime()) {
        template.nextRunAt = computeNextRunAt(at, {
          frequency: template.frequency,
          dayOfWeek: template.dayOfWeek,
          dayOfMonth: template.dayOfMonth,
        });
        await this.templateRepo.save(template);
      }
      return {
        skipped: true,
        reason: 'already_generated',
        run: existing,
        operationalExpenseId: existing.operationalExpenseId,
      };
    }

    const shortId = template.id.replace(/-/g, '').slice(0, 8);
    const referenceNumber = `REC-${shortId}-${periodKey}`.slice(0, 60);
    const operationDate = at.toISOString().slice(0, 10);

    try {
      const oe = await this.operationalExpenses.create({
        companyId: template.companyId,
        branchId: template.branchId ?? undefined,
        categoryId: template.categoryId,
        supplierId: template.supplierId,
        name: template.name,
        referenceNumber,
        description: template.description ?? undefined,
        operationDate,
        status: OperationalExpenseStatus.APPROVED,
        documentKind: OperationalExpenseDocumentKind.OTHER,
        fiscalAmounts: {
          subtotal: Number(template.amountNet),
          taxAmount: Number(template.taxAmount),
          total: Number(template.total),
          taxId: template.taxId ?? undefined,
        },
        supplierDocumentPayment: {
          mode: 'PENDING',
          paidLines: [],
          scheduledLines: [],
        },
        createdBy: template.createdBy,
        metadata: {
          recurringOperationalExpenseId: template.id,
          recurringPeriodKey: periodKey,
        },
      });

      let run: RecurringOperationalExpenseRun;
      if (existing) {
        existing.status = RecurringOperationalExpenseRunStatus.SUCCESS;
        existing.operationalExpenseId = oe.id;
        existing.errorMessage = null;
        existing.ranAt = new Date();
        run = await this.runRepo.save(existing);
      } else {
        run = await this.runRepo.save(
          this.runRepo.create({
            companyId: template.companyId,
            recurringExpenseId: template.id,
            periodKey,
            operationalExpenseId: oe.id,
            status: RecurringOperationalExpenseRunStatus.SUCCESS,
            errorMessage: null,
            ranAt: new Date(),
          }),
        );
      }

      if (advanceSchedule) {
        template.lastRunAt = new Date();
        template.nextRunAt = computeNextRunAt(at, {
          frequency: template.frequency,
          dayOfWeek: template.dayOfWeek,
          dayOfMonth: template.dayOfMonth,
        });
        await this.templateRepo.save(template);
      }

      return {
        skipped: false,
        run,
        operationalExpenseId: oe.id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Generate recurring ${id} period ${periodKey} failed: ${message}`,
      );

      if (existing) {
        existing.status = RecurringOperationalExpenseRunStatus.FAILED;
        existing.errorMessage = message;
        existing.ranAt = new Date();
        await this.runRepo.save(existing);
        return { skipped: false, run: existing };
      }

      const run = await this.runRepo.save(
        this.runRepo.create({
          companyId: template.companyId,
          recurringExpenseId: template.id,
          periodKey,
          operationalExpenseId: null,
          status: RecurringOperationalExpenseRunStatus.FAILED,
          errorMessage: message,
          ranAt: new Date(),
        }),
      );
      return { skipped: false, run };
    }
  }

  /** Worker entry: claim due templates and generate. */
  async processDue(limit = 50): Promise<{ processed: number; generated: number }> {
    const due = await this.dataSource.transaction(async (manager) => {
      const rows = await manager.query(
        `
        SELECT id FROM recurring_operational_expenses
        WHERE "isActive" = true AND "nextRunAt" <= NOW()
        ORDER BY "nextRunAt" ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
        `,
        [limit],
      );
      return (rows as Array<{ id: string }>).map((r) => String(r.id));
    });

    let generated = 0;
    for (const id of due) {
      const result = await this.generate(id, { advanceSchedule: true });
      if (!result.skipped && result.run?.status === RecurringOperationalExpenseRunStatus.SUCCESS) {
        generated += 1;
      }
    }
    return { processed: due.length, generated };
  }

  private assertSchedule(
    frequency: RecurringOperationalExpenseFrequency,
    dayOfWeek?: number | null,
    dayOfMonth?: number | null,
  ): void {
    const err = validateRecurrenceSchedule({ frequency, dayOfWeek, dayOfMonth });
    if (err) throw new BadRequestException(err);
  }

  private assertAmounts(net: number, tax: number, total: number): void {
    if (!(total >= 0.01)) {
      throw new BadRequestException('total must be >= 0.01');
    }
    if (Math.abs(net + tax - total) > 1) {
      throw new BadRequestException('amountNet + taxAmount must equal total (±1)');
    }
  }
}
