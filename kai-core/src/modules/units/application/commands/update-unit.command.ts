import { BaseCommand } from '@shared/cqrs';

export class UpdateUnitCommand extends BaseCommand {
  constructor(
    public readonly unitId: string,
    public readonly name?: string,
    public readonly dimension?: string,
    public readonly conversionFactor?: number,
    public readonly allowDecimals?: boolean,
    public readonly active?: boolean,
  ) {
    super();
  }
}
