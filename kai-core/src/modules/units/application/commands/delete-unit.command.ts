import { BaseCommand } from '@shared/cqrs';

export class DeleteUnitCommand extends BaseCommand {
  constructor(public readonly unitId: string) {
    super();
  }
}
