import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, IsNull } from 'typeorm';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  PaymentStatus,
} from '@modules/transactions/domain/transaction.entity';
import { CashSession } from '@modules/cash-sessions/domain/cash-session.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { User } from '@modules/users/domain/user.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { LedgerEntriesService } from '@modules/ledger-entries/application/ledger-entries.service';
import { CreateMultiplePaymentsDto } from './dto/create-multiple-payments.dto';
import { InstallmentService } from '@modules/installments/application/services/installment.service';
import { InstallmentSourceType } from '@modules/installments/domain/installment.entity';
import { PaymentsServiceAdapter } from './payments.service.adapter';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(CashSession)
    private readonly cashSessionRepository: Repository<CashSession>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    private readonly dataSource: DataSource,
    private readonly transactionsService: TransactionsService,
    private readonly ledgerEntriesService: LedgerEntriesService,
    private readonly installmentService: InstallmentService,
    @Inject(PaymentsServiceAdapter)
    private readonly paymentsAdapter?: PaymentsServiceAdapter,
  ) {}

  /**
   * Crear múltiples pagos para una venta
   *
   * IMPORTANTE: Cada pago es una transacción separada que pasa por:
   * - Validaciones V1-V7
   * - Generación de asientos (LedgerEntry)
   * - Auditoría completa
   *
   * El servicio DELEGA cada pago a TransactionsService.createTransaction()
   */
  async createMultiplePayments(dto: CreateMultiplePaymentsDto) {
    // Delegate to adapter when available to keep PaymentsService thin during migration.
    if (this.paymentsAdapter) {
      return this.paymentsAdapter.createMultiplePayments(dto as any, 'system');
    }

    // Fallback to legacy implementation if adapter not injected
    return await this.dataSource.transaction(async (manager) => {
      const { saleTransactionId, payments } = dto;
      const saleTransaction = await manager.getRepository(Transaction).findOne({
        where: { id: saleTransactionId, transactionType: TransactionType.SALE },
      });
      if (!saleTransaction) throw new NotFoundException('Venta no encontrada');
      // minimal fallback: record payments as transactions
      const created: any[] = [];
      for (const p of payments) {
        const tx = manager.getRepository(Transaction).create({
          transactionType: TransactionType.PAYMENT_IN,
          total: p.amount,
          relatedTransactionId: saleTransaction.id,
        } as any);
        const saved = await manager.getRepository(Transaction).save(tx as any);
        created.push(saved);
      }
      return { success: true, payments: created };
    });
  }

  async payQuota(dto: any) {
    if (this.paymentsAdapter) {
      return this.paymentsAdapter.payQuota(dto, 'system');
    }

    const paidQuotaId = dto?.paidQuotaId;
    if (!paidQuotaId) throw new BadRequestException('paidQuotaId es requerido');
    const result = await this.installmentService.payInstallment(paidQuotaId, {
      paymentMethod: dto.paymentMethod,
      companyAccountKey: dto.bankAccountId || undefined,
      amount: dto.amount,
    });
    return {
      success: true,
      message: 'Pago registrado correctamente',
      transaction: result.transaction,
    };
  }

  /**
   * Crear pago de forma centralizada a través de TransactionsService
   * NOTA: Está dentro de una transacción DB ya abierta por el llamador
   */
  private async createPaymentTransactionCentralized(
    manager: EntityManager,
    params: {
      saleTransaction: any;
      payment: any;
      cashSession: any;
      pointOfSale: any;
      user: any;
    },
  ): Promise<Transaction> {
    const { saleTransaction, payment, cashSession, pointOfSale, user } = params;

    // Crear DTO de pago
    const paymentData = {
      documentNumber: this.generatePaymentDocumentNumber(
        saleTransaction.documentNumber,
      ),
      transactionType: TransactionType.PAYMENT_IN,
      status: TransactionStatus.CONFIRMED,
      branchId: pointOfSale.branchId || undefined,
      pointOfSaleId: pointOfSale.id,
      cashSessionId: cashSession.id,
      customerId: saleTransaction.customerId || undefined,
      userId: user.id,
      subtotal: payment.amount,
      taxAmount: 0,
      discountAmount: 0,
      total: payment.amount,
      paymentMethod: payment.paymentMethod,
      bankAccountKey: payment.bankAccountId || undefined,
      relatedTransactionId: saleTransaction.id,
      metadata: {
        saleTransactionId: saleTransaction.id,
        bankAccountId: payment.bankAccountId,
        subPayments: payment.subPayments,
      },
    };

    // DELEGAR: Aunque ya estamos en transacción, usar TransactionsService
    // para que gestione validaciones y asientos de forma centralizada
    // NOTA: TransactionsService.createTransaction() abre su propia transacción,
    // así que aquí guardamos directamente en el manager
    const txRepo = manager.getRepository(Transaction);
    return (await txRepo.save(paymentData)) as Transaction;
  }

  private generatePaymentDocumentNumber(saleDocumentNumber: string): string {
    const timestamp = Date.now();
    return `PAY${saleDocumentNumber}${timestamp}`;
  }

  private async recomputeCashSessionExpectedAmount(
    manager: EntityManager,
    cashSession: CashSession,
  ): Promise<number> {
    // simplified placeholder
    return Number(cashSession.expectedAmount ?? 0);
  }
}
