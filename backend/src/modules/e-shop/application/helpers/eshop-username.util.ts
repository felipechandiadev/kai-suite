const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;

const RESERVED_USERNAMES = new Set([
  'admin',
  'administrador',
  'soporte',
  'support',
  'help',
  'ayuda',
  'tienda',
  'shop',
  'eshop',
  'kaistore',
  'root',
  'system',
  'null',
  'undefined',
]);

export type NormalizeEshopUsernameResult =
  | { ok: true; username: string }
  | { ok: false; message: string };

export function normalizeEshopUsername(raw: string): NormalizeEshopUsernameResult {
  let value = raw.trim().toLowerCase();
  if (value.startsWith('@')) {
    value = value.slice(1).trim();
  }
  if (!value) {
    return { ok: false, message: 'El nombre de usuario es obligatorio' };
  }
  if (value.length < USERNAME_MIN || value.length > USERNAME_MAX) {
    return {
      ok: false,
      message: `El nombre de usuario debe tener entre ${USERNAME_MIN} y ${USERNAME_MAX} caracteres`,
    };
  }
  if (!USERNAME_PATTERN.test(value)) {
    return {
      ok: false,
      message: 'Solo letras minúsculas, números y guión bajo (_)',
    };
  }
  if (RESERVED_USERNAMES.has(value)) {
    return { ok: false, message: 'Este nombre de usuario no está disponible' };
  }
  return { ok: true, username: value };
}

export function assertEshopUsername(raw: string): string {
  const result = normalizeEshopUsername(raw);
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.username;
}
