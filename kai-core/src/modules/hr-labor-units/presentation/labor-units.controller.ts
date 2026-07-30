import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { LaborUnitsService } from '../application/labor-units.service';

@Controller('hr/labor-units')
export class LaborUnitsController {
  constructor(private readonly service: LaborUnitsService) {}

  private wrap<T>(fn: () => Promise<T>) {
    return fn().catch((error) => {
      if (error instanceof HttpException) throw error;
      const msg = error instanceof Error ? error.message : 'Error';
      const status = msg.toLowerCase().includes('no encontrad')
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      throw new HttpException({ success: false, message: msg }, status);
    });
  }

  @Get()
  async list(
    @Query('includeInactive') includeInactive?: string,
    @Query('branchId') branchId?: string,
  ) {
    const include = includeInactive === 'true' || includeInactive === '1';
    return {
      success: true,
      data: await this.wrap(() =>
        this.service.list({
          includeInactive: include,
          branchId: branchId || null,
        }),
      ),
    };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return {
      success: true,
      data: await this.wrap(() => this.service.get(id)),
    };
  }

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      description?: string | null;
      isActive?: boolean;
    },
  ) {
    return {
      success: true,
      data: await this.wrap(() => this.service.create(body)),
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string | null;
      isActive?: boolean;
    },
  ) {
    return {
      success: true,
      data: await this.wrap(() => this.service.update(id, body)),
    };
  }

  @Put(':id/storages')
  async setStorages(
    @Param('id') id: string,
    @Body() body: { storageIds: string[] },
  ) {
    return {
      success: true,
      data: await this.wrap(() =>
        this.service.setStorages(id, body.storageIds ?? []),
      ),
    };
  }
}
