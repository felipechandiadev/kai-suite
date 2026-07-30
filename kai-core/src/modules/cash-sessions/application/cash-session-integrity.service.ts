import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashSession } from '@modules/cash-sessions/domain/cash-session.entity';

@Injectable()
export class CashSessionIntegrityService {
  constructor(
    @InjectRepository(CashSession)
    private readonly cashSessionRepository: Repository<CashSession>,
  ) {}

  async validateIntegrity(): Promise<{
    valid: boolean;
    anomalies: string[];
    totalSessions: number;
  }> {
    const anomalies: string[] = [];

    const sessions = await this.cashSessionRepository.find();

    const invalidIds = sessions.filter((session) => {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      return !uuidRegex.test(session.id);
    });

    if (invalidIds.length > 0) {
      anomalies.push(
        `Encontrados ${invalidIds.length} IDs no válidos: ${invalidIds.map((s) => s.id).join(', ')}`,
      );
    }

    const openSessionsByPos = sessions
      .filter((s) => s.status === 'OPEN' && s.pointOfSaleId)
      .reduce(
        (acc, session) => {
          const posId = session.pointOfSaleId!;
          if (!acc[posId]) {
            acc[posId] = [];
          }
          acc[posId].push(session);
          return acc;
        },
        {} as Record<string, typeof sessions>,
      );

    Object.entries(openSessionsByPos).forEach(([posId, sessions]) => {
      if (sessions.length > 1) {
        anomalies.push(
          `POS ${posId} tiene ${sessions.length} sesiones abiertas`,
        );
      }
    });

    return {
      valid: anomalies.length === 0,
      anomalies,
      totalSessions: sessions.length,
    };
  }

  async cleanupCorruptSessions(): Promise<{ deletedCount: number }> {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

    const corruptSessions = await this.cashSessionRepository
      .createQueryBuilder('cs')
      .where('cs.id NOT REGEXP :regex', { regex: uuidRegex.source })
      .getMany();

    if (corruptSessions.length > 0) {
      await this.cashSessionRepository.remove(corruptSessions);
    }

    return { deletedCount: corruptSessions.length };
  }
}
