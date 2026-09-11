import { loginInputSchema, type LoginInput } from "../domain/login.entity";

export type ValidateLoginResult =
  | { ok: true; data: LoginInput }
  | { ok: false; error: string };

export function validateLoginInput(input: LoginInput): ValidateLoginResult {
  const parsed = loginInputSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Datos inválidos";
    return { ok: false, error: msg };
  }
  return { ok: true, data: parsed.data };
}
