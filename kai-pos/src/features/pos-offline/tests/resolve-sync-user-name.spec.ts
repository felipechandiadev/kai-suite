import { describe, expect, it } from "vitest";
import { resolveSyncUserName } from "../lib/resolve-sync-user-name";

describe("resolveSyncUserName", () => {
  it("usa userName de login, no el nombre para mostrar", () => {
    expect(
      resolveSyncUserName({
        user: {
          id: "u1",
          name: "Administrador de empresa",
          email: "admin@example.com",
          userName: "admin",
        },
        expires: "",
      }),
    ).toBe("admin");
  });

  it("devuelve vacío si no hay userName", () => {
    expect(
      resolveSyncUserName({
        user: { id: "u2", name: "Solo nombre", email: "x@y.com" },
        expires: "",
      }),
    ).toBe("");
  });
});
