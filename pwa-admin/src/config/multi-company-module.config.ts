import { parseEnvFlag } from '@/config/env-flag.util';

/** Instancia multi-empresa (varias companies en la misma BD / admin). */
export function isMultiCompanyModuleEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_MULTI_COMPANY_ENABLED, false);
}
