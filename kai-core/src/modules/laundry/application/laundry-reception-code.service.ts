import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LaundryReception } from '../domain/laundry-reception.entity';
import { nextPrefixedSequenceCodeFromExisting } from '@shared/codes/prefixed-sequence-code.util';

export const LAUNDRY_RECEPTION_CODE_PREFIX = 'LV';
export const LAUNDRY_RECEPTION_CODE_PAD = 6;

@Injectable()
export class LaundryReceptionCodeService {
  constructor(
    @InjectRepository(LaundryReception)
    private readonly receptionRepository: Repository<LaundryReception>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Genera el siguiente código LV000001 por sucursal, con transacción y reintentos
   * ante colisión de unique (branch_id, code).
   */
  async generateUniqueCode(branchId: string): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(LaundryReception);
        const rows = await repo
          .createQueryBuilder('r')
          .select('r.code', 'code')
          .where('r.branchId = :branchId', { branchId })
          .andWhere('r.code IS NOT NULL')
          .setLock('pessimistic_write')
          .getRawMany<{ code: string }>();

        return nextPrefixedSequenceCodeFromExisting(
          LAUNDRY_RECEPTION_CODE_PREFIX,
          rows.map((row) => row.code),
          LAUNDRY_RECEPTION_CODE_PAD,
        );
      });

      const taken = await this.receptionRepository.exist({
        where: { branchId, code: candidate },
      });
      if (!taken) return candidate;
    }

    throw new ConflictException(
      'No se pudo generar un código único de recepción de lavandería',
    );
  }
}
