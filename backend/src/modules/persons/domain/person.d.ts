import 'reflect-metadata';
export declare enum PersonType {
  NATURAL = 'NATURAL',
  COMPANY = 'COMPANY',
}
export declare enum DocumentType {
  RUT = 'RUT',
  PASSPORT = 'PASSPORT',
  OTHER = 'OTHER',
}
export declare enum AccountTypeName {
  CUENTA_CORRIENTE = 'Cuenta Corriente',
  CUENTA_AHORRO = 'Cuenta de Ahorro',
  CUENTA_VISTA = 'Cuenta Vista',
  CUENTA_RUT = 'Cuenta RUT',
  CUENTA_CHEQUERA = 'Cuenta Chequera Electr\u00F3nica',
  OTRO_TIPO = 'Otro',
}
export declare enum BankName {
  BANCO_CHILE = 'Banco de Chile',
  BANCO_ESTADO = 'Banco Estado',
  BANCO_SANTANDER = 'Banco Santander Chile',
  BANCO_BCI = 'Banco de Cr\u00E9dito e Inversiones',
  BANCO_FALABELLA = 'Banco Falabella',
  BANCO_SECURITY = 'Banco Security',
  BANCO_CREDICHILE = 'Banco CrediChile',
  BANCO_ITAU = 'Banco Ita\u00FA Corpbanca',
  BANCO_SCOTIABANK = 'Scotiabank Chile',
  BANCO_CONSORCIO = 'Banco Consorcio',
  BANCO_RIPLEY = 'Banco Ripley',
  BANCO_INTERNACIONAL = 'Banco Internacional',
  BANCO_BICE = 'Banco BICE',
  BANCO_PARIS = 'Banco Paris',
  BANCO_MERCADO_PAGO = 'Banco Mercado Pago',
  OTRO = 'Otro',
}
export interface PersonBankAccount {
  accountKey?: string;
  bankName: BankName;
  accountType: AccountTypeName;
  accountNumber: string;
  accountHolderName?: string;
  isPrimary?: boolean;
  notes?: string;
  currentBalance?: number;
}
export declare class Person {
  id: string;
  type: PersonType;
  firstName: string;
  lastName?: string;
  businessName?: string;
  documentType?: DocumentType | null;
  documentNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  bankAccounts?: PersonBankAccount[] | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
