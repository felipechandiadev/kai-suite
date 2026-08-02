import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HrJornadaService, WeekAssignmentInput } from '../application/hr-jornada.service';
import { ShiftExceptionType, ShiftTemplateType } from '../domain/hr-jornada.enums';

@Controller('hr/jornada')
export class HrJornadaController {
  constructor(private readonly service: HrJornadaService) {}

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

  @Get('config')
  async getConfig() {
    return { success: true, data: await this.wrap(() => this.service.getOrCreateConfig()) };
  }

  @Patch('config')
  async updateConfig(@Body() body: Record<string, unknown>) {
    return { success: true, data: await this.wrap(() => this.service.updateConfig(body as any)) };
  }

  @Get('holidays')
  async listHolidays(@Query('from') from: string, @Query('to') to: string) {
    return { success: true, data: await this.wrap(() => this.service.listHolidays(from, to)) };
  }

  @Put('holidays/overrides')
  async upsertHolidayOverride(
    @Body() body: { date: string; name: string; isRemoved?: boolean },
  ) {
    return { success: true, data: await this.wrap(() => this.service.upsertHolidayOverride(body)) };
  }

  @Get('templates')
  async listTemplates() {
    return { success: true, data: await this.wrap(() => this.service.listTemplates()) };
  }

  @Post('templates')
  async createTemplate(
    @Body()
    body: {
      name: string;
      type: ShiftTemplateType;
      isNight?: boolean;
      isNightOutgoing?: boolean;
      scheduleJson?: Record<string, unknown> | null;
      timezone?: string | null;
    },
  ) {
    return { success: true, data: await this.wrap(() => this.service.createTemplate(body)) };
  }

