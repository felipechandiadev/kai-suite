export type WaiterSession = {
  userId: string;
  companyId: string;
  userName: string;
  displayName: string;
  email: string | null;
};

const KEY = "kai-waiter-session";

export function loadWaiterSession(): WaiterSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WaiterSession) : null;
  } catch {
    return null;
  }
}

export function saveWaiterSession(session: WaiterSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearWaiterSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export const WAITER_ROOM_STORAGE_KEY = "kai-waiter-dining-room";

export function loadWaiterRoomId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WAITER_ROOM_STORAGE_KEY);
    return raw?.trim() || null;
  } catch {
    return null;
  }
}

export function saveWaiterRoomId(roomId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WAITER_ROOM_STORAGE_KEY, roomId);
}
