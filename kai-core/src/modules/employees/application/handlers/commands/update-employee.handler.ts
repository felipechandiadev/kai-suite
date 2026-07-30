import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UpdateEmployeeCommand } from '@modules/employees/application/commands/update-employee.command';
import { EmployeeRepositoryPort } from '@modules/employees/application/ports/employee.repository.port';
import { Employee } from '@modules/employees/domain/employee.entity';
import { HrEmployeeTimelineService } from '../../hr-employee-timeline.service';
import { HrEmployeeTimelineKind } from '@modules/employees/domain/hr-employee-timeline-entry.entity';
import { TenantContext } from '@common/tenant/tenant.context';

@CommandHandler(UpdateEmployeeCommand)
export class UpdateEmployeeCommandHandler
  implements ICommandHandler<UpdateEmployeeCommand>
{
  constructor(
    @Inject('EmployeeRepositoryPort')
    private readonly employeeRepository: EmployeeRepositoryPort,
    private readonly timelineService: HrEmployeeTimelineService,
  ) {}

  async execute(command: UpdateEmployeeCommand): Promise<Employee> {
    const before = await this.employeeRepository.findEmployeeById(command.id);
    const updated = await this.employeeRepository.updateEmployee(command);

    if (!before) return updated;

    const actorUserId = TenantContext.getUserId() ?? null;
    const changes: string[] = [];

    if (
      command.organizationalUnitId !== undefined &&
      (before.organizationalUnitId ?? null) !==
        (updated.organizationalUnitId ?? null)
    ) {
      try {
        await this.timelineService.append({
          employeeId: updated.id,
          kind: HrEmployeeTimelineKind.ORG_UNIT_CHANGED,
          title: 'Cambio de unidad organizativa',
          body: null,
          actorUserId,
          sourceType: 'Employee',
          sourceId: updated.id,
          payload: {
            from: before.organizationalUnitId ?? null,
            to: updated.organizationalUnitId ?? null,
          },
        });
      } catch {
        // never fail update
      }
    }

    if (
      command.laborUnitId !== undefined &&
      (before.laborUnitId ?? null) !== (updated.laborUnitId ?? null)
    ) {
      try {
        await this.timelineService.append({
          employeeId: updated.id,
          kind: HrEmployeeTimelineKind.LABOR_UNIT_CHANGED,
          title: 'Cambio de unidad laboral',
          body: null,
          actorUserId,
          sourceType: 'Employee',
          sourceId: updated.id,
          payload: {
            from: before.laborUnitId ?? null,
            to: updated.laborUnitId ?? null,
          },
        });
      } catch {
        // never fail update
      }
    }

    if (
      command.branchId !== undefined &&
      (before.branchId ?? null) !== (updated.branchId ?? null)
    ) {
      changes.push('sucursal');
    }
    if (
      command.resultCenterId !== undefined &&
      (before.resultCenterId ?? null) !== (updated.resultCenterId ?? null)
    ) {
      changes.push('centro de resultado');
    }
    if (
      command.employmentType !== undefined &&
      before.employmentType !== updated.employmentType
    ) {
      changes.push('tipo de empleo');
    }
    if (
      command.status !== undefined &&
      before.status !== updated.status
    ) {
      changes.push('estado');
    }
    if (
      command.terminationDate !== undefined &&
      String(before.terminationDate ?? '') !==
        String(updated.terminationDate ?? '')
    ) {
      changes.push('fecha de término');
    }

    if (changes.length > 0) {
      try {
        await this.timelineService.append({
          employeeId: updated.id,
          kind: HrEmployeeTimelineKind.EMPLOYEE_UPDATED,
          title: 'Actualización de ficha',
          body: `Cambios: ${changes.join(', ')}`,
          actorUserId,
          sourceType: 'Employee',
          sourceId: updated.id,
          payload: { fields: changes },
        });
      } catch {
        // never fail update
      }
    }

    return updated;
  }
}
