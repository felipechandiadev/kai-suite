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
import { FiscalBoletaEmissionService } from '../application/fiscal-boleta-emission.service';
import { PosFolioAllocationService } from '../application/pos-folio-allocation.service';
import { FiscalCafPackageService } from '../application/fiscal-caf-package.service';
import { FiscalFolioLedgerService } from '../application/fiscal-folio-ledger.service';
import { UpdateFiscalProfileDto } from '../application/dto/update-fiscal-profile.dto';
import { CompleteCertificationDto } from '../application/dto/complete-certification.dto';
import { EnableProductionDto } from '../application/dto/enable-production.dto';
import { FiscalDteEmissionStatus, FiscalCafPackageStatus, SiiEnvironment } from '../domain/fiscal.enums';

const VALID_EMISSION_STATUSES = new Set<string>([
  FiscalDteEmissionStatus.PENDING,
  FiscalDteEmissionStatus.SENDING,
  FiscalDteEmissionStatus.SENT,
  FiscalDteEmissionStatus.FAILED,
  FiscalDteEmissionStatus.EPR,
  FiscalDteEmissionStatus.RCH,
]);

@Controller()
@AdminOnly()
@AllowAdminWithoutCompany()
export class FiscalController {
  constructor(
    private readonly fiscalService: FiscalService,
    private readonly fiscalBoletaEmission: FiscalBoletaEmissionService,
    private readonly posFolioAllocation: PosFolioAllocationService,
    private readonly cafPackageService: FiscalCafPackageService,
    private readonly folioLedgerService: FiscalFolioLedgerService,
  ) {}

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

  @Get('company/fiscal-caf-packages')
  async listCafPackages(
    @CurrentCompany() companyId: string,
    @Query('dteType') dteType?: string,
    @Query('environment') environment?: string,
    @Query('status') status?: string,
  ) {
    const env =
      environment === SiiEnvironment.CERTIFICATION ||
      environment === SiiEnvironment.PRODUCTION
        ? environment
        : undefined;
    const statusFilter =
      status === FiscalCafPackageStatus.ACTIVE ||
      status === FiscalCafPackageStatus.ARCHIVED ||
      status === FiscalCafPackageStatus.EXHAUSTED
        ? status
        : undefined;
    const packages = await this.cafPackageService.listPackages(companyId, {
      dteType: dteType?.trim() ? Number(dteType) : undefined,
      environment: env,
      status: statusFilter,
    });
    return { success: true, packages };
  }

  @Get('company/fiscal-caf-packages/allocations/:id/ledger-summary')
  async getSubPackLedgerSummary(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    const summary = await this.folioLedgerService.getSubPackLedgerSummary(companyId, id);
    return { success: true, summary };
  }

  @Put('company/fiscal-caf-packages/allocations/:id')
  async updateSubPack(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() body: { rangeFrom?: number; rangeTo?: number; label?: string },
  ) {
    const allocation = await this.posFolioAllocation.updateSubPack(companyId, id, body);
    return { success: true, allocation };
  }

  @Delete('company/fiscal-caf-packages/allocations/:id')
  async deleteSubPack(@CurrentCompany() companyId: string, @Param('id') id: string) {
    await this.posFolioAllocation.deleteSubPack(companyId, id);
    return { success: true };
  }

  @Get('company/fiscal-caf-packages/:cafId')
  async getCafPackageDetail(
    @CurrentCompany() companyId: string,
    @Param('cafId') cafId: string,
  ) {
    const pkg = await this.cafPackageService.getPackageDetail(companyId, cafId);
    return { success: true, package: pkg };
  }

  @Get('company/fiscal-caf-packages/:cafId/ledger-summary')
  async getPackLedgerSummary(
    @CurrentCompany() companyId: string,
    @Param('cafId') cafId: string,
  ) {
    const summary = await this.folioLedgerService.getPackLedgerSummary(companyId, cafId);
    return { success: true, summary };
  }

  @Post('company/fiscal-caf-packages/:cafId/allocations')
  async createSubPack(
    @CurrentCompany() companyId: string,
    @Param('cafId') cafId: string,
    @Body()
    body: { pointOfSaleId: string; rangeFrom: number; rangeTo: number; label?: string },
  ) {
    const allocation = await this.posFolioAllocation.createSubPack(companyId, cafId, body);
    return { success: true, allocation };
  }

