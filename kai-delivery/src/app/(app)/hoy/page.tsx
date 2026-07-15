import { redirect } from "next/navigation";

/** Alias legacy: la lista de despachos vive en `/repartos`. */
export default function HoyRedirectPage() {
  redirect("/repartos");
}
