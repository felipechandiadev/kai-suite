import {
  BadRequestException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringOperationalExpense } from '../domain/recurring-operational-expense.entity';
import { RecurringOperationalExpenseRun } from '../domain/recurring-operational-expense-run.entity';
import {
  OperationalExpense,
  OperationalExpenseDocumentKind,
} from '../domain/operational-expense.entity';
import { CreateRecurringOperationalExpenseDto } from './dto/create-recurring-operational-expense.dto';
import { UpdateRecurringOperationalExpenseDto } from './dto/update-recurring-operational-expense.dto';
import { CreateRecurringFromOperatingExpenseDto } from './dto/create-recurring-from-operating-expense.dto';

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
    @InjectRepository(OperationalExpense)
    private readonly operationalExpenseRepo: Repository<OperationalExpense>,
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

  /**
   * Creates a manual template from an existing operational expense.
   * Copies identity fields only (no amounts, folio, payment, or schedule).
   */
  async createFromOperatingExpense(
    dto: CreateRecurringFromOperatingExpenseDto,
  ): Promise<RecurringOperationalExpense> {
    const oe = await this.operationalExpenseRepo.findOne({
      where: { id: dto.operationalExpenseId, companyId: dto.companyId },
    });
    if (!oe) {
      throw new NotFoundException(
        `Operational expense ${dto.operationalExpenseId} not found`,
      );
    }
    if (!oe.supplierId) {
      throw new BadRequestException(
        'El gasto operativo debe tener proveedor para crear una plantilla.',
      );
    }

    const taxFromMeta =
      oe.metadata?.linkedTributaryDocument?.taxId != null
        ? String(oe.metadata.linkedTributaryDocument.taxId)
        : null;

    const entity = this.templateRepo.create({
      companyId: oe.companyId,
      branchId: oe.branchId ?? null,
      name: oe.name.trim(),
      description: oe.description?.trim() || null,
      categoryId: oe.categoryId,
      supplierId: oe.supplierId,
      documentKind:
        oe.documentKind ?? OperationalExpenseDocumentKind.OTHER,
      amountNet: null,
      taxAmount: null,
      total: null,
      taxId: dto.taxId !== undefined ? dto.taxId : taxFromMeta,
      frequency: null,
      dayOfWeek: null,
      dayOfMonth: null,
      nextRunAt: null,
      lastRunAt: null,
      isActive: true,
      sourceOperationalExpenseId: oe.id,
      createdBy: dto.createdBy,
    } as Partial<RecurringOperationalExpense>);

    return this.templateRepo.save(entity);
  }

  async create(
    dto: CreateRecurringOperationalExpenseDto,
  ): Promise<RecurringOperationalExpense> {
    const entity = this.templateRepo.create({
      companyId: dto.companyId,
      branchId: dto.branchId ?? null,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      categoryId: dto.categoryId,
      supplierId: dto.supplierId,
      documentKind:
        dto.documentKind ?? OperationalExpenseDocumentKind.OTHER,
      amountNet: dto.amountNet != null ? String(dto.amountNet) : null,
      taxAmount: dto.taxAmount != null ? String(dto.taxAmount) : null,
      total: dto.total != null ? String(dto.total) : null,
      taxId: dto.taxId ?? null,
      frequency: dto.frequency ?? null,
      dayOfWeek: dto.dayOfWeek ?? null,
      dayOfMonth: dto.dayOfMonth ?? null,
      nextRunAt: null,
      lastRunAt: null,
      isActive: dto.isActive ?? true,
      sourceOperationalExpenseId: dto.sourceOperationalExpenseId ?? null,
      createdBy: dto.createdBy,
    } as Partial<RecurringOperationalExpense>);

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
    if (dto.documentKind != null) row.documentKind = dto.documentKind;
    if (dto.taxId !== undefined) row.taxId = dto.taxId;
    if (dto.isActive != null) row.isActive = dto.isActive;

    return this.templateRepo.save(row);
  }

  async pause(id: string): Promise<RecurringOperationalExpense> {
    return this.update(id, { isActive: false });
  }

  async resume(id: string): Promise<RecurringOperationalExpense> {
    return this.update(id, { isActive: true });
  }

  /**
   * @deprecated Manual templates: create an OE from the template dialog instead.
   */
  async generate(
    _id: string,
    _options?: { at?: Date; advanceSchedule?: boolean },
  ): Promise<GenerateRecurringResult> {
    throw new GoneException(
      'La generación automática está deshabilitada. Cree un gasto operativo desde la plantilla.',
    );
  }

  /** Worker entry: no-op (templates are manual). */
  async processDue(
    _limit = 50,
  ): Promise<{ processed: number; generated: number }> {
    this.logger.debug('processDue skipped: recurring OE templates are manual');
    return { processed: 0, generated: 0 };
  }
}
