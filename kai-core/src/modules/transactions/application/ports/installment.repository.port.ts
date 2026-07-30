import {
  Installment,
  InstallmentStatus,
} from '../../domain/installment.entity';

/**
 * Installment Repository Port
 * Define la interfaz para acceso a datos de cuotas
 */
export interface InstallmentRepositoryPort {
  /**
   * Guarda una nueva cuota
   */
  save(installment: Installment): Promise<Installment>;

  /**
   * Encuentra cuota por ID
   */
  findById(id: string): Promise<Installment | null>;

  /**
   * Encuentra todas las cuotas de una transacción
   */
  findByTransactionId(transactionId: string): Promise<Installment[]>;

  /**
   * Encuentra cuotas pendientes de pago
   */
  findPendingByTransactionId(transactionId: string): Promise<Installment[]>;

  /**
   * Encuentra cuotas vencidas
   */
  findOverdue(): Promise<Installment[]>;

  /**
   * Actualiza el estado de una cuota
   */
  updateStatus(
    id: string,
    status: InstallmentStatus,
    paymentTransactionId?: string,
  ): Promise<Installment>;

  /**
   * Registra un pago en una cuota
   */
  addPayment(
    id: string,
    amount: number,
    paymentTransactionId: string,
  ): Promise<Installment>;

  /**
   * Elimina una cuota
   */
  delete(id: string): Promise<void>;
}
