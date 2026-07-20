import { BaseCommand } from '@shared/cqrs';

export class CreateEmployeeCommand extends BaseCommand {
  constructor(
    readonly personId: string,
    readonly companyId: string | undefined,
    readonly branchId: string | undefined,
    readonly resultCenterId: string | undefined,
    readonly organizationalUnitId: string | undefined,
    readonly laborUnitId: string,
    readonly employmentType: string,
    readonly hireDate: string,
    readonly baseSalary: string | undefined,
    readonly metadata: Record<string, unknown> | undefined,
  ) {
    super();
  }
}
