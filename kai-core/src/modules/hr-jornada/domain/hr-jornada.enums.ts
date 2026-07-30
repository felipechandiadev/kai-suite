export enum WorkRegime {
  ORDINARY = 'ORDINARY',
  PARTIAL = 'PARTIAL',
  EXCEPTIONAL_ART38 = 'EXCEPTIONAL_ART38',
}

export enum EnforcementMode {
  ALERT_ONLY = 'ALERT_ONLY',
  CONFIRM_CRITICAL = 'CONFIRM_CRITICAL',
  BLOCK_CRITICAL = 'BLOCK_CRITICAL',
}

export enum ShiftTemplateType {
  FREE = 'FREE',
  FIXED = 'FIXED',
  WEEKLY = 'WEEKLY',
  ROTATING = 'ROTATING',
}

export enum ShiftExceptionType {
  NO_SHOW = 'NO_SHOW',
  LATE = 'LATE',
  EARLY_LEAVE = 'EARLY_LEAVE',
  PARTIAL = 'PARTIAL',
  UNPAID_LEAVE = 'UNPAID_LEAVE',
  PAID_LEAVE = 'PAID_LEAVE',
}

export enum FindingSeverity {
  OK = 'OK',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum FindingCategory {
  LEGAL = 'LEGAL',
  POLICY = 'POLICY',
}

export enum CompensatoryLedgerEntryType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  EXPIRE = 'EXPIRE',
}

export enum HrDocumentKind {
  ATTENDANCE_STATEMENT = 'ATTENDANCE_STATEMENT',
}

export enum HrDocumentStatus {
  CURRENT = 'CURRENT',
  SUPERSEDED = 'SUPERSEDED',
}

export enum PayrollSuggestionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DISMISSED = 'DISMISSED',
}
