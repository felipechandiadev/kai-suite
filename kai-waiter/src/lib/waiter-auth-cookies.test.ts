import { describe, expect, it } from "vitest";
import {
  decodeWaiterToken,
  needsRefresh,
  waiterCookieOptions,
  waiterCookieSecure,
} from "./waiter-auth-cookies";
import { authHeaders } from "./backend-api";

function fakeJwt(payload: Record<string, unknown>): string {
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${enc({ alg: "HS256", typ: "JWT" })}.${enc(payload)}.sig`;
}

describe("waiter auth cookies", () => {
  it("secure en producción, configurable por WAITER_COOKIE_SECURE", () => {
    expect(waiterCookieSecure({ NODE_ENV: "production" })).toBe(true);
    expect(waiterCookieSecure({ NODE_ENV: "development" })).toBe(false);
    expect(waiterCookieSecure({ NODE_ENV: "production", WAITER_COOKIE_SECURE: "false" })).toBe(false);
    expect(waiterCookieSecure({ NODE_ENV: "development", WAITER_COOKIE_SECURE: "true" })).toBe(true);
  });

  it("cookie httpOnly + sameSite lax", () => {
    const o = waiterCookieOptions(900, { NODE_ENV: "production" });
    expect(o).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 900 });
  });

  it("decodifica sub/cid/exp y rechaza basura", () => {
    const t = fakeJwt({ sub: "u1", cid: "c1", exp: 100 });
    expect(decodeWaiterToken(t)).toEqual({ sub: "u1", cid: "c1", exp: 100 });
    expect(decodeWaiterToken("b3e0a8e0-8a9b-4f5a-9d4a-0a4c8d3b2f1e")).toBeNull();
    expect(decodeWaiterToken("a.b.c")).toBeNull();
    expect(decodeWaiterToken(undefined)).toBeNull();
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
});
