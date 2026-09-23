const STORAGE_KEY = "kai-lite-auth-token";
const USER_KEY = "kai-lite-auth-user";

let memoryToken: string | null = null;

function readStoredToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (memoryToken) return memoryToken;
  memoryToken = readStoredToken();
  return memoryToken;
}

export function setToken(token: string) {
  memoryToken = token;
  try {
    sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearToken() {
  memoryToken = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

export function persistAuthUser(userJson: string) {
  try {
    sessionStorage.setItem(USER_KEY, userJson);
  } catch {
    /* ignore */
  }
}

export function readPersistedAuthUser(): string | null {
  try {
    return sessionStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}
