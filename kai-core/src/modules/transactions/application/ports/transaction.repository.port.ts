import { Transaction } from '../../domain/transaction.entity';

/**
 * Transaction Repository Port
 * Define la interfaz para acceso a datos de transacciones
 * Sigue el patrón Repository para abstracción de persistencia
 */
export interface TransactionRepositoryPort {
  /**
   * Guarda una nueva transacción
   */
  save(transaction: Transaction): Promise<Transaction>;

  /**
   * Encuentra transacción por ID
   */
  findById(id: string): Promise<Transaction | null>;

  /**
   * Encuentra transacción por número de documento
   */
  findByDocumentNumber(
    documentNumber: string,
    branchId: string,
  ): Promise<Transaction | null>;

  /**
   * Encuentra transacciones relacionadas con una transacción específica
   * Útil para consultas bidireccionales: "qué transacciones referencian a esta"
   * @example
   * // Encontrar todos los pagos relacionados con una venta
   * const payments = await findRelatedTo('sale-id');
   * // Retorna: [PAYMENT_IN, PAYMENT_EXECUTION, etc.]
   */
  findRelatedTo(transactionId: string): Promise<Transaction[]>;

  /**
   * Encuentra transacciones hijas de una transacción padre
   * Útil para jerarquías: "qué transacciones derivan de esta"
   * @example
   * // Encontrar todos los pagos de una nómina
   * const payments = await findChildrenOf('payroll-id');
   * // Retorna: [PAYMENT_EXECUTION[]]
   */
  findChildrenOf(parentTransactionId: string): Promise<Transaction[]>;

  /**
   * Busca transacciones con filtros avanzados
   */
  findByFilters(filters: {
    branchId?: string;
    transactionType?: string;
    status?: string;
    customerId?: string;
    supplierId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ transactions: Transaction[]; total: number }>;

  /**
   * Actualiza el estado de una transacción
   */
  updateStatus(
    id: string,
    status: string,
    userId: string,
  ): Promise<Transaction>;

  /**
   * Elimina una transacción (soft delete si es necesario)
   */
  delete(id: string): Promise<void>;
}
