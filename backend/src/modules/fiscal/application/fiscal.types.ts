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
  /** CAF activo en producción (independiente del ambiente del perfil). */
  productionCaf: {
    id: string;
    rangeFrom: number;
    rangeTo: number;
    nextFolio: number;
    environment: string;
  } | null;
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

export type {
  FiscalBoletaPrintPreview,
  FiscalBoletaPrintPreviewCafAdvisory,
  FiscalBoletaPrintPreviewEmisor,
  FiscalBoletaPrintPreviewLine,
  FiscalBoletaPrintPreviewTotals,
} from '../domain/fiscal-boleta-print-preview';

export type FiscalCafListItem = {
  id: string;
  dteType: number;
  rangeFrom: number;
  rangeTo: number;
  nextFolio: number;
  environment: string;
  isActive: boolean;
  uploadedAt: string;
  packageCode?: string;
  label?: string | null;
  status?: string;
  source?: string;
};

export type FiscalCafPackageStats = {
  totalFolios: number;
  assignedCount: number;
  emittedCount: number;
  available: number;
  subPackCount: number;
};

export type FiscalCafPackageListItem = {
  id: string;
  packageCode: string;
  label: string | null;
  status: string;
  source: string;
  dteType: number;
  rangeFrom: number;
  rangeTo: number;
  nextFolio: number;
  environment: string;
  isActive: boolean;
  uploadedAt: string;
  stats: FiscalCafPackageStats;
};

export type FiscalCafSubPackItem = {
  id: string;
  subPackCode: string;
  label: string | null;
  pointOfSaleId: string;
  pointOfSaleName: string | null;
  rangeFrom: number;
  rangeTo: number;
  nextFolio: number;
  availableFolios: number;
  isActive: boolean;
  isCurrent: boolean;
  isExhausted: boolean;
};

export type FiscalCafPackageDetail = FiscalCafPackageListItem & {
  subPacks: FiscalCafSubPackItem[];
};

export type FiscalPackLedgerSummary = {
  cafId: string;
  allocationId: string | null;
  rangeFrom: number;
  rangeTo: number;
  nextFolio: number;
  total: number;
  emittedCount: number;
  available: number;
  freeRanges: { from: number; to: number }[];
};

export type FiscalEmissionListItem = {
  id: string;
  folio: number;
  issuedAt: string;
  environment: string;
  envioStatus: string;
  trackId: string | null;
  transactionId: string;
  documentNumber: string | null;
  documentFolio: string | null;
  mntTotal: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  paymentMethod: string | null;
  transactionCreatedAt: string | null;
  branchName: string | null;
  receptorRut: string;
  receptorName: string;
  errorMessage: string | null;
  hasTed: boolean;
  updatedAt: string;
  cafId?: string | null;
  allocationId?: string | null;
  packageCode?: string | null;
  subPackCode?: string | null;
  pointOfSaleId?: string | null;
  pointOfSaleName?: string | null;
  submitAttempts?: number;
  nextRetryAt?: string | null;
};

export type FiscalEmissionsListResult = {
  items: FiscalEmissionListItem[];
  total: number;
};
