import { redirect } from "next/navigation";

/** En Server Components / actions: cerrar sesión vía NextAuth y volver al login. */
export function redirectToLoginServer(): never {
  redirect(`/api/auth/signout?callbackUrl=${encodeURIComponent("/")}`);
}
