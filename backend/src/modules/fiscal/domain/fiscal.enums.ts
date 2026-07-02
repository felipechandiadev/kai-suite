export enum SiiEnvironment {
  CERTIFICATION = 'certification',
  PRODUCTION = 'production',
}

export enum FiscalProfileStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  CERTIFICATION_IN_PROGRESS = 'CERTIFICATION_IN_PROGRESS',
  CERTIFIED = 'CERTIFIED',
  PRODUCTION = 'PRODUCTION',
}

export enum FiscalDteEmissionStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  EPR = 'EPR',
  RCH = 'RCH',
  FAILED = 'FAILED',
}

export enum CertificationRunStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  GENERATED = 'GENERATED',
  SENT_BOLETA = 'SENT_BOLETA',
  SENT_RCO = 'SENT_RCO',
  AWAITING_SII = 'AWAITING_SII',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PORTAL_PENDING = 'PORTAL_PENDING',
  CERTIFIED = 'CERTIFIED',
}
