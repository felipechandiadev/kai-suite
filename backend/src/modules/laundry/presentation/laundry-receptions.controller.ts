import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CurrentCompany,
  CurrentUser,
  CurrentUserPayload,
} from '@common/tenant';
import { LaundryReceptionsService } from '../application/laundry-receptions.service';
import {
  CreateLaundryReceptionDto,
  ListLaundryReceptionsQueryDto,
  RecordLaundryReceptionPaymentDto,
  UpdateLaundryReceptionStatusDto,
} from '../application/dto/laundry-reception.dtos';

@Controller('laundry/receptions')
export class LaundryReceptionsController {
  constructor(private readonly receptionsService: LaundryReceptionsService) {}

  @Post()
  async create(
    @Body() body: CreateLaundryReceptionDto,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const reception = await this.receptionsService.create(
      companyId,
      user.id,
      body,
    );
    return { success: true, reception };
  }

  @Get()
  async list(
    @Query() query: ListLaundryReceptionsQueryDto,
    @CurrentCompany() companyId: string,
  ) {
    const result = await this.receptionsService.list(companyId, query);
    return { success: true, ...result };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentCompany() companyId: string,
  ) {
    const reception = await this.receptionsService.findOne(companyId, id);
    return { success: true, reception };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateLaundryReceptionStatusDto,
    @CurrentCompany() companyId: string,
  ) {
    const reception = await this.receptionsService.updateStatus(
      companyId,
      id,
      body,
    );
    return { success: true, reception };
  }

  @Patch(':id/payment')
  async recordPayment(
    @Param('id') id: string,
    @Body() body: RecordLaundryReceptionPaymentDto,
    @CurrentCompany() companyId: string,
  ) {
    const reception = await this.receptionsService.recordPayment(
      companyId,
      id,
      body,
    );
    return { success: true, reception };
  }
}
