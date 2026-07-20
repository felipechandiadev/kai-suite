export type JobPositionView = {
  id: string;
  companyId: string;
  code: string | null;
  name: string;
  description: string | null;
  defaultDuties: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type CreateJobPositionInput = {
  name: string;
  description?: string | null;
  defaultDuties?: string | null;
  isActive?: boolean;
  sortOrder?: number;
};
