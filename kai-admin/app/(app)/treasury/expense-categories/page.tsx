import { redirect } from "next/navigation";

export default function LegacyExpenseCategoriesPage() {
  redirect("/treasury/operating-expenses/categories");
}
