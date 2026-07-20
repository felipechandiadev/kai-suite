/** Sistema de jornada pactado en contrato (motor de asistencia). No confundir con ShiftTemplateType.FREE (día libre en plantillas). */
export enum ShiftSystemType {
  FIXED = 'FIXED',
  ROTATING = 'ROTATING',
  FLEXIBLE = 'FLEXIBLE',
  FREE = 'FREE',
  EXCEPTIONAL = 'EXCEPTIONAL',
}

export enum FlexibleMode {
  BAND = 'BAND',
  OPEN = 'OPEN',
}

/** Códigos seed del catálogo base; no se puede cambiar el type en update. */
export const SEED_SHIFT_SYSTEM_CODES = [
  'SS00001',
  'SS00002',
  'SS00003',
  'SS00004',
  'SS00005',
  'SS00006',
] as const;
