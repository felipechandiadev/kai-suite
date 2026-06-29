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

export type FiscalSummary = FiscalProfile & {
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
