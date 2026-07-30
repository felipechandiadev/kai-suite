import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { LaborUnitShiftsService } from '../application/labor-unit-shifts.service';

@Controller('hr/labor-unit-shifts')
export class LaborUnitShiftsController {
  constructor(private readonly service: LaborUnitShiftsService) {}

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
  async list(@Query('laborUnitId') laborUnitId?: string) {
    return {
      success: true,
      data: await this.wrap(() => this.service.list(laborUnitId)),
    };
  }

  @Get('employee/:employeeId/active')
  async activeForEmployee(@Param('employeeId') employeeId: string) {
    return {
      success: true,
      data: await this.wrap(() =>
        this.service.getActiveMembershipForEmployee(employeeId),
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

  @Get(':id/members')
  async members(@Param('id') id: string) {
    return {
      success: true,
      data: await this.wrap(() => this.service.listMembers(id)),
    };
  }

  @Post()
  async create(
    @Body()
    body: {
      laborUnitId: string;
      name: string;
      scheduleJson?: Record<string, { start?: string; end?: string } | null> | null;
      timezone?: string;
      isActive?: boolean;
      effectiveFrom?: string | null;
      effectiveTo?: string | null;
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
    body: Partial<{
      laborUnitId: string;
      name: string;
      scheduleJson: Record<string, { start?: string; end?: string } | null> | null;
      timezone: string;
      isActive: boolean;
      effectiveFrom: string | null;
      effectiveTo: string | null;
    }>,
  ) {
    return {
      success: true,
      data: await this.wrap(() => this.service.update(id, body)),
    };
  }

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() body: { employeeId: string },
  ) {
    return {
      success: true,
      data: await this.wrap(() =>
        this.service.addMember(id, body.employeeId),
      ),
    };
  }

  @Delete(':id/members/:employeeId')
  async removeMember(
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
  ) {
    return {
      success: true,
      data: await this.wrap(() => this.service.removeMember(id, employeeId)),
    };
  }
}
