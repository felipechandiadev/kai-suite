import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { DeepPartial, Repository } from 'typeorm';
import { Branch } from '../domain/branch.entity';
import { LaborUnitsService } from '@modules/hr-labor-units/application/labor-units.service';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    private readonly laborUnitsService: LaborUnitsService,
  ) {}

  async getBranchById(id: string, companyId?: string) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const branch = await this.branchRepository.findOne({ where });
    if (!branch) {
      return null;
    }

    const laborUnitIds =
      await this.laborUnitsService.listLaborUnitIdsForBranch(id);

    return {
      id: branch.id,
      companyId: branch.companyId ?? null,
      name: branch.name,
      address: branch.address ?? null,
      phone: branch.phone ?? null,
      location: branch.location ?? null,
      isActive: branch.isActive,
      isHeadquarters: branch.isHeadquarters,
      laborUnitIds,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
    };
  }

  async getAllBranches(companyId: string, includeInactive: boolean) {
    const query = this.branchRepository
      .createQueryBuilder('branch')
      .where('branch.companyId = :companyId', { companyId });

    if (!includeInactive) {
      query.andWhere('branch.isActive = :isActive', { isActive: true });
    }

    const branches = await query.orderBy('branch.name', 'ASC').getMany();
    const luMap = await this.laborUnitsService.mapLaborUnitIdsByBranchIds(
      branches.map((b) => b.id),
    );

    return branches.map((branch) => ({
      id: branch.id,
      companyId: branch.companyId ?? null,
      name: branch.name,
      address: branch.address ?? null,
      phone: branch.phone ?? null,
      location: branch.location ?? null,
      isActive: branch.isActive,
      isHeadquarters: branch.isHeadquarters,
      laborUnitIds: luMap.get(branch.id) ?? [],
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
    }));
  }

  async updateBranch(
    id: string,
    companyId: string,
    data: Partial<{
      name: string;
      address: string | null;
      phone: string | null;
      location: { lat: number; lng: number } | null;
      isActive: boolean;
      isHeadquarters: boolean;
      laborUnitIds: string[];
    }>,
  ) {
    const branch = await this.branchRepository.findOne({
      where: { id, companyId },
    });
    if (!branch) {
      return null;
    }

    const { laborUnitIds, ...rest } = data;

    // If setting this branch as headquarters, remove headquarters flag from others (within same company)
    if (rest.isHeadquarters === true) {
      await this.branchRepository.update(
        { isHeadquarters: true, companyId },
        { isHeadquarters: false },
      );
    }

    await this.branchRepository.update({ id, companyId }, rest as any);

    if (laborUnitIds !== undefined) {
      await this.laborUnitsService.syncBranchLaborUnits(id, laborUnitIds);
    }

    return this.getBranchById(id, companyId);
  }

  async createBranch(data: {
    name: string;
    address?: string | null;
    phone?: string | null;
    companyId: string;
    location?: { lat: number; lng: number } | null;
    isActive?: boolean;
    laborUnitIds?: string[];
  }) {
    if (!data.name || !String(data.name).trim()) {
      return { success: false, error: 'El nombre es requerido' };
    }
    if (!data.companyId || !isUUID(data.companyId)) {
      return { success: false, error: 'companyId requerido' };
    }
    const hasLocation =
      data.location != null &&
      typeof data.location.lat === 'number' &&
      !Number.isNaN(data.location.lat) &&
      typeof data.location.lng === 'number' &&
      !Number.isNaN(data.location.lng);
    const toSave: DeepPartial<Branch> = {
      name: String(data.name).trim(),
      companyId: data.companyId,
      address: data.address && String(data.address).trim() ? String(data.address).trim() : null,
      phone: data.phone && String(data.phone).trim() ? String(data.phone).trim() : null,
      location: hasLocation
        ? { lat: data.location!.lat, lng: data.location!.lng }
        : null,
      isActive: data.isActive !== false,
      isHeadquarters: false,
    } as DeepPartial<Branch>;
    const saved = await this.branchRepository.save(toSave);

    if (data.laborUnitIds !== undefined) {
      await this.laborUnitsService.syncBranchLaborUnits(
        saved.id,
        data.laborUnitIds,
      );
    }

    const out = await this.getBranchById(saved.id, data.companyId);
    if (!out) {
      return { success: false, error: 'No se pudo crear la sucursal' };
    }
    return { success: true, data: out };
  }

  async deleteBranch(
    id: string,
    companyId: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    const res = await this.branchRepository.softDelete({ id, companyId } as any);
    if (!res.affected) {
      return { success: false, error: 'Sucursal no encontrada' };
    }
    return { success: true };
  }
}
