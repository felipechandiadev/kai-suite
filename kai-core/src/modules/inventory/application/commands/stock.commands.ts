import {
  CreateAdjustmentDto,
  CreateTransferDto,
  RecalculateValuationDto,
} from '../dto/stock-level.dto';

export class CreateAdjustmentCommand {
  constructor(public readonly adjustmentData: CreateAdjustmentDto) {}
}

export class CreateTransferCommand {
  constructor(public readonly transferData: CreateTransferDto) {}
}

export class RecalculateValuationCommand {
  constructor(public readonly data: RecalculateValuationDto) {}
}