  @Delete('company/fiscal-caf-packages/:cafId')
  async deleteCafPackage(@CurrentCompany() companyId: string, @Param('cafId') cafId: string) {
    await this.cafPackageService.deletePackage(companyId, cafId);
    return { success: true };
  }

  @Patch('company/fiscal-caf-packages/:cafId/status')
  async updatePackageStatus(
    @CurrentCompany() companyId: string,
    @Param('cafId') cafId: string,
    @Body() body: { status: FiscalCafPackageStatus },
  ) {
    const pkg = await this.cafPackageService.updatePackageStatus(companyId, cafId, body.status);
    return { success: true, package: pkg };
  }

  @Get('company/fiscal-cafs')
  async listCafs(@CurrentCompany() companyId: string) {
    const cafs = await this.fiscalService.listCafs(companyId);
    return { success: true, cafs };
  }

  @Get('company/fiscal/folio-summary')
  async getFolioSummary(@CurrentCompany() companyId: string) {
    const summaries = await Promise.all([
      this.posFolioAllocation.getCompanyFolioSummary(companyId, 39),
      this.posFolioAllocation.getCompanyFolioSummary(companyId, 33),
    ]);
    return { success: true, summaries };
  }

  @Get('company/fiscal/emissions')
  async listEmissions(
    @CurrentCompany() companyId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('environment') environment?: string,
    @Query('folio') folio?: string,
    @Query('cafId') cafId?: string,
    @Query('allocationId') allocationId?: string,
    @Query('folioFrom') folioFrom?: string,
    @Query('folioTo') folioTo?: string,
    @Query('pointOfSaleId') pointOfSaleId?: string,
  ) {
    const envioStatus =
      status && VALID_EMISSION_STATUSES.has(status)
        ? (status as FiscalDteEmissionStatus)
        : undefined;
    const env =
      environment === SiiEnvironment.CERTIFICATION ||
      environment === SiiEnvironment.PRODUCTION
        ? environment
        : undefined;
    const folioNum = folio?.trim() ? Number(folio) : undefined;
    const folioFromNum = folioFrom?.trim() ? Number(folioFrom) : undefined;
    const folioToNum = folioTo?.trim() ? Number(folioTo) : undefined;
    const result = await this.fiscalBoletaEmission.listEmissionsForCompany(companyId, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      envioStatus,
      from,
      to,
      environment: env,
      folio: folioNum != null && Number.isFinite(folioNum) ? folioNum : undefined,
      cafId,
      allocationId,
      folioFrom:
        folioFromNum != null && Number.isFinite(folioFromNum) ? folioFromNum : undefined,
      folioTo: folioToNum != null && Number.isFinite(folioToNum) ? folioToNum : undefined,
      pointOfSaleId,
    });
    return { success: true, ...result };
  }

  @Get('company/fiscal/boleta/print-preview')
  async getBoletaPrintPreview(
    @CurrentCompany() companyId: string,
    @Query('caso') caso?: string,
  ) {
    const preview = await this.fiscalService.getBoletaPrintPreview(companyId, caso);
    return { success: true, preview };
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

  @Post('company/fiscal-profile/acknowledge-certification')
  async acknowledgeCertification(@CurrentCompany() companyId: string) {
    const fiscalProfile = await this.fiscalService.acknowledgePortalCertification(companyId);
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

  @Post('company/fiscal/emissions/:emissionId/refresh-sii-status')
  async refreshEmissionSiiStatus(
    @CurrentCompany() companyId: string,
    @Param('emissionId') emissionId: string,
  ) {
    const item = await this.fiscalBoletaEmission.refreshEmissionSiiStatus(
      companyId,
      emissionId,
    );
    return { success: true, item };
  }

  @Post('company/fiscal/boletas/transactions/:transactionId/retry')
  async retryBoletaEmission(
    @CurrentCompany() companyId: string,
    @Param('transactionId') transactionId: string,
    @Query('pointOfSaleId') pointOfSaleId?: string,
  ) {
    const fiscalEmission = await this.fiscalBoletaEmission.retryFromSale(
      companyId,
      transactionId,
      pointOfSaleId ?? '',
    );
    return { success: true, fiscalEmission };
  }
}
