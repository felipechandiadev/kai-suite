import { DocumentType, PersonType } from '@modules/persons/domain/person.entity';

export type CreateShareholderBody = {
  companyId: string;
  personType?: PersonType;
  firstName: string;
  lastName?: string;
  businessName?: string;
  documentType: DocumentType;
  documentNumber: string;
  email?: string;
  phone?: string;
  ownershipPercentage?: number;
  partnerType?: string;
  joinDate?: string;
  notes?: string;
};
