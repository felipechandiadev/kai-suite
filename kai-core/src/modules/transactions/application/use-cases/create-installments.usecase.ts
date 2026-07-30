import { Injectable, BadRequestException } from '@nestjs/common';
import { TransactionRepositoryPort } from '../ports/transaction.repository.port';
import { InstallmentRepositoryPort } from '../ports/installment.repository.port';
import { Transaction, TransactionType } from '../../domain/transaction.entity';
import {
  Installment,
  InstallmentStatus,
} from '../../domain/installment.entity';

/**
 * Comando para crear cuotas
 */
export class CreateInstallmentsCommand {
  constructor(
    public readonly transactionId: string,
    public readonly numberOfInstallments: number,
    public readonly firstDueDate: Date,
    public readonly notes?: string,
  ) {}
}

/**
 * Use Case: Crear Cuotas para una Transacción
 *
 * Crea automáticamente cuotas de pago para transacciones de venta/compra a plazos.
 * Distribuye el monto total equitativamente entre las cuotas.
 */
@Injectable()
export class CreateInstallmentsUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepositoryPort,
    private readonly installmentRepository: InstallmentRepositoryPort,
  ) {}

  async execute(command: CreateInstallmentsCommand): Promise<Installment[]> {
    // Validar transacción padre
    const transaction = await this.transactionRepository.findById(
      command.transactionId,
    );
    if (!transaction) {
      throw new BadRequestException(
        `Transacción ${command.transactionId} no encontrada`,
      );
    }

    // Validar que sea una transacción que permita cuotas
    if (
      ![TransactionType.SALE, TransactionType.PURCHASE].includes(
        transaction.transactionType,
      )
    ) {
      throw new BadRequestException(
        `Tipo de transacción ${transaction.transactionType} no permite cuotas`,
      );
    }

    // Validar que no existan cuotas previas
    const existingInstallments =
      await this.installmentRepository.findByTransactionId(
        command.transactionId,
      );
    if (existingInstallments.length > 0) {
      throw new BadRequestException('La transacción ya tiene cuotas creadas');
    }

    // Validar parámetros
    if (command.numberOfInstallments < 2 || command.numberOfInstallments > 36) {
      throw new BadRequestException('Número de cuotas debe estar entre 2 y 36');
    }

    if (command.firstDueDate <= new Date()) {
      throw new BadRequestException(
        'La primera fecha de vencimiento debe ser futura',
      );
    }

    // Calcular monto por cuota
    const totalAmount = transaction.total;
    const baseAmount =
      Math.floor((totalAmount / command.numberOfInstallments) * 100) / 100;
    const remainder =
      Math.round(
        (totalAmount - baseAmount * command.numberOfInstallments) * 100,
      ) / 100;

    // Crear cuotas
    const installments: Installment[] = [];
    const currentDueDate = new Date(command.firstDueDate);

    for (let i = 1; i <= command.numberOfInstallments; i++) {
      // Distribuir el remanente en la última cuota
      const amount =
        i === command.numberOfInstallments
          ? baseAmount + remainder
          : baseAmount;

      const installment = new Installment();
      installment.transactionId = command.transactionId;
      installment.installmentNumber = i;
      installment.amount = amount;
      installment.amountPaid = 0;
      installment.dueDate = new Date(currentDueDate);
      installment.status = InstallmentStatus.PENDING;
      installment.notes = command.notes;

      installments.push(installment);

      // Avanzar un mes para la siguiente cuota
      currentDueDate.setMonth(currentDueDate.getMonth() + 1);
    }

    // Guardar todas las cuotas
    const savedInstallments: Installment[] = [];
    for (const installment of installments) {
      const saved = await this.installmentRepository.save(installment);
      savedInstallments.push(saved);
    }

    return savedInstallments;
  }
}
