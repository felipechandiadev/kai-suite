import { redirect } from "next/navigation";

export default function OperatingExpensesIndexPage() {
  redirect("/treasury/operating-expenses/expenses");
}