  @Patch('templates/:id')
  async updateTemplate(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.wrap(() => this.service.updateTemplate(id, body as any)) };
  }

  @Delete('templates/:id')
  async deleteTemplate(@Param('id') id: string) {
    return { success: true, data: await this.wrap(() => this.service.deleteTemplate(id)) };
  }

  @Get('week')
  async getWeek(
    @Query('weekStart') weekStart: string,
    @Query('laborUnitId') laborUnitId?: string,
    @Query('branchId') branchId?: string,
  ) {
    return {
      success: true,
      data: await this.wrap(() =>
        this.service.getWeek(
          weekStart,
          laborUnitId || null,
          branchId || null,
        ),
      ),
    };
  }

  @Post('week/validate')
  async validateWeek(@Body() body: { assignments: WeekAssignmentInput[] }) {
    return {
      success: true,
      data: await this.wrap(() => this.service.validateWeek(body.assignments ?? [])),
    };
  }

  @Put('week')
  async saveWeek(
    @Body()
    body: {
      weekStart: string;
      assignments: WeekAssignmentInput[];
      overrideReason?: string | null;
      laborUnitId?: string | null;
      branchId?: string | null;
    },
  ) {
    return { success: true, data: await this.wrap(() => this.service.saveWeek(body)) };
  }

  @Post('week/credit-holidays')
  async creditHolidays(@Body() body: { weekStart: string }) {
    return {
      success: true,
      data: await this.wrap(() => this.service.creditHolidayWork(body.weekStart)),
    };
  }

  @Post('week/load-from-shifts')
  async loadFromShifts(
    @Body()
    body: {
      weekStart: string;
      laborUnitId?: string | null;
      branchId?: string | null;
      employeeIds?: string[];
    },
  ) {
    return {
      success: true,
      data: await this.wrap(() => this.service.loadWeekFromShifts(body)),
    };
  }

  @Get('employee-shifts')
  async listEmployeeShifts(@Query('employeeId') employeeId?: string) {
    return {
      success: true,
      data: await this.wrap(() => this.service.listEmployeeShifts(employeeId)),
    };
  }

  @Get('employee-shifts/active/:employeeId')
  async getActiveEmployeeShift(@Param('employeeId') employeeId: string) {
    return {
      success: true,
      data: await this.wrap(() =>
        this.service.getActiveEmployeeShift(employeeId),
      ),
    };
  }

  @Post('employee-shifts')
  async createEmployeeShift(@Body() body: Record<string, unknown>) {
    return {
      success: true,
      data: await this.wrap(() => this.service.createEmployeeShift(body as any)),
    };
  }

  @Patch('employee-shifts/:id')
  async updateEmployeeShift(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      success: true,
      data: await this.wrap(() =>
        this.service.updateEmployeeShift(id, body as any),
      ),
    };
  }

  @Delete('employee-shifts/:id')
  async deleteEmployeeShift(@Param('id') id: string) {
    return {
      success: true,
      data: await this.wrap(() => this.service.deleteEmployeeShift(id)),
    };
  }

  @Get('exceptions')
  async listExceptions(@Query('from') from: string, @Query('to') to: string) {
    return { success: true, data: await this.wrap(() => this.service.listExceptions(from, to)) };
  }

  @Post('exceptions')
  async createException(
    @Body()
    body: {
      employeeId: string;
      assignmentId?: string | null;
      workDate: string;
      type: ShiftExceptionType;
      minutes?: number;
      notes?: string | null;
      affectsPayroll?: boolean;
    },
  ) {
    return { success: true, data: await this.wrap(() => this.service.createException(body)) };
  }

  @Post('exceptions/settle')
  async settleExceptions(@Body() body: { periodStart: string; periodEnd: string }) {
    return {
      success: true,
      data: await this.wrap(() =>
        this.service.settleExceptions(body.periodStart, body.periodEnd),
      ),
    };
  }

  @Get('periods')
  async getPeriod(@Query('periodStart') periodStart: string) {
    return {
      success: true,
      data: await this.wrap(() => this.service.getOrEnsurePeriod(periodStart)),
    };
  }

  @Post('periods/close')
  async closePeriod(@Body() body: { periodStart: string }) {
    return {
      success: true,
      data: await this.wrap(() => this.service.closePeriod(body.periodStart)),
    };
  }

  @Post('periods/reopen')
  async reopenPeriod(@Body() body: { periodStart: string }) {
    return {
      success: true,
      data: await this.wrap(() => this.service.reopenPeriod(body.periodStart)),
    };
  }

  @Get('ledger/:employeeId')
  async listLedger(@Param('employeeId') employeeId: string) {
    return { success: true, data: await this.wrap(() => this.service.listLedger(employeeId)) };
  }

  @Post('ledger/credit')
  async creditLedger(
    @Body()
    body: {
      employeeId: string;
      minutes: number;
      workDate?: string;
      reason?: string;
      sourceAssignmentId?: string;
    },
  ) {
    return { success: true, data: await this.wrap(() => this.service.creditCompensatory(body)) };
  }

  @Post('ledger/redeem')
  async redeemLedger(
    @Body() body: { employeeId: string; minutes: number; reason?: string },
  ) {
    return { success: true, data: await this.wrap(() => this.service.redeemCompensatory(body)) };
  }

  @Post('ledger/expire')
  async expireLedger(@Body() body: { asOfDate: string }) {
    return {
      success: true,
      data: await this.wrap(() => this.service.expireCompensatoryCredits(body.asOfDate)),
    };
  }

  @Post('statements/generate')
  async generateStatement(
    @Body() body: { employeeId: string; periodStart: string; periodEnd: string },
  ) {
    return {
      success: true,
      data: await this.wrap(() => this.service.generateAttendanceStatement(body)),
    };
  }

  @Get('statements')
  async listStatements(@Query('employeeId') employeeId?: string) {
    return { success: true, data: await this.wrap(() => this.service.listDocuments(employeeId)) };
  }

  @Post('statements/:id/signed')
  async attachSigned(
    @Param('id') id: string,
    @Body() body: { signedDocumentUrl: string },
  ) {
    return {
      success: true,
      data: await this.wrap(() => this.service.attachSignedScan(id, body.signedDocumentUrl)),
    };
  }

  @Post('time-entries')
  async ingestTimeEntry(
    @Body()
    body: {
      employeeId: string;
      kind: 'IN' | 'OUT';
      occurredAt: string;
      deviceId?: string;
      idempotencyKey?: string;
    },
  ) {
    return { success: true, data: await this.wrap(() => this.service.ingestTimeEntry(body)) };
  }
}
