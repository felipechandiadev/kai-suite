const PASSTHROUGH_KEYS = [
  'dateFrom',
  'dateTo',
  'branchId',
  'granularity',
  'customerId',
  'cashSessionId',
  'compareWith',
  'limit',
  'pointOfSaleIds',
  'laborUnitId',
  'employeeIds',
  'sessionId',
  'posAId',
  'posBId',
] as const;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

function isPresent(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  return true;
}

/** Combina `args.params` con campos top-level que el modelo suele enviar sueltos. */
export function mergeToolParams(args: Record<string, unknown>): Record<string, unknown> {
  const nested = isPlainObject(args.params) ? { ...args.params } : {};
  const out: Record<string, unknown> = { ...nested };
  for (const key of PASSTHROUGH_KEYS) {
    if (isPresent(args[key])) out[key] = args[key];
  }
  return out;
}
