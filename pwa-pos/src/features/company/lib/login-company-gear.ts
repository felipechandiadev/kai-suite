/** 1 empresa → ocultar tuerca; ≥2 → mostrar (doc §6). */
export function shouldShowLoginCompanyGear(companyCount: number): boolean {
  return companyCount >= 2;
}
