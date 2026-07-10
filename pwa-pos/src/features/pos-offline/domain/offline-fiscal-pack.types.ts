export type OfflineFiscalPackEmisor = {
  rut: string | null;
  legalName: string | null;
  businessActivity: string | null;
  address: string | null;
  commune: string | null;
  city: string | null;
  resolutionNumber: string | null;
  resolutionDate: string | null;
};

export type OfflineFiscalPackSlice = {
  allocationId: string;
  cafId: string;
  dteType: number;
  rangeFrom: number;
  rangeTo: number;
  nextFolioLocal: number;
  cafXml: string;
  emisor: OfflineFiscalPackEmisor;
  packExpiresAt: string;
};

export type OfflineFiscalPack = OfflineFiscalPackSlice & {
  pointOfSaleId: string;
  downloadedAt: string;
};

export type OfflineFiscalPackStandbyRow = OfflineFiscalPackSlice & {
  pointOfSaleId: string;
};

export type OfflineFiscalPackApiSlice = {
  allocationId: string;
  cafId: string;
  dteType: number;
  rangeFrom: number;
  rangeTo: number;
  nextFolio: number;
  cafXml: string;
  emisor: OfflineFiscalPackEmisor;
  packExpiresAt: string;
};

export type OfflineFiscalPackApiResponse = {
  success: boolean;
  current?: OfflineFiscalPackApiSlice;
  next?: OfflineFiscalPackApiSlice | null;
  queueMeta?: Array<{
    allocationId: string;
    rangeFrom: number;
    rangeTo: number;
    nextFolio: number;
  }>;
  message?: string;
  statusCode?: number;
};
