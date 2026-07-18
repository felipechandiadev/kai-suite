export enum ProductionUnitScope {
  BRANCH = 'BRANCH',
  COMPANY = 'COMPANY',
}

export enum ProductionUnitInventoryMode {
  AUTONOMOUS = 'AUTONOMOUS',
  DEPENDENT = 'DEPENDENT',
}

/** Motor operativo: cocina JIT (KDS) vs producción por lotes. */
export enum ProductionUnitPurpose {
  KITCHEN = 'KITCHEN',
  BATCH = 'BATCH',
}
