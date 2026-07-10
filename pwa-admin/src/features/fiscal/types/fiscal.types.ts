export type SiiEnvironment = "certification" | "production";

export type FiscalProfileStatus =
  | "DRAFT"
  | "READY"
  | "CERTIFICATION_IN_PROGRESS"
  | "CERTIFIED"
  | "PRODUCTION";

export type FiscalProfile = {
  companyId: string;
  environment: SiiEnvironment;
  status: FiscalProfileStatus;
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

export type FiscalMilestones = {
  enrolment: boolean;
  authorization: boolean;
  setGenerated: boolean;
  validation: boolean;
  declaration: boolean;
};

export type BoletaPreviewRow = {
  caso: string;
  folio: number;
  mntNeto: number;
  mntExe: number;
  iva: number;
  mntTotal: number;
  codRef: string;
  razonRef: string;
};

export type FiscalBoletaPrintPreviewEmisor = {
  rut: string | null;
  legalName: string | null;
  businessActivity: string | null;
  address: string | null;
  commune: string | null;
  city: string | null;
  resolutionNumber: string | null;
  resolutionDate: string | null;
};

export type FiscalBoletaPrintPreviewLine = {
  name: string;
  quantity: number;
  unitPriceWithIva: number;
  exempt: boolean;
  unitMeasure: string | null;
  lineNet: number;
  lineExe: number;
  lineIva: number;
  lineTotal: number;
};

export type FiscalBoletaPrintPreviewTotals = {
  mntNeto: number;
  mntExe: number;
  iva: number;
  mntTotal: number;
};

export type FiscalBoletaPrintPreviewCafAdvisory = {
  hasActiveCaf: boolean;
  nextFolio: number | null;
  sufficientForSet: boolean;
};

export type FiscalBoletaPrintPreview = {
  caso: string;
  folio: number;
  issuedAt: string;
  tipoDte: 39;
  isSimulated: boolean;
  timbrePdf417Payload: string;
  emisor: FiscalBoletaPrintPreviewEmisor;
  emisorComplete: boolean;
  receptor: { rut: string; name: string };
  lines: FiscalBoletaPrintPreviewLine[];
  totals: FiscalBoletaPrintPreviewTotals;
  observation: string | null;
  cafAdvisory: FiscalBoletaPrintPreviewCafAdvisory;
};

export const SET_BE_CASE_LABELS: { id: string; description: string }[] = [
  { id: "CASO-1", description: "Cambio de aceite + alineación y balanceo" },
  { id: "CASO-2", description: "Papel de regalo (17 unidades)" },
  { id: "CASO-3", description: "Sandwich + bebida" },
  { id: "CASO-4", description: "Ítem afecto + ítem exento" },
  { id: "CASO-5", description: "Arroz con unidad Kg" },
];

export type FiscalSummary = FiscalProfile & {
  productionCaf: {
    id: string;
    rangeFrom: number;
    rangeTo: number;
    nextFolio: number;
    environment: string;
  } | null;
  milestones: FiscalMilestones;
  activeRun: {
    id: string;
    status: string;
    boletaTrackId: string | null;
    rcoTrackId: string | null;
    boletaEnvioStatus: string | null;
    generatedPreview: BoletaPreviewRow[] | null;
  } | null;
  hosts: { api: string; envio: string };
};

export type FiscalCafItem = {
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

export type FiscalCafPackageStatus = "active" | "archived" | "exhausted";

export type FiscalCafPackageStats = {
  totalFolios: number;
  assignedCount: number;
  emittedCount: number;
  available: number;
  subPackCount: number;
};

export type FiscalCafPackage = {
  id: string;
  packageCode: string;
  label: string | null;
  status: FiscalCafPackageStatus;
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

export type FiscalSubPack = {
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
  isCurrent?: boolean;
  isExhausted?: boolean;
};

export type FiscalCafPackageDetail = FiscalCafPackage & {
  subPacks: FiscalSubPack[];
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

export type FiscalEmissionRow = {
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

export type FiscalEmissionsFixedFilters = {
  cafId?: string;
  allocationId?: string;
  folioFrom?: number;
  folioTo?: number;
  pointOfSaleId?: string;
};

export type FiscalEmissionsListParams = {
  limit?: number;
  offset?: number;
  status?: "PENDING" | "SENDING" | "SENT" | "FAILED" | "EPR" | "RCH";
  from?: string;
  to?: string;
  environment?: SiiEnvironment;
  folio?: number;
  cafId?: string;
  allocationId?: string;
  folioFrom?: number;
  folioTo?: number;
  pointOfSaleId?: string;
};

export type CertificationRun = {
  id: string;
  status: string;
  folioFrom?: number | null;
  folioTo?: number | null;
  boletaTrackId?: string | null;
  rcoTrackId?: string | null;
  boletaEnvioStatus?: string | null;
  rcoEnvioStatus?: string | null;
  generatedPreview?: BoletaPreviewRow[] | null;
  errorDetail?: Record<string, unknown> | null;
};

export type EmisorFormValues = {
  legalName: string;
  rut: string;
  businessActivity: string;
  address: string;
  commune: string;
  city: string;
  resolutionNumber: string;
  resolutionDate: string;
  portalPostulationDone: boolean;
  portalPermissionsDone: boolean;
};

export type CompanySiiEmisorSource = {
  razonSocial: string;
  rut: string | null;
  businessActivity: string | null;
  address: string | null;
  commune?: string | null;
  city?: string | null;
  siiResolutionNumber?: string | null;
  siiResolutionDate?: string | null;
};

export function companyToEmisorForm(
  company: CompanySiiEmisorSource,
  profile: Pick<FiscalProfile, "portalPostulationDone" | "portalPermissionsDone">,
): EmisorFormValues {
  return {
    legalName: company.razonSocial?.trim() || "",
    rut: company.rut?.trim() || "",
    businessActivity: company.businessActivity?.trim() || "",
    address: company.address?.trim() || "",
    commune: company.commune?.trim() || "",
    city: company.city?.trim() || "",
    resolutionNumber: company.siiResolutionNumber?.trim() || "",
    resolutionDate: company.siiResolutionDate?.slice(0, 10) ?? "",
    portalPostulationDone: profile.portalPostulationDone,
    portalPermissionsDone: profile.portalPermissionsDone,
  };
}

/** @deprecated Usar companyToEmisorForm con datos de Company */
export function profileToEmisorForm(p: FiscalProfile): EmisorFormValues {
  return {
    legalName: p.legalName ?? "",
    rut: p.rut ?? "",
    businessActivity: p.businessActivity ?? "",
    address: p.address ?? "",
    commune: p.commune ?? "",
    city: p.city ?? "",
    resolutionNumber: p.resolutionNumber ?? "",
    resolutionDate: p.resolutionDate?.slice(0, 10) ?? "",
    portalPostulationDone: p.portalPostulationDone,
    portalPermissionsDone: p.portalPermissionsDone,
  };
}

export const MILESTONE_LABELS: { key: keyof FiscalMilestones; label: string }[] = [
  { key: "enrolment", label: "Postulación portal" },
  { key: "authorization", label: "Certificado y CAF" },
  { key: "setGenerated", label: "Set BE generado" },
  { key: "validation", label: "Validación SII (EPR)" },
  { key: "declaration", label: "Declaración completada" },
];
