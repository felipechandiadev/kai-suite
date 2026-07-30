import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '@modules/users/domain/user.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { CashHub } from '@modules/cash-hubs/domain/cash-hub.entity';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { CreateCapitalContributionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { CreateCapitalContributionRequestDto } from './dto/create-capital-contribution-request.dto';

@Injectable()
export class CapitalContributionsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(CashHub)
    private readonly cashHubRepository: Repository<CashHub>,
    private readonly transactionsService: TransactionsService,
  ) {}

  async list() {
    return [];
  }

  async findOne() {
    return null;
  }

  /**
   * Crear aporte de capital
   *
   * El servicio DELEGA la creación de transacción a TransactionsService,
   * que se encargará de:
   * - Validaciones V1-V7
   * - Generación de LedgerEntry
   * - Auditoría completa
   */
  async create(payload: CreateCapitalContributionRequestDto) {
    const shareholderId = this.asString(payload.shareholderId);
    const bankAccountKey = this.asString(payload.bankAccountKey);
    const cashHubId = this.asString(payload.cashHubId);
    const amount = Number(payload.amount ?? 0);
    const notes = this.asString(payload.notes);
    const occurredOn = this.asString(payload.occurredOn);

    if (!shareholderId || amount <= 0) {
      return {
        success: false,
        error: 'Socio y monto son obligatorios.',
      };
    }
    if (!bankAccountKey && !cashHubId) {
      return {
        success: false,
        error: 'Indique cuenta bancaria o centro de efectivo destino.',
      };
    }
    if (cashHubId) {
      const hub = await this.cashHubRepository.findOne({
        where: { id: cashHubId },
      });
      if (!hub) {
        return {
          success: false,
          error: 'Centro de efectivo no encontrado.',
        };
      }
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
      const createTxDto = new CreateCapitalContributionDto();
      createTxDto.shareholderId = shareholderId;
      if (cashHubId) {
        createTxDto.cashHubId = cashHubId;
      } else if (bankAccountKey) {
        createTxDto.bankAccountKey = bankAccountKey;
      }
      createTxDto.amount = amount;
      createTxDto.notes = notes || undefined;
      createTxDto.occurredOn = occurredOn || undefined;

      // Obtener una rama válida de la base de datos
      const branch = await this.branchRepository.findOne({
        where: { deletedAt: IsNull() },
        order: { createdAt: 'ASC' },
      });

      if (!branch) {
        return { success: false, error: 'No branch available' };
      }

      // DELEGAR: TransactionsService.createTransaction()
      // El servicio se encargará de:
      // 1. Generar documentNumber único
      // 2. Validaciones V1-V7
      // 3. Crear Transaction
      // 4. Generar asientos (LedgerEntry)
      // 5. Retornar transacción completa
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
        error: `Error al crear aporte: ${(err as Error).message}`,
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

  private buildDocumentNumber(prefix: string): string {
    const stamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14);
    const suffix = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `${prefix}-${stamp}-${suffix}`;
  }
}
