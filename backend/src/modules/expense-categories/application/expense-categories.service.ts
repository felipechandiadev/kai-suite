import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ExpenseCategoriesRepository } from '../infrastructure/expense-categories.repository';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { ExpenseCategory } from '../domain/expense-category.entity';

@Injectable()
export class ExpenseCategoriesService {
  private readonly logger = new Logger(ExpenseCategoriesService.name);

  constructor(private readonly repository: ExpenseCategoriesRepository) {}

  /**
   * Si viene código explícito, valida unicidad; si no, genera EC + UUID (máx. 50).
   */
  private async resolveUniqueCode(provided?: string | null): Promise<string> {
    const trimmed = provided?.trim();
    if (trimmed) {
      const taken = await this.repository.findByCode(trimmed);
      if (taken) {
        throw new BadRequestException(`El código «${trimmed}» ya está en uso`);
      }
      return trimmed;
    }
    for (let i = 0; i < 8; i++) {
      const candidate = `EC${randomUUID().replace(/-/g, '').toUpperCase()}`.slice(0, 50);
      const exists = await this.repository.findByCode(candidate);
      if (!exists) {
        return candidate;
      }
    }
    throw new InternalServerErrorException('No se pudo generar un código único');
  }

  async findAll(params?: {
    limit?: number;
    offset?: number;
    companyId?: string;
    isActive?: boolean;
  }): Promise<{ data: ExpenseCategory[]; total: number }> {
    const { limit = 50, offset = 0, companyId, isActive } = params || {};

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.repository.findAll({
        where,
        take: limit,
        skip: offset,
        relations: ['company', 'defaultResultCenter'],
        order: { createdAt: 'DESC' },
      }),
      this.repository.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string): Promise<ExpenseCategory> {
    const category = await this.repository.findOne(id);
    if (!category) {
      throw new NotFoundException(`Expense category ${id} not found`);
    }
    return category;
  }

  async create(dto: CreateExpenseCategoryDto): Promise<ExpenseCategory> {
    this.logger.log(`Creating expense category: ${dto.name}`);
    const code = await this.resolveUniqueCode(dto.code);
    const data: any = { ...dto, code, nonDeletable: false };
    if (dto.approvalThreshold !== undefined) {
      data.approvalThreshold = dto.approvalThreshold.toString();
    }
    return this.repository.create(data);
  }

  async update(
    id: string,
    dto: UpdateExpenseCategoryDto,
  ): Promise<ExpenseCategory> {
    const category = await this.findOne(id);
    this.logger.log(`Updating expense category ${id}`);
    const { code: dtoCode, ...dtoRest } = dto;
    const data: any = { ...dtoRest };
    delete data.nonDeletable;

    if (dtoCode !== undefined) {
      const t = String(dtoCode).trim();
      if (t !== '') {
        const current = (category.code ?? '').trim();
        if (t !== current) {
          const taken = await this.repository.findByCode(t);
          if (taken && taken.id !== id) {
            throw new BadRequestException(`El código «${t}» ya está en uso`);
          }
          data.code = t;
        }
      }
    }

    if (dto.approvalThreshold !== undefined) {
      data.approvalThreshold = dto.approvalThreshold.toString();
    }

    for (const k of Object.keys(data)) {
      if (data[k] === undefined) {
        delete data[k];
      }
    }

    return this.repository.update(id, data);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    if (category.nonDeletable) {
      throw new ForbiddenException(
        `La categoría «${category.name}» es de sistema y no se puede eliminar`,
      );
    }
    this.logger.log(`Removing expense category ${id}`);
    await this.repository.remove(id);
  }
}
