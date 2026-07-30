export interface PaymentsRepositoryPort {
  createPayment(payload: any): Promise<any>;
  getPaymentById(id: string): Promise<any | null>;
  findPaymentsBySaleId(saleId: string): Promise<any[]>;
}

export const PAYMENTS_REPOSITORY = 'PaymentsRepositoryPort';
