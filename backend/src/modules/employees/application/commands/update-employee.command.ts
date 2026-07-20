import { BaseCommand } from '@shared/cqrs';

export class UpdateEmployeeCommand extends BaseCommand {
  constructor(
    readonly id: string,
    readonly branchId: string | null | undefined,
    readonly resultCenterId: string | null | undefined,
    readonly organizationalUnitId: string | null | undefined,
    readonly laborUnitId: string | undefined,
    readonly employmentType: string | undefined,
    readonly status: string | undefined,
    readonly terminationDate: string | null | undefined,
    readonly baseSalary: string | null | undefined,
    readonly metadata: Record<string, unknown> | undefined,
    readonly workRegime: string | undefined = undefined,
  ) {
    super();
  }
}
