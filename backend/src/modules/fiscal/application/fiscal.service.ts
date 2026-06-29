import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { FiscalProfile } from '../domain/fiscal-profile.entity';
import { FiscalCertificate } from '../domain/fiscal-certificate.entity';
import { FiscalCaf } from '../domain/fiscal-caf.entity';
import { FiscalCertificationRun } from '../domain/fiscal-certification-run.entity';
import {
  CertificationRunStatus,
  FiscalProfileStatus,
  SiiEnvironment,
} from '../domain/fiscal.enums';
import { FiscalCryptoService } from '../infrastructure/fiscal-crypto.service';
import { SiiBoletaAuthService } from '../infrastructure/sii-boleta-auth.service';
import { SiiBoletaRestClient } from '../infrastructure/sii-boleta-rest.client';
import { parseCafXml } from '../infrastructure/fiscal-xml.util';
import {
  buildDteBoletaXml,
  buildEnvioBoletaXml,
  buildRcoCertificationXml,
} from '../infrastructure/boleta-envio.builder';
import { SET_BE_CASES, buildSetBePreview } from '../domain/set-be.constants';
import { UpdateFiscalProfileDto } from './dto/update-fiscal-profile.dto';
import { CompleteCertificationDto } from './dto/complete-certification.dto';
import { EnableProductionDto } from './dto/enable-production.dto';
import type {
  FiscalCafListItem,
  FiscalProfileResponse,
  FiscalSummaryResponse,
} from './fiscal.types';

@Injectable()
export class FiscalService {
  constructor(
    @InjectRepository(FiscalProfile)
    private readonly profileRepo: Repository<FiscalProfile>,
    @InjectRepository(FiscalCertificate)
    private readonly certRepo: Repository<FiscalCertificate>,
    @InjectRepository(FiscalCaf)
    private readonly cafRepo: Repository<FiscalCaf>,
    @InjectRepository(FiscalCertificationRun)
    private readonly runRepo: Repository<FiscalCertificationRun>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly crypto: FiscalCryptoService,
    private readonly auth: SiiBoletaAuthService,
    private readonly sii: SiiBoletaRestClient,
  ) {}

  async getOrCreateProfile(companyId: string): Promise<FiscalProfile> {
    let profile = await this.profileRepo.findOne({ where: { companyId } });
    if (!profile) {
      const company = await this.companyRepo.findOne({ where: { id: companyId } });
      profile = this.profileRepo.create({
        companyId,
        environment: SiiEnvironment.CERTIFICATION,
        status: FiscalProfileStatus.DRAFT,
        legalName: company?.razonSocial ?? null,
        rut: company?.rut ?? null,
        businessActivity: company?.businessActivity ?? null,
        address: company?.address ?? null,
      });
      profile = await this.profileRepo.save(profile);
    }
    return profile;
  }

  async getProfile(companyId: string): Promise<FiscalProfileResponse> {
    const profile = await this.getOrCreateProfile(companyId);
    const cert = await this.certRepo.findOne({
      where: { companyId },
      order: { uploadedAt: 'DESC' },
    });
    const caf = await this.getActiveCaf(companyId, profile.environment);
    return this.toProfileResponse(profile, cert, caf);
  }

