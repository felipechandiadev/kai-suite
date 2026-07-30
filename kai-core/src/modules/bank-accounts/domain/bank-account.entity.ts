import { AccountTypeName, BankName } from '@modules/persons/domain/person.entity';

export type BankAccountOwnerType = 'person' | 'company';

export class BankAccount {
  accountKey!: string;
  ownerType!: BankAccountOwnerType;
  ownerId!: string;
  ownerName!: string;
  bankName!: BankName;
  accountType!: AccountTypeName;
  accountNumber!: string;
  accountHolderName?: string;
  accountHolderRut?: string;
  isPrimary?: boolean;
  notes?: string;
  currentBalance?: number;
}
