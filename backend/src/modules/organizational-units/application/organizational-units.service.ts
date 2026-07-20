import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OrganizationalUnit,
  OrganizationalUnitType,
} from '../domain/organizational-unit.entity';
import { Company } from '../../companies/domain/company.entity';
import {
  HR_ORG_UNIT_CODE_PREFIX,
  nextPrefixedSequenceCodeFromExisting,
} from '@shared/codes/prefixed-sequence-code.util';
import { LaborUnitsService } from '@modules/hr-labor-units/application/labor-units.service';

@Injectable()
export class OrganizationalUnitsService {
  constructor(
    @InjectRepository(OrganizationalUnit)
    private readonly organizationalUnitRepository: Repository<OrganizationalUnit>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly laborUnitsService: LaborUnitsService,
  ) {}

  async getOrganizationalUnitById(id: string) {
    const unit = await this.organizationalUnitRepository.findOne({
      where: { id },
      relations: ['company', 'branch', 'resultCenter', 'parent'],
    });

    if (!unit) {
      return null;
    }

    const laborUnitIds =
      await this.laborUnitsService.listLaborUnitIdsForOrganizationalUnit(id);
    return this.formatOrganizationalUnit(unit, laborUnitIds);
  }

  async getAllOrganizationalUnits(params?: {
    includeInactive?: boolean;
    unitType?: OrganizationalUnitType;
    branchId?: string;
    companyId?: string;
    resultCenterId?: string;
  }) {
    const query = this.organizationalUnitRepository.createQueryBuilder('ou');

    query.leftJoinAndSelect('ou.company', 'company');
    query.leftJoinAndSelect('ou.branch', 'branch');
    query.leftJoinAndSelect('ou.resultCenter', 'resultCenter');
    query.leftJoinAndSelect('ou.parent', 'parent');

    if (!params?.includeInactive) {
      query.andWhere('ou.isActive = :isActive', { isActive: true });
    }

    if (params?.unitType) {
      query.andWhere('ou.unitType = :unitType', { unitType: params.unitType });
    }

    if (params?.branchId) {
      query.andWhere('ou.branchId = :branchId', { branchId: params.branchId });
    }

    if (params?.companyId) {
      query.andWhere('ou.companyId = :companyId', {
        companyId: params.companyId,
      });
    }

    if (params?.resultCenterId) {
      query.andWhere('ou.resultCenterId = :resultCenterId', {
        resultCenterId: params.resultCenterId,
      });
    }

    const units = await query.orderBy('ou.code', 'ASC').getMany();
    const luMap =
      await this.laborUnitsService.mapLaborUnitIdsByOrganizationalUnitIds(
        units.map((u) => u.id),
      );

    return units.map((item) =>
      this.formatOrganizationalUnit(item, luMap.get(item.id) ?? []),
    );
  }

  async createOrganizationalUnit(data: {
    companyId?: string;
    name: string;
    description?: string | null;
    unitType?: OrganizationalUnitType | string;
    parentId?: string | null;
    branchId?: string | null;
    resultCenterId?: string | null;
    laborUnitIds?: string[];
    isActive?: boolean;
    metadata?: Record<string, unknown> | null;
  }) {
    let companyId = data.companyId;

    // If companyId not provided, get the first available company
    if (!companyId) {
      const firstCompany = await this.companyRepository.findOne({
        where: {},
        order: { createdAt: 'ASC' },
      });

      if (!firstCompany) {
        throw new Error('No company found. Please create a company first.');
      }

      companyId = firstCompany.id;
    }

    const code = await this.allocateNextCode(companyId);
    const { laborUnitIds, ...rest } = data;

    const createData = {
      ...rest,
      companyId,
      code,
      description: data.description ?? undefined,
      metadata: data.metadata ?? undefined,
      unitType:
        (data.unitType as OrganizationalUnitType) ??
        OrganizationalUnitType.OTHER,
    };

    const unit = this.organizationalUnitRepository.create(
      createData as Partial<OrganizationalUnit>,
    );
    await this.organizationalUnitRepository.save(unit);

    if (laborUnitIds !== undefined) {
      await this.laborUnitsService.syncOrganizationalUnitLaborUnits(
        unit.id,
        laborUnitIds,
      );
    }

    return this.getOrganizationalUnitById(unit.id);
  }

  async updateOrganizationalUnit(
    id: string,
    data: Partial<{
      name: string;
      description?: string | null;
      unitType?: OrganizationalUnitType | string;
      parentId?: string | null;
      branchId?: string | null;
      resultCenterId?: string | null;
      laborUnitIds?: string[];
      isActive?: boolean;
      metadata?: Record<string, unknown> | null;
    }>,
  ) {
    const { laborUnitIds, ...rest } = data;
    const updateData = { ...rest };
    // code is immutable — never accept from client
    delete (updateData as { code?: unknown }).code;
    if (updateData.unitType) {
      (updateData as any).unitType =
        updateData.unitType as OrganizationalUnitType;
    }
    if ('description' in updateData) {
      (updateData as any).description = updateData.description ?? undefined;
    }
    if ('metadata' in updateData) {
      (updateData as any).metadata = updateData.metadata ?? undefined;
    }

    await this.organizationalUnitRepository.update(id, updateData as any);

    if (laborUnitIds !== undefined) {
      await this.laborUnitsService.syncOrganizationalUnitLaborUnits(
        id,
        laborUnitIds,
      );
    }

    return this.getOrganizationalUnitById(id);
  }

  private async allocateNextCode(companyId: string): Promise<string> {
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const rows = await this.organizationalUnitRepository.find({
        where: { companyId },
        select: ['code'],
        withDeleted: true,
      });
      const candidate = nextPrefixedSequenceCodeFromExisting(
        HR_ORG_UNIT_CODE_PREFIX,
        rows.map((r) => r.code),
      );
      const taken = await this.organizationalUnitRepository.exist({
        where: { companyId, code: candidate },
      });
      if (!taken) return candidate;
    }
    throw new ConflictException(
      'No se pudo generar un código único para la unidad. Intente de nuevo.',
    );
  }

  async deleteOrganizationalUnit(id: string) {
    await this.organizationalUnitRepository.softDelete(id);
    return { success: true };
  }

  private formatOrganizationalUnit(
    unit: OrganizationalUnit,
    laborUnitIds: string[] = [],
  ) {
    return {
      id: unit.id,
      companyId: unit.companyId,
      code: unit.code,
      name: unit.name,
      description: unit.description ?? null,
      unitType: unit.unitType,
      parentId: unit.parentId ?? null,
      branchId: unit.branchId ?? null,
      resultCenterId: unit.resultCenterId ?? null,
      laborUnitIds,
      isActive: unit.isActive,
      metadata: unit.metadata ?? null,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
      company: unit.company
        ? { id: unit.company.id, razonSocial: unit.company.razonSocial }
        : null,
      branch: unit.branch
        ? { id: unit.branch.id, name: unit.branch.name }
        : null,
      resultCenter: unit.resultCenter
        ? {
            id: unit.resultCenter.id,
            name: unit.resultCenter.name,
            code: unit.resultCenter.code,
          }
        : null,
      parent: unit.parent
        ? { id: unit.parent.id, name: unit.parent.name, code: unit.parent.code }
        : null,
    };
  }
}
