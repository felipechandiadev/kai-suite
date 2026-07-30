import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { Employee } from '../domain/employee.entity';
import {
  HrEmployeeTimelineEntry,
  HrEmployeeTimelineKind,
} from '../domain/hr-employee-timeline-entry.entity';

function requireCompanyId(): string {
  const companyId = TenantContext.getCompanyId();
  if (!companyId) throw new BadRequestException('Company context required');
  return companyId;
}

export type AppendTimelineInput = {
  employeeId: string;
  kind: HrEmployeeTimelineKind | string;
  title: string;
  body?: string | null;
  actorUserId?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  payload?: Record<string, unknown> | null;
  occurredAt?: Date;
};

@Injectable()
export class HrEmployeeTimelineService {
  constructor(
    @InjectRepository(HrEmployeeTimelineEntry)
    private readonly timelineRepo: Repository<HrEmployeeTimelineEntry>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  async list(employeeId: string, limit = 100) {
    const companyId = requireCompanyId();
    return this.timelineRepo.find({
      where: { companyId, employeeId },
      order: { occurredAt: 'DESC', createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 500),
    });
  }

  async append(input: AppendTimelineInput) {
    const companyId = requireCompanyId();
    const employee = await this.employeeRepo.findOne({
      where: { id: input.employeeId, companyId },
    });
    if (!employee) throw new NotFoundException('Empleado no encontrado');

    const title = input.title?.trim();
    if (!title) throw new BadRequestException('Título requerido');

    return this.timelineRepo.save(
      this.timelineRepo.create({
        companyId,
        employeeId: input.employeeId,
        occurredAt: input.occurredAt ?? new Date(),
        kind: input.kind,
        title,
        body: input.body?.trim() || null,
        actorUserId: input.actorUserId ?? null,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        payload: input.payload ?? null,
      }),
    );
  }

  async addNote(employeeId: string, body: string, actorUserId?: string | null) {
    const text = body?.trim();
    if (!text) throw new BadRequestException('Escriba la anotación');
    return this.append({
      employeeId,
      kind: HrEmployeeTimelineKind.NOTE,
      title: 'Anotación',
      body: text,
      actorUserId: actorUserId ?? null,
    });
  }
}
