export type ShareholderPerson = {
  id: string;
  firstName?: string;
  lastName?: string;
  businessName?: string | null;
  documentType?: string;
  documentNumber?: string | null;
  displayName?: string;
};

export type ShareholderRow = {
  id: string;
  companyId: string;
  personId: string;
  ownershipPercentage?: number | null;
  partnerType?: string | null;
  joinDate?: string | null;
  notes?: string | null;
  isActive: boolean;
  person?: ShareholderPerson;
};

export type CreateShareholderInput = {
  companyId: string;
  firstName: string;
  lastName?: string;
  documentType: string;
  documentNumber: string;
  ownershipPercentage?: number;
  partnerType?: string;
  joinDate?: string;
  email?: string;
  phone?: string;
  notes?: string;
};
