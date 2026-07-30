import { Injectable, BadRequestException } from '@nestjs/common';
import { TransactionRepositoryPort } from '../ports/transaction.repository.port';
import { InstallmentRepositoryPort } from '../ports/installment.repository.port';
import { Transaction, TransactionType } from '../../domain/transaction.entity';
import {
  Installment,
  InstallmentStatus,
} from '../../domain/installment.entity';

/**
 * Comando para pagar una cuota
 */
export class PayInstallmentCommand {
  constructor(
    public readonly installmentId: string,
    public readonly paymentTransactionId: string,
    public readonly amount: number,
  ) {}
}

/**
 * Use Case: Pagar Cuota
 *
 * Registra el pago de una cuota específica.
 * Puede ser pago completo o parcial.
 */
@Injectable()
export class PayInstallmentUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepositoryPort,
    private readonly installmentRepository: InstallmentRepositoryPort,
  ) {}

  async execute(command: PayInstallmentCommand): Promise<Installment> {
    // Validar cuota
    const installment = await this.installmentRepository.findById(
      command.installmentId,
    );
    if (!installment) {
      throw new BadRequestException(
        `Cuota ${command.installmentId} no encontrada`,
      );
    }

    // Validar que esté pendiente o parcialmente pagada
    if (
      ![InstallmentStatus.PENDING, InstallmentStatus.PARTIALLY_PAID].includes(
        installment.status,
      )
    ) {
      throw new BadRequestException(
        `Cuota ${command.installmentId} no está en estado pagable`,
      );
    }

    // Validar transacción de pago
    const paymentTransaction = await this.transactionRepository.findById(
      command.paymentTransactionId,
    );
    if (!paymentTransaction) {
      throw new BadRequestException(
        `Transacción de pago ${command.paymentTransactionId} no encontrada`,
      );
    }

    // Validar tipo de transacción de pago
    const validPaymentTypes =
      installment.transactionId === paymentTransaction.relatedTransactionId
        ? [TransactionType.PAYMENT_IN] // Para ventas
        : [TransactionType.SUPPLIER_PAYMENT]; // Para compras

    if (!validPaymentTypes.includes(paymentTransaction.transactionType)) {
      throw new BadRequestException(
        `Tipo de transacción de pago ${paymentTransaction.transactionType} no válido para esta cuota`,
      );
    }

    // Validar monto
    const pendingAmount = installment.getPendingAmount();
    if (command.amount <= 0 || command.amount > pendingAmount) {
      throw new BadRequestException(
        `Monto de pago ${command.amount} inválido. Pendiente: ${pendingAmount}`,
      );
    }

    // Registrar el pago
    return await this.installmentRepository.addPayment(
      command.installmentId,
      command.amount,
      command.paymentTransactionId,
    );
  }
}