  async getSummary(companyId: string): Promise<FiscalSummaryResponse> {
    const base = await this.getProfile(companyId);
    const run = await this.runRepo.findOne({
      where: { companyId },
      order: { startedAt: 'DESC' },
    });
    const env = base.environment as SiiEnvironment;
    return {
      ...base,
      milestones: {
        enrolment: base.portalPostulationDone && base.portalPermissionsDone,
        authorization: base.hasCertificate && !!base.activeCaf,
        setGenerated:
          run?.status === CertificationRunStatus.GENERATED ||
          !!run?.generatedPreview?.length,
        validation:
          run?.boletaEnvioStatus === 'EPR' || run?.status === CertificationRunStatus.ACCEPTED,
        declaration: base.status === FiscalProfileStatus.CERTIFIED,
      },
      activeRun: run
        ? {
            id: run.id,
            status: run.status,
            boletaTrackId: run.boletaTrackId ?? null,
            rcoTrackId: run.rcoTrackId ?? null,
            boletaEnvioStatus: run.boletaEnvioStatus ?? null,
            generatedPreview: (run.generatedPreview as Record<string, unknown>[]) ?? null,
          }
        : null,
      hosts:
        env === SiiEnvironment.PRODUCTION
          ? { api: 'api.sii.cl', envio: 'rahue.sii.cl' }
          : { api: 'apicert.sii.cl', envio: 'pangal.sii.cl' },
    };
  }

  async updateProfile(
    companyId: string,
    dto: UpdateFiscalProfileDto,
  ): Promise<FiscalProfileResponse> {
    const profile = await this.getOrCreateProfile(companyId);
    Object.assign(profile, {
      ...dto,
      resolutionDate: dto.resolutionDate ?? profile.resolutionDate,
    });
    this.refreshProfileStatus(profile);
    await this.profileRepo.save(profile);
    return this.getProfile(companyId);
  }

  async uploadCertificate(
    companyId: string,
    file: Buffer,
    password: string,
  ): Promise<FiscalProfileResponse> {
    const meta = this.auth.getCertificateMetadata(file, password);
    const encPfx = this.crypto.encrypt(file);
    const encPass = this.crypto.encrypt(password);
    await this.certRepo.delete({ companyId });
    await this.certRepo.save(
      this.certRepo.create({
        companyId,
        subjectRut: meta.subjectRut,
        notBefore: meta.notBefore,
        notAfter: meta.notAfter,
        encryptedPfx: encPfx.data,
        pfxIv: encPfx.iv,
        encryptedPassword: encPass.data,
        passwordIv: encPass.iv,
      }),
    );
    const profile = await this.getOrCreateProfile(companyId);
    this.refreshProfileStatus(profile);
    await this.profileRepo.save(profile);
    return this.getProfile(companyId);
  }

  async deleteCertificate(companyId: string): Promise<FiscalProfileResponse> {
    await this.certRepo.delete({ companyId });
    const profile = await this.getOrCreateProfile(companyId);
    this.refreshProfileStatus(profile);
    await this.profileRepo.save(profile);
    return this.getProfile(companyId);
  }

  async uploadCaf(
    companyId: string,
    file: Buffer,
    environment?: SiiEnvironment,
  ): Promise<FiscalCafListItem[]> {
    const xml = file.toString('utf8');
    const parsed = parseCafXml(xml);
    const profile = await this.getOrCreateProfile(companyId);
    const env = environment ?? profile.environment;
    await this.cafRepo.update(
      { companyId, environment: env, isActive: true },
      { isActive: false },
    );
    const enc = this.crypto.encrypt(Buffer.from(xml, 'utf8'));
    await this.cafRepo.save(
      this.cafRepo.create({
        companyId,
        dteType: parsed.dteType,
        rangeFrom: parsed.rangeFrom,
        rangeTo: parsed.rangeTo,
        nextFolio: parsed.rangeFrom,
        environment: env,
        isActive: true,
        encryptedCafXml: enc.data,
        cafIv: enc.iv,
      }),
    );
    const profile2 = await this.getOrCreateProfile(companyId);
    this.refreshProfileStatus(profile2);
    await this.profileRepo.save(profile2);
    return this.listCafs(companyId);
  }

  async listCafs(companyId: string): Promise<FiscalCafListItem[]> {
    const rows = await this.cafRepo.find({
      where: { companyId },
      order: { uploadedAt: 'DESC' },
    });
    return rows.map((c) => ({
      id: c.id,
      dteType: c.dteType,
      rangeFrom: c.rangeFrom,
      rangeTo: c.rangeTo,
      nextFolio: c.nextFolio,
      environment: c.environment,
      isActive: c.isActive,
      uploadedAt: c.uploadedAt.toISOString(),
    }));
  }

