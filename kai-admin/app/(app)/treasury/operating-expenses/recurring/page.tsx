import { redirect } from "next/navigation";

/** Recurrentes oculto temporalmente. */
export default function RecurringExpensesPage() {
  redirect("/treasury/operating-expenses/expenses");
}
