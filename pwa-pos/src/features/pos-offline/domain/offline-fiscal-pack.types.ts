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

export type OfflineFiscalPack = {
  pointOfSaleId: string;
  allocationId: string;
  cafId: string;
  dteType: number;
  rangeFrom: number;
  rangeTo: number;
  nextFolioLocal: number;
  cafXml: string;
  emisor: OfflineFiscalPackEmisor;
  downloadedAt: string;
  packExpiresAt: string;
};

export type OfflineFiscalPackApiResponse = {
  success: boolean;
  pack?: {
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
  message?: string;
  statusCode?: number;
};
