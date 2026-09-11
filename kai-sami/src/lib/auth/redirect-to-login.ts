import { redirect } from "next/navigation";

export function redirectToLoginServer(): never {
  redirect(`/api/auth/signout?callbackUrl=${encodeURIComponent("/")}`);
}