  async testSiiToken(companyId: string): Promise<{ success: boolean; tokenPreview: string }> {
    const profile = await this.getOrCreateProfile(companyId);
    const material = await this.loadPfxMaterial(companyId);
    const semillaXml = await this.sii.getSemilla(profile.environment);
    const seed = this.auth.parseSeed(semillaXml);
    const signed = this.auth.buildSignedGetTokenXml(seed, material);
    const token = await this.sii.postToken(profile.environment, signed);
    return { success: true, tokenPreview: `${token.slice(0, 4)}…` };
  }

  async createCertificationRun(companyId: string): Promise<FiscalCertificationRun> {
    await this.assertCertificationReady(companyId);
    await this.runRepo.update(
      { companyId, status: CertificationRunStatus.DRAFT },
      { status: CertificationRunStatus.REJECTED },
    );
    return this.runRepo.save(
      this.runRepo.create({
        companyId,
        status: CertificationRunStatus.READY,
      }),
    );
  }

  async generateCertificationSet(
    companyId: string,
    runId: string,
  ): Promise<FiscalCertificationRun> {
    const run = await this.getRun(companyId, runId);
    const profile = await this.getOrCreateProfile(companyId);
    const caf = await this.getActiveCaf(companyId, profile.environment);
    if (!caf) throw new BadRequestException('No hay CAF activo');
    const needed = SET_BE_CASES.length;
    if (caf.nextFolio + needed - 1 > caf.rangeTo) {
      throw new BadRequestException('CAF sin folios suficientes para el set BE');
    }
    const preview = buildSetBePreview(caf.nextFolio);
    run.folioFrom = caf.nextFolio;
    run.folioTo = caf.nextFolio + needed - 1;
    run.generatedPreview = preview as unknown as Record<string, unknown>[];
    run.status = CertificationRunStatus.GENERATED;
    return this.runRepo.save(run);
  }

  async sendBoletas(companyId: string, runId: string): Promise<FiscalCertificationRun> {
    const run = await this.getRun(companyId, runId);
    if (!run.generatedPreview?.length) {
      throw new BadRequestException('Genere el set antes de enviar');
    }
    const profile = await this.getOrCreateProfile(companyId);
    const emisor = this.emisorFromProfile(profile);
    const material = await this.loadPfxMaterial(companyId);
    const token = await this.obtainToken(profile.environment, material);
    const dtes: string[] = [];
    let folio = run.folioFrom!;
    for (const caso of SET_BE_CASES) {
      let dte = buildDteBoletaXml(emisor, caso, folio);
      dte = this.auth.signXmlEnveloped(
        dte.replace(/^<\?xml[^>]*\?>\s*/i, '<?xml version="1.0" encoding="ISO-8859-1"?>\n'),
        'DTE',
        material,
      );
      dtes.push(dte);
      folio += 1;
    }
    let envio = buildEnvioBoletaXml(emisor, dtes);
    envio = this.auth.signXmlEnveloped(envio, 'EnvioBOLETA', material);
    try {
      const result = await this.sii.postEnvioBoleta(
        profile.environment,
        token,
        envio,
        emisor.rut,
      );
      run.boletaTrackId = result.trackId;
      run.boletaEnvioStatus = 'SENT';
      run.status = CertificationRunStatus.SENT_BOLETA;
      const caf = await this.getActiveCaf(companyId, profile.environment);
      if (caf && run.folioTo) {
        caf.nextFolio = run.folioTo + 1;
        await this.cafRepo.save(caf);
      }
    } catch (e) {
      run.status = CertificationRunStatus.REJECTED;
      run.errorDetail = { phase: 'send-boletas', message: String(e) };
    }
    return this.runRepo.save(run);
  }

