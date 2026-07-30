import { CreateBankAccountDto } from '../dto/create-bank-account.dto';

export class CreateBankAccountCommand {
  constructor(public readonly payload: CreateBankAccountDto) {}
}
