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
import { ResultCentersService } from '../application/result-centers.service';
import { ResultCenterType } from '../domain/result-center.entity';

@Controller('result-centers')
export class ResultCentersController {
  constructor(private readonly resultCentersService: ResultCentersService) {}

  @Get()
  async getResultCenters(
    @Query('includeInactive') includeInactive?: string,
    @Query('type') type?: string,
    @Query('branchId') branchId?: string,
    @Query('companyId') companyId?: string,
  ) {
    try {
      const include = includeInactive === 'true' || includeInactive === '1';
      const typeFilter = (type as ResultCenterType) || undefined;

      const resultCenters = await this.resultCentersService.getAllResultCenters(
        {
          includeInactive: include,
          type: typeFilter,
          branchId,
          companyId,
        },
      );

      return {
        success: true,
        data: resultCenters,
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
  async getResultCenterById(@Param('id') id: string) {
    try {
      const resultCenter =
        await this.resultCentersService.getResultCenterById(id);

      if (!resultCenter) {
        throw new HttpException(
          { success: false, message: 'Result center not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: resultCenter,
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
  async createResultCenter(
    @Body()
    data: {
      companyId: string;
      parentId?: string | null;
      branchId?: string | null;
      code: string;
      name: string;
      description?: string | null;
      type?: ResultCenterType | string;
      isActive?: boolean;
    },
  ) {
    try {
      const resultCenter =
        await this.resultCentersService.createResultCenter(data);
      return {
        success: true,
        data: resultCenter,
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
  async updateResultCenter(
    @Param('id') id: string,
    @Body()
    data: Partial<{
      parentId?: string | null;
      branchId?: string | null;
      code: string;
      name: string;
      description?: string | null;
      type?: ResultCenterType | string;
      isActive: boolean;
    }>,
  ) {
    try {
      const updated = await this.resultCentersService.updateResultCenter(
        id,
        data,
      );

      if (!updated) {
        throw new HttpException(
          { success: false, message: 'Result center not found' },
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
  async deleteResultCenter(@Param('id') id: string) {
    try {
      await this.resultCentersService.deleteResultCenter(id);
      return {
        success: true,
        message: 'Result center deleted successfully',
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
