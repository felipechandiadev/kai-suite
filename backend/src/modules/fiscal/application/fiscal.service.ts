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
  FiscalDteEmissionStatus,
  FiscalProfileStatus,
  SiiEnvironment,
} from '../domain/fiscal.enums';
import {
  applyEmisorDtoToCompany,
  companyToEmisorPreview,
  emisorFromCompany,
  isEmisorCompleteFromCompany,
} from '../domain/fiscal-emisor-from-company';
import { FiscalCryptoService } from '../infrastructure/fiscal-crypto.service';
import { SiiBoletaAuthService } from '../infrastructure/sii-boleta-auth.service';
import { SiiBoletaRestClient } from '../infrastructure/sii-boleta-rest.client';
import { FiscalXmlSchemaValidator } from '../infrastructure/fiscal-xml-schema.validator';
import {
  buildSignedEnvioBoleta,
  validateAndPostEnvioBoleta,
  withIso8859Declaration,
} from './send-signed-envio-boleta.util';
import {
  pollEnvioStatus,
  resolveInitialPollDelayMs,
  resolveSiiEnvioStatus,
} from './sii-envio-status.util';
import { parseCafXml } from '../infrastructure/fiscal-xml.util';
import {
  buildDteBoletaXml,
  buildRcoCertificationXml,
} from '../infrastructure/boleta-envio.builder';
import { buildBoletaPrintPreview, type FiscalBoletaPrintPreview } from '../domain/fiscal-boleta-print-preview';
import { SET_BE_CASES, buildSetBePreview } from '../domain/set-be.constants';
import { UpdateFiscalProfileDto } from './dto/update-fiscal-profile.dto';
import { CompleteCertificationDto } from './dto/complete-certification.dto';
import { EnableProductionDto } from './dto/enable-production.dto';
import type {
  FiscalCafListItem,
  FiscalProfileResponse,
  FiscalSummaryResponse,
} from './fiscal.types';
import { FiscalCafPackageService } from './fiscal-caf-package.service';

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
    private readonly schemaValidator: FiscalXmlSchemaValidator,
    private readonly cafPackageService: FiscalCafPackageService,
  ) {}

  async getOrCreateProfile(companyId: string): Promise<FiscalProfile> {
    let profile = await this.profileRepo.findOne({ where: { companyId } });
    if (!profile) {
      profile = this.profileRepo.create({
        companyId,
        environment: SiiEnvironment.CERTIFICATION,
        status: FiscalProfileStatus.DRAFT,
      });
      profile = await this.profileRepo.save(profile);
    }
    return profile;
  }

  async getProfile(companyId: string): Promise<FiscalProfileResponse> {
    const profile = await this.getOrCreateProfile(companyId);
    const company = await this.requireCompany(companyId);
    const cert = await this.certRepo.findOne({
      where: { companyId },
      order: { uploadedAt: 'DESC' },
    });
    const caf = await this.getActiveCaf(companyId, profile.environment, 39);
    return this.toProfileResponse(profile, company, cert, caf);
  }

  async getSummary(companyId: string): Promise<FiscalSummaryResponse> {
    const base = await this.getProfile(companyId);
    const profile = await this.getOrCreateProfile(companyId);
    const prodCaf = await this.getActiveCaf(companyId, SiiEnvironment.PRODUCTION, 39);
    const productionCaf = prodCaf ? this.toCafListItem(prodCaf) : null;
    const run = await this.runRepo.findOne({
      where: { companyId },
      order: { startedAt: 'DESC' },
    });
    const env = base.environment as SiiEnvironment;
    const hasAuthorization =
      base.hasCertificate && (!!base.activeCaf || !!productionCaf);
    return {
      ...base,
      productionCaf,
      milestones: {
        enrolment: base.portalPostulationDone && base.portalPermissionsDone,
        authorization: hasAuthorization,
        setGenerated:
          run?.status === CertificationRunStatus.GENERATED ||
          !!run?.generatedPreview?.length,
        validation:
          run?.boletaEnvioStatus === 'EPR' || run?.status === CertificationRunStatus.ACCEPTED,
        declaration:
          profile.status === FiscalProfileStatus.CERTIFIED ||
          profile.status === FiscalProfileStatus.PRODUCTION,
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
    const company = await this.requireCompany(companyId);

    const hasEmisorFields =
      dto.legalName !== undefined ||
      dto.rut !== undefined ||
      dto.businessActivity !== undefined ||
      dto.address !== undefined ||
      dto.commune !== undefined ||
      dto.city !== undefined ||
      dto.resolutionNumber !== undefined ||
      dto.resolutionDate !== undefined;

    if (hasEmisorFields) {
      if (dto.rut !== undefined && dto.rut.trim() !== company.rut) {
        const conflict = await this.companyRepo.findOne({
          where: { rut: dto.rut.trim() },
        });
        if (conflict && conflict.id !== company.id) {
          throw new BadRequestException('El RUT ya está registrado');
        }
      }
      applyEmisorDtoToCompany(company, dto);
      await this.companyRepo.save(company);
    }

    if (dto.environment !== undefined) {
      profile.environment = dto.environment;
    }
    if (dto.portalPostulationDone !== undefined) {
      profile.portalPostulationDone = dto.portalPostulationDone;
    }
    if (dto.portalPermissionsDone !== undefined) {
      profile.portalPermissionsDone = dto.portalPermissionsDone;
    }

    this.refreshProfileStatus(profile, company);
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
    const company = await this.requireCompany(companyId);
    this.refreshProfileStatus(profile, company);
    await this.profileRepo.save(profile);
    return this.getProfile(companyId);
  }

  async deleteCertificate(companyId: string): Promise<FiscalProfileResponse> {
    await this.certRepo.delete({ companyId });
    const profile = await this.getOrCreateProfile(companyId);
    const company = await this.requireCompany(companyId);
    this.refreshProfileStatus(profile, company);
    await this.profileRepo.save(profile);
    return this.getProfile(companyId);
  }

  async uploadCaf(
    companyId: string,
    file: Buffer,
    environment?: SiiEnvironment,
  ): Promise<FiscalCafListItem[]> {
    await this.cafPackageService.uploadPackage(companyId, file, environment);
    return this.listCafs(companyId);
  }

  async listCafs(companyId: string): Promise<FiscalCafListItem[]> {
    const rows = await this.cafRepo.find({
      where: { companyId },
      order: { uploadedAt: 'DESC' },
    });
    return rows.map((c) => this.toCafListItem(c));
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

  async getBoletaPrintPreview(
    companyId: string,
    casoId?: string,
  ): Promise<FiscalBoletaPrintPreview> {
    const profile = await this.getOrCreateProfile(companyId);
    const company = await this.requireCompany(companyId);
    const caf = await this.getActiveCaf(companyId, profile.environment, 39);
    const startFolio = caf?.nextFolio ?? 1;
    const needed = SET_BE_CASES.length;
    const sufficientForSet = caf
      ? caf.nextFolio + needed - 1 <= caf.rangeTo
      : false;

    const emisor = companyToEmisorPreview(company);

    try {
      return buildBoletaPrintPreview({
        casoId,
        startFolio,
        emisor,
        cafAdvisory: {
          hasActiveCaf: !!caf,
          nextFolio: caf?.nextFolio ?? null,
          sufficientForSet,
        },
      });
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Caso de boleta inválido',
      );
    }
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
    const caf = await this.getActiveCaf(companyId, profile.environment, 39);
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
    const company = await this.requireCompany(companyId);
    const emisor = emisorFromCompany(company);
    const material = await this.loadPfxMaterial(companyId);
    const rutEnvia = this.resolveRutEnvia(material, emisor.rut);
    const cafXml = await this.loadActiveCafXml(companyId, profile.environment);
    const token = await this.obtainToken(profile.environment, material);
    const dtes: string[] = [];
    let folio = run.folioFrom!;
    for (const caso of SET_BE_CASES) {
      let dte = buildDteBoletaXml(emisor, caso, folio, { cafXml });
      dte = this.auth.signDteBoleta(
        withIso8859Declaration(dte),
        `F${folio}T39`,
        material,
      );
      dtes.push(dte);
      folio += 1;
    }
    const signedEnvio = buildSignedEnvioBoleta(this.auth, emisor, dtes, rutEnvia, material);
    try {
      const result = await validateAndPostEnvioBoleta(this.schemaValidator, this.sii, {
        environment: profile.environment,
        token,
        signedXml: signedEnvio,
        companyRut: emisor.rut,
        rutEnvia,
      });
      run.boletaTrackId = result.trackId;
      run.boletaEnvioStatus = 'SENT';
      run.status = CertificationRunStatus.SENT_BOLETA;
      try {
        const polled = await pollEnvioStatus(
          () =>
            this.sii.getEnvioStatus(
              profile.environment,
              token,
              emisor.rut,
              result.trackId,
            ),
          { initialDelayMs: resolveInitialPollDelayMs(result.retryAfter) },
        );
        const resolved = resolveSiiEnvioStatus(polled.raw);
        run.boletaEnvioStatus = resolved.estado;
        if (resolved.envioStatus === FiscalDteEmissionStatus.EPR) {
          run.status = CertificationRunStatus.ACCEPTED;
        } else if (resolved.envioStatus === FiscalDteEmissionStatus.RCH) {
          run.status = CertificationRunStatus.REJECTED;
          run.errorDetail = {
            phase: 'send-boletas',
            message: resolved.rejectionMessage ?? `SII rechazó: ${resolved.estado}`,
          };
        }
      } catch {
        // poll opcional; refresh manual en admin
      }
      const caf = await this.getActiveCaf(companyId, profile.environment, 39);
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
    const company = await this.requireCompany(companyId);
    const emisor = emisorFromCompany(company);
    const material = await this.loadPfxMaterial(companyId);
    const rutEnvia = this.resolveRutEnvia(material, emisor.rut);
    const token = await this.obtainToken(profile.environment, material);
    let rco = buildRcoCertificationXml(emisor, run.folioFrom, run.folioTo, rutEnvia);
    const rcoDocId = `RCO_${run.folioFrom}_${run.folioTo}`;
    rco = this.auth.signRcoDocumento(rco, rcoDocId, material);
    try {
      const result = await validateAndPostEnvioBoleta(this.schemaValidator, this.sii, {
        environment: profile.environment,
        token,
        signedXml: rco,
        companyRut: emisor.rut,
        rutEnvia,
        schemaKind: 'rco',
      });
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
    const company = await this.requireCompany(companyId);
    const material = await this.loadPfxMaterial(companyId);
    const token = await this.obtainToken(profile.environment, material);
    const emisor = emisorFromCompany(company);
    if (run.boletaTrackId) {
      const st = await this.sii.getEnvioStatus(
        profile.environment,
        token,
        emisor.rut,
        run.boletaTrackId,
      );
      const resolved = resolveSiiEnvioStatus(st.raw);
      run.boletaEnvioStatus = resolved.estado;
      if (resolved.envioStatus === FiscalDteEmissionStatus.EPR) {
        run.status = CertificationRunStatus.ACCEPTED;
      } else if (resolved.envioStatus === FiscalDteEmissionStatus.RCH) {
        run.status = CertificationRunStatus.REJECTED;
        if (resolved.rejectionMessage) {
          run.errorDetail = {
            ...(run.errorDetail ?? {}),
            phase: 'query-boletas',
            message: resolved.rejectionMessage,
          };
        }
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
    if (run.boletaEnvioStatus !== 'EPR' && run.boletaEnvioStatus !== 'RPR') {
      throw new BadRequestException(
        'El envío de boletas debe estar en estado EPR antes de completar la certificación',
      );
    }
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

  /** Contribuyente ya certificado en portal SII (sin Set de Prueba en Kai). */
  async acknowledgePortalCertification(companyId: string): Promise<FiscalProfileResponse> {
    const profile = await this.getOrCreateProfile(companyId);
    if (
      profile.status === FiscalProfileStatus.CERTIFIED ||
      profile.status === FiscalProfileStatus.PRODUCTION
    ) {
      return this.getProfile(companyId);
    }
    if (!profile.portalPostulationDone || !profile.portalPermissionsDone) {
      throw new BadRequestException('Complete postulación y permisos en portal SII');
    }
    const company = await this.requireCompany(companyId);
    if (!company.rut?.trim() || !company.siiResolutionNumber?.trim()) {
      throw new BadRequestException('Complete datos del emisor y resolución SII');
    }
    const cert = await this.certRepo.findOne({ where: { companyId } });
    if (!cert) {
      throw new BadRequestException('Cargue certificado digital');
    }
    const prodCaf = await this.getActiveCaf(companyId, SiiEnvironment.PRODUCTION, 39);
    if (!prodCaf) {
      throw new BadRequestException('Cargue CAF de producción');
    }
    const kaiRuns = await this.runRepo.count({ where: { companyId } });
    if (kaiRuns > 0) {
      const hasEpr = await this.runRepo.exist({
        where: { companyId, boletaEnvioStatus: 'EPR' },
      });
      if (!hasEpr) {
        throw new BadRequestException(
          'Debe obtener estado EPR en el envío de boletas de certificación antes de marcar como certificado',
        );
      }
    }
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
    const prodCaf = await this.getActiveCaf(companyId, SiiEnvironment.PRODUCTION, 39);
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

  private async requireCompany(companyId: string): Promise<Company> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return company;
  }

  private async getRun(companyId: string, runId: string): Promise<FiscalCertificationRun> {
    const run = await this.runRepo.findOne({ where: { id: runId, companyId } });
    if (!run) throw new NotFoundException('Corrida de certificación no encontrada');
    return run;
  }

  private async getActiveCaf(
    companyId: string,
    environment: SiiEnvironment,
    dteType = 39,
  ): Promise<FiscalCaf | null> {
    return this.cafRepo.findOne({
      where: { companyId, environment, isActive: true, dteType },
      order: { uploadedAt: 'DESC' },
    });
  }

  private async loadActiveCafXml(
    companyId: string,
    environment: SiiEnvironment,
    dteType = 39,
  ): Promise<string> {
    const caf = await this.getActiveCaf(companyId, environment, dteType);
    if (!caf) throw new BadRequestException('No hay CAF activo');
    return this.crypto.decrypt(caf.encryptedCafXml, caf.cafIv).toString('utf8');
  }

  private resolveRutEnvia(
    material: ReturnType<SiiBoletaAuthService['loadPfx']>,
    emisorRut: string,
  ): string {
    const signerRut = this.auth.getSignerRut(material);
    if (!signerRut) {
      throw new BadRequestException(
        'No se pudo leer el RUT del firmante desde el certificado digital',
      );
    }
    return signerRut;
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

  private async assertCertificationReady(companyId: string) {
    const profile = await this.getOrCreateProfile(companyId);
    const company = await this.requireCompany(companyId);
    emisorFromCompany(company);
    await this.loadPfxMaterial(companyId);
    const caf = await this.getActiveCaf(companyId, profile.environment, 39);
    if (!caf) throw new BadRequestException('CAF no cargado');
  }

  private refreshProfileStatus(profile: FiscalProfile, company: Company) {
    try {
      const hasEmisor = isEmisorCompleteFromCompany(company);
      if (profile.status === FiscalProfileStatus.CERTIFIED || profile.productionEnabled) {
        return;
      }
      profile.status = hasEmisor ? FiscalProfileStatus.READY : FiscalProfileStatus.DRAFT;
    } catch {
      profile.status = FiscalProfileStatus.DRAFT;
    }
  }

  private toCafListItem(caf: FiscalCaf): FiscalCafListItem {
    return {
      id: caf.id,
      dteType: caf.dteType,
      rangeFrom: caf.rangeFrom,
      rangeTo: caf.rangeTo,
      nextFolio: caf.nextFolio,
      environment: caf.environment,
      isActive: caf.isActive,
      uploadedAt: caf.uploadedAt.toISOString(),
      packageCode: caf.packageCode,
      label: caf.label ?? null,
      status: caf.status,
      source: caf.source,
    };
  }

  private toProfileResponse(
    profile: FiscalProfile,
    company: Company,
    cert: FiscalCertificate | null,
    caf: FiscalCaf | null,
  ): FiscalProfileResponse {
    const emisor = companyToEmisorPreview(company);
    return {
      companyId: profile.companyId,
      environment: profile.environment,
      status: profile.status,
      legalName: emisor.legalName,
      rut: emisor.rut,
      businessActivity: emisor.businessActivity,
      address: emisor.address,
      commune: emisor.commune,
      city: emisor.city,
      resolutionNumber: emisor.resolutionNumber,
      resolutionDate: emisor.resolutionDate,
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
