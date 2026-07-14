export type CourierSession = {
  userId: string;
  companyId: string;
  userName: string;
  displayName: string;
  email: string | null;
};

const KEY = "kai-courier-session";

export function loadCourierSession(): CourierSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CourierSession) : null;
  } catch {
    return null;
  }
}

export function saveCourierSession(session: CourierSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearCourierSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
