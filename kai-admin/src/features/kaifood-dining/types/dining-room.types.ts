export type TableShape = "RECT" | "CIRCLE";

export type DiningTableItem = {
  id?: string;
  code: string;
  label: string;
  capacity: number;
  shape: TableShape;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isActive: boolean;
};

export type DiningRoomListItem = {
  id: string;
  branchId: string;
  name: string;
  isActive: boolean;
  floorPlan: Record<string, unknown> | null;
  tables?: DiningTableItem[];
};

export type CreateDiningRoomInput = {
  branchId: string;
  name: string;
  isActive?: boolean;
};

export type UpdateDiningRoomInput = {
  id: string;
  branchId?: string;
  name?: string;
  isActive?: boolean;
};

export type DiningRoomActionResult =
  | { success: true; room: DiningRoomListItem }
  | { success: false; message: string };
