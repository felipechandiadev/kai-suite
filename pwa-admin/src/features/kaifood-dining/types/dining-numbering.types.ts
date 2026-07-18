export type DiningNumberingSettings = {
  branchId: string;
  companyId: string;
  timezone: string;
  resetTimeLocal: string;
  allowWaiterOpenTable: boolean;
  allowPosOpenTable: boolean;
};

export type DiningNumberingSettingsResult =
  | { success: true; settings: DiningNumberingSettings }
  | { success: false; message: string };