  async sendRco(companyId: string, runId: string): Promise<FiscalCertificationRun> {
    const run = await this.getRun(companyId, runId);
    if (!run.folioFrom || !run.folioTo) {
      throw new BadRequestException('Set no generado');
    }
    const profile = await this.getOrCreateProfile(companyId);
    const emisor = this.emisorFromProfile(profile);
    const material = await this.loadPfxMaterial(companyId);
    const token = await this.obtainToken(profile.environment, material);
    let rco = buildRcoCertificationXml(emisor, run.folioFrom, run.folioTo);
    rco = this.auth.signXmlEnveloped(rco, 'ConsumoFolios', material);
    try {
      const result = await this.sii.postEnvioBoleta(
        profile.environment,
        token,
        rco,
        emisor.rut,
      );
      run.rcoTrackId = result.trackId;
      run.rcoEnvioStatus = 'SENT';
      run.status = CertificationRunStatus.SENT_RCO;
    } catch (e) {
      run.errorDetail = {
        ...(run.errorDetail ?? {}),
        rco: String(e),
        rcoNote:
          'Si el envío RCO falla, el operador puede completar el resumen en el portal SII.',
      };
      run.status = CertificationRunStatus.SENT_RCO;
    }
    return this.runRepo.save(run);
  }

  async queryCertificationStatus(
    companyId: string,
    runId: string,
  ): Promise<FiscalCertificationRun> {
    const run = await this.getRun(companyId, runId);
    const profile = await this.getOrCreateProfile(companyId);
    const material = await this.loadPfxMaterial(companyId);
    const token = await this.obtainToken(profile.environment, material);
    const emisor = this.emisorFromProfile(profile);
    if (run.boletaTrackId) {
      const st = await this.sii.getEnvioStatus(
        profile.environment,
        token,
        emisor.rut,
        run.boletaTrackId,
      );
      run.boletaEnvioStatus = st.estado;
      if (st.estado === 'EPR') {
        run.status = CertificationRunStatus.ACCEPTED;
      } else if (st.estado === 'RCH') {
        run.status = CertificationRunStatus.REJECTED;
      } else {
        run.status = CertificationRunStatus.AWAITING_SII;
      }
    }
    return this.runRepo.save(run);
  }

  async completeCertification(
    companyId: string,
    runId: string,
    dto: CompleteCertificationDto,
  ): Promise<FiscalProfileResponse> {
    const run = await this.getRun(companyId, runId);
    run.portalValidated = dto.portalValidated;
    run.portalDeclarationDone = dto.portalDeclarationDone;
    run.status = CertificationRunStatus.CERTIFIED;
    run.completedAt = new Date();
    await this.runRepo.save(run);
    const profile = await this.getOrCreateProfile(companyId);
    profile.status = FiscalProfileStatus.CERTIFIED;
    await this.profileRepo.save(profile);
    return this.getProfile(companyId);
  }

  async enableProduction(
    companyId: string,
    dto: EnableProductionDto,
  ): Promise<FiscalProfileResponse> {
    const profile = await this.getOrCreateProfile(companyId);
    if (dto.productionEnabled && profile.status !== FiscalProfileStatus.CERTIFIED) {
      throw new BadRequestException('La empresa debe estar certificada');
    }
    const prodCaf = await this.getActiveCaf(companyId, SiiEnvironment.PRODUCTION);
    if (dto.productionEnabled && !prodCaf) {
      throw new BadRequestException('Cargue CAF de producción');
    }
    profile.productionEnabled = dto.productionEnabled;
    profile.environment = dto.environment;
    if (dto.productionEnabled) {
      profile.status = FiscalProfileStatus.PRODUCTION;
    }
    await this.profileRepo.save(profile);
    return this.getProfile(companyId);
  }

  private async getRun(companyId: string, runId: string): Promise<FiscalCertificationRun> {
    const run = await this.runRepo.findOne({ where: { id: runId, companyId } });
    if (!run) throw new NotFoundException('Corrida de certificación no encontrada');
    return run;
  }

