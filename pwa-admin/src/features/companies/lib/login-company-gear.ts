/** 1 empresa → ocultar tuerca; ≥2 → mostrar (doc §6). */
export function shouldShowLoginCompanyGear(companyCount: number): boolean {
  return companyCount >= 2;
}

/**
 * Multiempresa en login Admin: SUPER_ADMIN o ADMIN con ≥2 empresas.
 * SUB_ADMIN / solo operativos: nunca.
 */
export function canUseLoginMultiCompanyMode(params: {
  role?: string | null;
  memberships?: Array<{ roles: string[] }>;
  companyCount: number;
}): boolean {
  if (params.companyCount < 2) return false;
  if (params.role === "SUPER_ADMIN") return true;
  const memberships = params.memberships ?? [];
  return memberships.some((m) => m.roles.includes("ADMIN"));
}
