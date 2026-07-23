export type BoardColumn = "PREPARING" | "READY";

export type BoardTicket = {
  fireId: string;
  orderId: string;
  kitchenFireNumber: number | null;
  customerName: string;
  column: BoardColumn;
  readyAt: string | null;
  updatedAt: string;
};

export type BoardSnapshot = {
  companyId: string;
  branchId: string;
  preparing: BoardTicket[];
  ready: BoardTicket[];
  updatedAt: string;
};

export function emptyBoardSnapshot(): BoardSnapshot {
  return {
    companyId: "",
    branchId: "",
    preparing: [],
    ready: [],
    updatedAt: new Date().toISOString(),
  };
}
