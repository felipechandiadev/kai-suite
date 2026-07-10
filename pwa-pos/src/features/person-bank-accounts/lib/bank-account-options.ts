import type { Option } from "@kai/ui";

/** Valores alineados con `BankName` del backend (`person.entity`). */
export const BANK_OPTIONS: Option[] = [
  { id: "Banco de Chile", label: "Banco de Chile" },
  { id: "Banco Estado", label: "Banco Estado" },
  { id: "Banco Santander Chile", label: "Banco Santander Chile" },
  { id: "Banco de Crédito e Inversiones", label: "Banco de Crédito e Inversiones" },
  { id: "Banco Falabella", label: "Banco Falabella" },
  { id: "Banco Security", label: "Banco Security" },
  { id: "Banco CrediChile", label: "Banco CrediChile" },
  { id: "Banco Itaú Corpbanca", label: "Banco Itaú Corpbanca" },
  { id: "Scotiabank Chile", label: "Scotiabank Chile" },
  { id: "Banco Consorcio", label: "Banco Consorcio" },
  { id: "Banco Ripley", label: "Banco Ripley" },
  { id: "Banco Internacional", label: "Banco Internacional" },
  { id: "Banco BICE", label: "Banco BICE" },
  { id: "Banco Paris", label: "Banco Paris" },
  { id: "Banco Mercado Pago", label: "Banco Mercado Pago" },
  { id: "Otro", label: "Otro" },
];

export const CUENTA_RUT_ACCOUNT_TYPE_ID = "Cuenta RUT";
export const BANCO_ESTADO_ID = "Banco Estado";
const LEGACY_BANCO_ESTADO_LABEL = "Banco del Estado de Chile";

export const ACCOUNT_TYPE_OPTIONS: Option[] = [
  { id: "Cuenta Corriente", label: "Cuenta Corriente" },
  { id: "Cuenta de Ahorro", label: "Cuenta de Ahorro" },
  { id: "Cuenta Vista", label: "Cuenta Vista" },
  { id: CUENTA_RUT_ACCOUNT_TYPE_ID, label: "Cuenta RUT" },
  { id: "Cuenta Chequera Electrónica", label: "Cuenta Chequera Electrónica" },
  { id: "Otro", label: "Otro tipo" },
];

function isBancoEstadoBank(bankName: string): boolean {
  return bankName === BANCO_ESTADO_ID || bankName === LEGACY_BANCO_ESTADO_LABEL;
}

export function accountTypeOptionsForBank(bankName: string): Option[] {
  if (isBancoEstadoBank(bankName)) {
    return ACCOUNT_TYPE_OPTIONS;
  }
  return ACCOUNT_TYPE_OPTIONS.filter((o) => o.id !== CUENTA_RUT_ACCOUNT_TYPE_ID);
}
