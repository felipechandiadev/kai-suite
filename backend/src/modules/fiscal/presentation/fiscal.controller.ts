import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  AdminOnly,
  AllowAdminWithoutCompany,
  CurrentCompany,
} from '@common/tenant';
import { FiscalService } from '../application/fiscal.service';
import { UpdateFiscalProfileDto } from '../application/dto/update-fiscal-profile.dto';
import { CompleteCertificationDto } from '../application/dto/complete-certification.dto';
import { EnableProductionDto } from '../application/dto/enable-production.dto';
import { SiiEnvironment } from '../domain/fiscal.enums';

@Controller()
@AdminOnly()
@AllowAdminWithoutCompany()
export class FiscalController {
  constructor(private readonly fiscalService: FiscalService) {}

  @Get('company/fiscal-profile')
  async getProfile(@CurrentCompany() companyId: string) {
    const fiscalProfile = await this.fiscalService.getProfile(companyId);
    return { success: true, fiscalProfile };
  }

  @Get('company/fiscal-profile/summary')
  async getSummary(@CurrentCompany() companyId: string) {
    const summary = await this.fiscalService.getSummary(companyId);
    return { success: true, summary };
  }

  @Put('company/fiscal-profile')
  async updateProfile(
    @CurrentCompany() companyId: string,
    @Body() body: UpdateFiscalProfileDto,
  ) {
    const fiscalProfile = await this.fiscalService.updateProfile(companyId, body);
    return { success: true, fiscalProfile };
  }

  @Post('company/fiscal-certificate')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCertificate(
    @CurrentCompany() companyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('password') password: string,
  ) {
    if (!file?.buffer?.length) {
      return { success: false, message: 'Archivo PFX requerido' };
    }
    if (!password) {
      return { success: false, message: 'Contraseña requerida' };
    }
    const fiscalProfile = await this.fiscalService.uploadCertificate(
      companyId,
      file.buffer,
      password,
    );
    return { success: true, fiscalProfile };
  }

  @Delete('company/fiscal-certificate')
  async deleteCertificate(@CurrentCompany() companyId: string) {
    const fiscalProfile = await this.fiscalService.deleteCertificate(companyId);
    return { success: true, fiscalProfile };
  }

  @Post('company/fiscal-caf')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCaf(
    @CurrentCompany() companyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('environment') environment?: SiiEnvironment,
  ) {
    if (!file?.buffer?.length) {
      return { success: false, message: 'Archivo CAF requerido' };
    }
    const cafs = await this.fiscalService.uploadCaf(companyId, file.buffer, environment);
    return { success: true, cafs };
  }

  @Get('company/fiscal-cafs')
  async listCafs(@CurrentCompany() companyId: string) {
    const cafs = await this.fiscalService.listCafs(companyId);
    return { success: true, cafs };
  }

  @Post('company/fiscal/sii/test-token')
  async testToken(@CurrentCompany() companyId: string) {
    const result = await this.fiscalService.testSiiToken(companyId);
    return result;
  }

  @Post('company/fiscal/certification/runs')
  async createRun(@CurrentCompany() companyId: string) {
    const run = await this.fiscalService.createCertificationRun(companyId);
    return { success: true, run };
  }

  @Post('company/fiscal/certification/runs/:id/generate')
  async generateSet(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    const run = await this.fiscalService.generateCertificationSet(companyId, id);
    return { success: true, run };
  }

  @Post('company/fiscal/certification/runs/:id/send-boletas')
  async sendBoletas(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    const run = await this.fiscalService.sendBoletas(companyId, id);
    return { success: true, run };
  }

  @Post('company/fiscal/certification/runs/:id/send-rco')
  async sendRco(@CurrentCompany() companyId: string, @Param('id') id: string) {
    const run = await this.fiscalService.sendRco(companyId, id);
    return { success: true, run };
  }

  @Get('company/fiscal/certification/runs/:id/status')
  async queryStatus(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    const run = await this.fiscalService.queryCertificationStatus(companyId, id);
    return { success: true, run };
  }

  @Post('company/fiscal/certification/runs/:id/complete')
  async complete(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() body: CompleteCertificationDto,
  ) {
    const fiscalProfile = await this.fiscalService.completeCertification(
      companyId,
      id,
      body,
    );
    return { success: true, fiscalProfile };
  }

  @Put('company/fiscal-profile/production')
  async enableProduction(
    @CurrentCompany() companyId: string,
    @Body() body: EnableProductionDto,
  ) {
    const fiscalProfile = await this.fiscalService.enableProduction(companyId, body);
    return { success: true, fiscalProfile };
  }
}
