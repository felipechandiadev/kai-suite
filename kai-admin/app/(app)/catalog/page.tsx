import { redirect } from "next/navigation";

/** Entrada `/catalog`: primera pestaña (productos). */
export default function CatalogIndexPage() {
  redirect("/catalog/products");
}
