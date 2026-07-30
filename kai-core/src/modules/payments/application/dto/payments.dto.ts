export class CreateMultiplePaymentsDto {
  saleTransactionId!: string;
  payments!: Array<{ amount: number; method?: string; reference?: string }>;
}

export class PayQuotaDto {
  paymentId!: string;
  amount!: number;
  method?: string;
}
