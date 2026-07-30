import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '@modules/users/domain/user.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { CreateCashWithdrawalToPettyCashDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { CreatePettyCashWithdrawalRequestDto } from './dto/create-petty-cash-withdrawal-request.dto';

@Injectable()
export class PettyCashWithdrawalsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    private readonly transactionsService: TransactionsService,
  ) {}

  async create(payload: CreatePettyCashWithdrawalRequestDto) {
    const bankAccountKey = this.asString(payload.bankAccountKey);
    const amount = Number(payload.amount ?? 0);
    const notes = this.asString(payload.notes);
    const occurredOn = this.asString(payload.occurredOn);

    if (!bankAccountKey || amount <= 0) {
      return {
        success: false,
        error: 'Cuenta bancaria y monto son obligatorios.',
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
      const createTxDto = new CreateCashWithdrawalToPettyCashDto();
      createTxDto.bankAccountKey = bankAccountKey;
      createTxDto.amount = amount;
      createTxDto.notes = notes || undefined;
      createTxDto.occurredOn = occurredOn || undefined;

      const branch = await this.branchRepository.findOne({
        where: { deletedAt: IsNull() },
        order: { createdAt: 'ASC' },
      });

      if (!branch) {
        return { success: false, error: 'No branch available' };
      }

      const transaction = await this.transactionsService.createTransaction(
        createTxDto.toCreateTransactionDto(user.id, branch.id),
      );

      return {
        success: true,
        data: {
          id: transaction.id,
          documentNumber: transaction.documentNumber,
          createdAt: transaction.createdAt,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: `Error al registrar giro a caja: ${(err as Error).message}`,
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
