import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { ProductionUnit } from '../domain/production-unit.entity';
import { nextProductionUnitCodeFromExisting } from './production-unit-code.util';

@Injectable()
export class ProductionUnitsService {
  constructor(
    @InjectRepository(ProductionUnit)
    private readonly productionUnitRepository: Repository<ProductionUnit>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Storage)
    private readonly storageRepository: Repository<Storage>,
  ) {}

  private requireCompanyId(): string {
    const companyId = TenantContext.getCompanyId();
    if (!companyId) {
      throw new BadRequestException('No hay empresa activa en el contexto.');
    }
    return companyId;
  }

  private async assertBranchInCompany(
    branchId: string,
    companyId: string,
  ): Promise<Branch> {
    const branch = await this.branchRepository.findOne({
      where: { id: branchId, companyId },
    });
    if (!branch) {
      throw new BadRequestException(
        'Sucursal no válida o no pertenece a la empresa.',
      );
    }
    return branch;
  }

  private async assertStorageInCompany(
    storageId: string,
    companyId: string,
  ): Promise<Storage> {
    const storage = await this.storageRepository.findOne({
      where: { id: storageId, companyId },
    });
    if (!storage) {
      throw new BadRequestException(
        'Almacén no válido o no pertenece a la empresa.',
      );
    }
    return storage;
  }

  private async allocateNextCode(
    companyId: string,
    branchId: string,
  ): Promise<string> {
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const rows = await this.productionUnitRepository.find({
        where: { companyId, branchId },
        select: ['code'],
      });
      const candidate = nextProductionUnitCodeFromExisting(
        rows.map((r) => r.code),
      );
      const taken = await this.productionUnitRepository.exist({
        where: { companyId, branchId, code: candidate },
      });
      if (!taken) {
        return candidate;
      }
    }
    throw new ConflictException(
      'No se pudo generar un código único para la unidad de producción. Intente de nuevo.',
    );
  }

  async findAll(options?: {
    branchId?: string;
    includeInactive?: boolean;
  }): Promise<ProductionUnit[]> {
    const companyId = this.requireCompanyId();
    const qb = this.productionUnitRepository
      .createQueryBuilder('pu')
      .leftJoinAndSelect('pu.branch', 'branch')
      .leftJoinAndSelect('pu.defaultInputStorage', 'defaultInputStorage')
      .where('pu.companyId = :companyId', { companyId })
      .orderBy('pu.name', 'ASC');

    if (options?.branchId) {
      qb.andWhere('pu.branchId = :branchId', { branchId: options.branchId });
    }
    if (!options?.includeInactive) {
      qb.andWhere('pu.isActive = :isActive', { isActive: true });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<ProductionUnit | null> {
    const companyId = this.requireCompanyId();
    return this.productionUnitRepository.findOne({
      where: { id, companyId },
      relations: ['branch', 'defaultInputStorage'],
    });
  }

  async create(data: {
    branchId: string;
    code?: string;
    name: string;
    defaultInputStorageId?: string | null;
    isActive?: boolean;
  }): Promise<ProductionUnit> {
    const companyId = this.requireCompanyId();
    await this.assertBranchInCompany(data.branchId, companyId);

    const name = data.name.trim();
    if (!name) {
      throw new BadRequestException('El nombre de la unidad es obligatorio.');
    }

    if (data.defaultInputStorageId) {
      await this.assertStorageInCompany(data.defaultInputStorageId, companyId);
    }

    const provided = data.code?.trim();
    let code: string;
    if (provided) {
      const dup = await this.productionUnitRepository.findOne({
        where: { companyId, branchId: data.branchId, code: provided },
      });
      if (dup) {
        throw new ConflictException(
          `Ya existe una unidad de producción con el código «${provided}» en esta sucursal.`,
        );
      }
      code = provided;
    } else {
      code = await this.allocateNextCode(companyId, data.branchId);
    }

    const row = this.productionUnitRepository.create({
      companyId,
      branchId: data.branchId,
      code,
      name,
      defaultInputStorageId: data.defaultInputStorageId ?? null,
      isActive: data.isActive !== false,
    });
    return this.productionUnitRepository.save(row);
  }

  async update(
    id: string,
    data: Partial<{
      branchId: string;
      code: string;
      name: string;
      defaultInputStorageId: string | null;
      isActive: boolean;
    }>,
  ): Promise<ProductionUnit> {
    const companyId = this.requireCompanyId();
    const existing = await this.productionUnitRepository.findOne({
      where: { id, companyId },
    });
    if (!existing) {
      throw new NotFoundException('Unidad de producción no encontrada.');
    }

    const branchId = data.branchId ?? existing.branchId;
    if (data.branchId !== undefined) {
      await this.assertBranchInCompany(branchId, companyId);
      existing.branchId = branchId;
    }

    if (data.defaultInputStorageId !== undefined) {
      if (data.defaultInputStorageId) {
        await this.assertStorageInCompany(data.defaultInputStorageId, companyId);
      }
      existing.defaultInputStorageId = data.defaultInputStorageId;
    }

    if (data.code !== undefined) {
      const code = data.code.trim();
      if (!code) {
        throw new BadRequestException('El código de la unidad es obligatorio.');
      }
      const dup = await this.productionUnitRepository.findOne({
        where: { companyId, branchId, code },
      });
      if (dup && dup.id !== id) {
        throw new ConflictException(
          `Ya existe una unidad de producción con el código «${code}» en esta sucursal.`,
        );
      }
      existing.code = code;
    }

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) {
        throw new BadRequestException('El nombre de la unidad es obligatorio.');
      }
      existing.name = name;
    }

    if (data.isActive !== undefined) {
      existing.isActive = data.isActive;
    }

    return this.productionUnitRepository.save(existing);
  }
}
