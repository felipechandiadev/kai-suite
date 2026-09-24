import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearToken,
  getToken,
  persistAuthUser,
  readPersistedAuthUser,
  setToken,
} from "@/lib/auth-token";
import { liteFetch } from "@/lib/lite-client";

export type LiteRole = "OWNER" | "ADMIN" | "CASHIER" | "STOCK";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  roles: LiteRole[];
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: LiteRole[]) => boolean;
  canAccessAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_SET = new Set<string>(["OWNER", "ADMIN", "CASHIER", "STOCK"]);

function normalizeRoles(roles: string[] | undefined): LiteRole[] {
  const out = (roles ?? []).filter((r): r is LiteRole => ROLE_SET.has(r));
  return out.length ? out : ["ADMIN"];
}

function canAccessAdminRoles(roles: LiteRole[]): boolean {
  return roles.includes("OWNER") || roles.includes("ADMIN");
}

function readInitialUser(): AuthUser | null {
  if (!getToken()) return null;
  const raw = readPersistedAuthUser();
  if (!raw) {
    clearToken();
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.id) {
      clearToken();
      return null;
    }
    return {
      ...parsed,
      roles: normalizeRoles(parsed.roles),
    };
  } catch {
    clearToken();
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readInitialUser());
  const [token, setTok] = useState<string | null>(() => getToken());

  const login = useCallback(async (email: string, password: string) => {
    const res = await liteFetch<{
      accessToken: string;
      user: { id: string; name: string; email: string; roles: string[] };
    }>("/lite/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    const nextUser: AuthUser = {
      id: res.user.id,
      name: res.user.name,
      email: res.user.email,
      roles: normalizeRoles(res.user.roles),
    };
    setToken(res.accessToken);
    setTok(res.accessToken);
    persistAuthUser(JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTok(null);
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles: LiteRole[]) => {
      if (!user) return false;
      return roles.some((r) => user.roles.includes(r));
    },
    [user],
  );

  const canAccessAdmin = Boolean(user && canAccessAdminRoles(user.roles));

  const value = useMemo(
    () => ({ user, token, login, logout, hasRole, canAccessAdmin }),
    [user, token, login, logout, hasRole, canAccessAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
