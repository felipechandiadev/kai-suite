import { UpdateBankAccountDto } from '../dto/update-bank-account.dto';

export class UpdateBankAccountCommand {
  constructor(
    public readonly accountKey: string,
    public readonly payload: UpdateBankAccountDto,
  ) {}
}
