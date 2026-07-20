import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ShiftSystemsService } from '../application/shift-systems.service';
import { ShiftSystemType } from '../domain/shift-system.enums';

@Controller('hr/shift-systems')
export class ShiftSystemsController {
  constructor(private readonly service: ShiftSystemsService) {}

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
  async list(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true' || includeInactive === '1';
    return {
      success: true,
      data: await this.wrap(() => this.service.list(include)),
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
      type: ShiftSystemType | string;
      requiresPlannerAssignment?: boolean;
      generatesLateEvents?: boolean;
      overtimeEnabled?: boolean;
      cycleConfigJson?: { daysOn?: number; daysOff?: number } | null;
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
      type?: ShiftSystemType | string;
      requiresPlannerAssignment?: boolean;
      generatesLateEvents?: boolean;
      overtimeEnabled?: boolean;
      cycleConfigJson?: { daysOn?: number; daysOff?: number } | null;
      isActive?: boolean;
    },
  ) {
    return {
      success: true,
      data: await this.wrap(() => this.service.update(id, body)),
    };
  }
}