  private async getActiveCaf(
    companyId: string,
    environment: SiiEnvironment,
  ): Promise<FiscalCaf | null> {
    return this.cafRepo.findOne({
      where: { companyId, environment, isActive: true },
      order: { uploadedAt: 'DESC' },
    });
  }

  private async loadPfxMaterial(companyId: string) {
    const cert = await this.certRepo.findOne({
      where: { companyId },
      order: { uploadedAt: 'DESC' },
    });
    if (!cert) throw new BadRequestException('Certificado no cargado');
    const pfx = this.crypto.decrypt(cert.encryptedPfx, cert.pfxIv);
    const pass = this.crypto.decrypt(cert.encryptedPassword, cert.passwordIv).toString('utf8');
    return this.auth.loadPfx(pfx, pass);
  }

  private async obtainToken(env: SiiEnvironment, material: ReturnType<SiiBoletaAuthService['loadPfx']>) {
    const semillaXml = await this.sii.getSemilla(env);
    const seed = this.auth.parseSeed(semillaXml);
    const signed = this.auth.buildSignedGetTokenXml(seed, material);
    return this.sii.postToken(env, signed);
  }

  private emisorFromProfile(profile: FiscalProfile) {
    if (
      !profile.rut ||
      !profile.legalName ||
      !profile.businessActivity ||
      !profile.address ||
      !profile.commune ||
      !profile.city ||
      !profile.resolutionNumber ||
      !profile.resolutionDate
    ) {
      throw new BadRequestException('Complete datos de emisor y resolución');
    }
    return {
      rut: profile.rut,
      legalName: profile.legalName,
      businessActivity: profile.businessActivity,
      address: profile.address,
      commune: profile.commune,
      city: profile.city,
      resolutionNumber: profile.resolutionNumber,
      resolutionDate: profile.resolutionDate,
    };
  }

  private async assertCertificationReady(companyId: string) {
    const profile = await this.getOrCreateProfile(companyId);
    this.emisorFromProfile(profile);
    await this.loadPfxMaterial(companyId);
    const caf = await this.getActiveCaf(companyId, profile.environment);
    if (!caf) throw new BadRequestException('CAF no cargado');
  }

  private refreshProfileStatus(profile: FiscalProfile) {
    try {
      const hasEmisor =
        profile.rut &&
        profile.legalName &&
        profile.resolutionNumber &&
        profile.resolutionDate;
      if (profile.status === FiscalProfileStatus.CERTIFIED || profile.productionEnabled) {
        return;
      }
      profile.status = hasEmisor
        ? FiscalProfileStatus.READY
        : FiscalProfileStatus.DRAFT;
    } catch {
      profile.status = FiscalProfileStatus.DRAFT;
    }
  }

  private toProfileResponse(
    profile: FiscalProfile,
    cert: FiscalCertificate | null,
    caf: FiscalCaf | null,
  ): FiscalProfileResponse {
    return {
      companyId: profile.companyId,
      environment: profile.environment,
      status: profile.status,
      legalName: profile.legalName ?? null,
      rut: profile.rut ?? null,
      businessActivity: profile.businessActivity ?? null,
      address: profile.address ?? null,
      commune: profile.commune ?? null,
      city: profile.city ?? null,
      resolutionNumber: profile.resolutionNumber ?? null,
      resolutionDate: profile.resolutionDate ?? null,
      productionEnabled: profile.productionEnabled,
      portalPostulationDone: profile.portalPostulationDone,
      portalPermissionsDone: profile.portalPermissionsDone,
      hasCertificate: !!cert,
      certificateExpiresAt: cert?.notAfter?.toISOString() ?? null,
      activeCaf: caf
        ? {
            id: caf.id,
            rangeFrom: caf.rangeFrom,
            rangeTo: caf.rangeTo,
            nextFolio: caf.nextFolio,
            environment: caf.environment,
          }
        : null,
    };
  }
}
