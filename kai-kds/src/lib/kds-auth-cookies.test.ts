import { describe, expect, it } from "vitest";
import {
  KDS_ACCESS_COOKIE,
  KDS_REFRESH_COOKIE,
  decodeKdsToken,
  needsRefresh,
  kdsCookieOptions,
  kdsCookieSecure,
} from "./kds-auth-cookies";
import { authHeaders } from "./backend-api";

function fakeJwt(payload: Record<string, unknown>): string {
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${enc({ alg: "HS256", typ: "JWT" })}.${enc(payload)}.sig`;
}

describe("kds auth cookies", () => {
  it("secure en producción, configurable por KDS_COOKIE_SECURE", () => {
    expect(kdsCookieSecure({ NODE_ENV: "production" })).toBe(true);
    expect(kdsCookieSecure({ NODE_ENV: "development" })).toBe(false);
    expect(kdsCookieSecure({ NODE_ENV: "production", KDS_COOKIE_SECURE: "false" })).toBe(false);
    expect(kdsCookieSecure({ NODE_ENV: "development", KDS_COOKIE_SECURE: "true" })).toBe(true);
  });

  it("cookie httpOnly + sameSite lax", () => {
    const o = kdsCookieOptions(900, { NODE_ENV: "production" });
    expect(o).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 900 });
  });

  it("decodifica sub/cid/exp y rechaza basura", () => {
    const t = fakeJwt({ sub: "u1", cid: "c1", exp: 100 });
    expect(decodeKdsToken(t)).toEqual({ sub: "u1", cid: "c1", exp: 100 });
    expect(decodeKdsToken("b3e0a8e0-8a9b-4f5a-9d4a-0a4c8d3b2f1e")).toBeNull();
    expect(decodeKdsToken("a.b.c")).toBeNull();
    expect(decodeKdsToken(undefined)).toBeNull();
  });

  it("needsRefresh según exp con margen", () => {
    const now = 1_000_000;
    expect(needsRefresh(fakeJwt({ sub: "u", exp: now + 600 }), now)).toBe(false);
    expect(needsRefresh(fakeJwt({ sub: "u", exp: now + 10 }), now)).toBe(true);
    expect(needsRefresh(fakeJwt({ sub: "u", exp: now - 1 }), now)).toBe(true);
    expect(needsRefresh(null, now)).toBe(true);
  });

  it("authHeaders usa el token firmado, no el userId", () => {
    const h = authHeaders({ accessToken: "x.y.z", companyId: "c1" });
    expect(h.Authorization).toBe("Bearer x.y.z");
    expect(h["X-Active-Company-Id"]).toBe("c1");
  });

  it("cookies propias de KDS (no colisionan con waiter en el mismo host)", () => {
    expect(KDS_ACCESS_COOKIE).toBe("kai_kds_at");
    expect(KDS_REFRESH_COOKIE).toBe("kai_kds_rt");
  });
});
