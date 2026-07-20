import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { OrganizationalUnitsService } from '../application/organizational-units.service';
import { OrganizationalUnitType } from '../domain/organizational-unit.entity';

@Controller('organizational-units')
export class OrganizationalUnitsController {
  constructor(
    private readonly organizationalUnitsService: OrganizationalUnitsService,
  ) {}

  @Get()
  async getOrganizationalUnits(
    @Query('includeInactive') includeInactive?: string,
    @Query('unitType') unitType?: string,
    @Query('branchId') branchId?: string,
    @Query('companyId') companyId?: string,
    @Query('resultCenterId') resultCenterId?: string,
  ) {
    try {
      const include = includeInactive === 'true' || includeInactive === '1';
      const unitTypeFilter = (unitType as OrganizationalUnitType) || undefined;

      const units =
        await this.organizationalUnitsService.getAllOrganizationalUnits({
          includeInactive: include,
          unitType: unitTypeFilter,
          branchId,
          companyId,
          resultCenterId,
        });

      return {
        success: true,
        data: units,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getOrganizationalUnitById(@Param('id') id: string) {
    try {
      const unit =
        await this.organizationalUnitsService.getOrganizationalUnitById(id);

      if (!unit) {
        throw new HttpException(
          { success: false, message: 'Organizational unit not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: unit,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createOrganizationalUnit(
    @Body()
    data: {
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
    },
  ) {
    try {
      const unit =
        await this.organizationalUnitsService.createOrganizationalUnit(data);
      return {
        success: true,
        data: unit,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async updateOrganizationalUnit(
    @Param('id') id: string,
    @Body()
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
    try {
      const updated =
        await this.organizationalUnitsService.updateOrganizationalUnit(
          id,
          data,
        );

      if (!updated) {
        throw new HttpException(
          { success: false, message: 'Organizational unit not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async deleteOrganizationalUnit(@Param('id') id: string) {
    try {
      await this.organizationalUnitsService.deleteOrganizationalUnit(id);
      return {
        success: true,
        message: 'Organizational unit deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
