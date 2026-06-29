import { UpdateFiscalProfileDto } from './dto/update-fiscal-profile.dto';
import { CompleteCertificationDto } from './dto/complete-certification.dto';
import { EnableProductionDto } from './dto/enable-production.dto';

export type FiscalProfileResponse = {
  companyId: string;
  environment: string;
  status: string;
  legalName: string | null;
  rut: string | null;
  businessActivity: string | null;
  address: string | null;
  commune: string | null;
  city: string | null;
  resolutionNumber: string | null;
  resolutionDate: string | null;
  productionEnabled: boolean;
  portalPostulationDone: boolean;
  portalPermissionsDone: boolean;
  hasCertificate: boolean;
  certificateExpiresAt: string | null;
  activeCaf: {
    id: string;
    rangeFrom: number;
    rangeTo: number;
    nextFolio: number;
    environment: string;
  } | null;
};

export type FiscalSummaryResponse = FiscalProfileResponse & {
  milestones: {
    enrolment: boolean;
    authorization: boolean;
    setGenerated: boolean;
    validation: boolean;
    declaration: boolean;
  };
  activeRun: {
    id: string;
    status: string;
    boletaTrackId: string | null;
    rcoTrackId: string | null;
    boletaEnvioStatus: string | null;
    generatedPreview: Record<string, unknown>[] | null;
  } | null;
  hosts: { api: string; envio: string };
};

export type FiscalCafListItem = {
  id: string;
  dteType: number;
  rangeFrom: number;
  rangeTo: number;
  nextFolio: number;
  environment: string;
  isActive: boolean;
  uploadedAt: string;
};
