import { BaseCommand } from '@shared/cqrs';

export class CreateUnitCommand extends BaseCommand {
  constructor(
    public readonly unitId: string,
    public readonly name: string,
    public readonly symbol: string,
    public readonly dimension: string,
    public readonly conversionFactor: number,
    public readonly allowDecimals: boolean = false,
    public readonly isBase: boolean = false,
  ) {
    super();
  }
}
