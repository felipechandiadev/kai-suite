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

/**
 * Canal de cumplimiento para UP con purpose=KITCHEN.
 * KDS = solo pantalla; PRINTED = solo ticket; BOTH = pantalla + ticket.
 */
export enum KitchenFulfillmentMode {
  KDS = 'KDS',
  PRINTED = 'PRINTED',
  BOTH = 'BOTH',
}

export type KitchenPrintSettings = {
  printAgentId?: string | null;
  printerDisplayLabel?: string | null;
};
