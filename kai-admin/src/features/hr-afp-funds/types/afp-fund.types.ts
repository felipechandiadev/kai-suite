export type AfpFundView = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  contributionPercent: string;
  isActive: boolean;
};

export type CreateAfpFundInput = {
  name: string;
  contributionPercent: string;
  isActive?: boolean;
};
