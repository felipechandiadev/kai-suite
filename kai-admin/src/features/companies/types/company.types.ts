export interface CompanyOption {
  id: string;
  razonSocial: string;
  nombreFantasia: string | null;
}

export interface CompanyDetail {
  id: string;
  razonSocial: string;
  nombreFantasia: string | null;
  businessActivity: string | null;
  rut: string;
  address: string | null;
  commune: string | null;
  city: string | null;
  siiResolutionNumber: string | null;
  siiResolutionDate: string | null;
  mail: string | null;
  phone: string | null;
  defaultCurrency: string;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateCompanyInput {
  razonSocial: string;
  nombreFantasia?: string | null;
  businessActivity?: string | null;
  rut: string;
  defaultCurrency?: string;
  isActive?: boolean;
  address?: string | null;
  mail?: string | null;
  phone?: string | null;
}

export interface UpdateCompanyInput {
  razonSocial?: string;
  nombreFantasia?: string | null;
  businessActivity?: string | null;
  rut?: string;
  isActive?: boolean;
  address?: string | null;
  commune?: string | null;
  city?: string | null;
  siiResolutionNumber?: string | null;
  siiResolutionDate?: string | null;
  mail?: string | null;
  phone?: string | null;
}
