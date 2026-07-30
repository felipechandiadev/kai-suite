import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '@modules/users/domain/user.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { CreateCashDepositDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { CreateCashDepositRequestDto } from './dto/create-cash-deposit-request.dto';

@Injectable()
export class CashDepositsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    private readonly transactionsService: TransactionsService,
  ) {}

  async list() {
    return [];
  }

  /**
   * Crear depósito de caja
   *
   * El servicio DELEGA la creación de transacción a TransactionsService,
   * que se encargará de:
   * - Validaciones V1-V7 (saldo caja, etc)
   * - Generación de LedgerEntry
   * - Auditoría completa
   */
  async create(payload: CreateCashDepositRequestDto) {
    const bankAccountKey = this.asString(payload.bankAccountKey);
    const amount = Number(payload.amount ?? 0);
    const notes = this.asString(payload.notes);
    const occurredOn = this.asString(payload.occurredOn);

    const cashHubId = this.asString(payload.cashHubId);
    if (!bankAccountKey || !cashHubId || amount <= 0) {
      return {
        success: false,
        error: 'Centro de efectivo, cuenta bancaria y monto son obligatorios.',
      };
    }

    const user = await this.userRepository.findOne({
      where: { deletedAt: IsNull() },
      order: { userName: 'ASC' },
    });

    if (!user) {
      return {
        success: false,
        error: 'No hay usuarios disponibles para registrar el movimiento.',
      };
    }

    try {
      // Convertir a DTO estándar
      const createTxDto = new CreateCashDepositDto();
      createTxDto.bankAccountKey = bankAccountKey;
      createTxDto.amount = amount;
      createTxDto.notes = notes || undefined;
      createTxDto.occurredOn = occurredOn || undefined;
      createTxDto.cashHubId = cashHubId;

      // Obtener una rama válida de la base de datos
      const branch = await this.branchRepository.findOne({
        where: { deletedAt: IsNull() },
        order: { createdAt: 'ASC' },
      });

      if (!branch) {
        return { success: false, error: 'No branch available' };
      }

      // DELEGAR: TransactionsService.createTransaction()
      const transaction = await this.transactionsService.createTransaction(
        createTxDto.toCreateTransactionDto(user.id, branch.id),
      );

      return {
        success: true,
        data: {
          id: transaction.id,
          documentNumber: transaction.documentNumber,
          createdAt: transaction.createdAt,
          asientos: transaction.metadata?.ledgerEntriesGenerated,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: `Error al crear depósito: ${(err as Error).message}`,
      };
    }
  }

  private asString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
