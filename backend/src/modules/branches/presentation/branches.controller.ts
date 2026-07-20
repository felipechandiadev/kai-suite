import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { BranchesService } from '../application/branches.service';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  async getBranches(
    @CurrentCompany() companyId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const include = includeInactive === 'true' || includeInactive === '1';
    return this.branchesService.getAllBranches(companyId, include);
  }

  @Post()
  async createBranch(
    @CurrentCompany() companyId: string,
    @Body()
    data: {
      name: string;
      address?: string | null;
      phone?: string | null;
      location?: { lat: number; lng: number } | null;
      isActive?: boolean;
      laborUnitIds?: string[];
    },
  ) {
    // companyId se auto-setea via TenantSubscriber, pero pasamos explícito
    // para que el service pueda validar/usar antes del INSERT.
    return this.branchesService.createBranch({ ...data, companyId });
  }

  @Put(':id')
  async updateBranch(
    @Param('id') id: string,
    @CurrentCompany() companyId: string,
    @Body()
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
    const updated = await this.branchesService.updateBranch(id, companyId, data);
    if (!updated) {
      return { success: false, error: 'Sucursal no encontrada' };
    }
    return { success: true, data: updated };
  }

  @Delete(':id')
  async deleteBranch(
    @Param('id') id: string,
    @CurrentCompany() companyId: string,
  ) {
    return this.branchesService.deleteBranch(id, companyId);
  }
}
