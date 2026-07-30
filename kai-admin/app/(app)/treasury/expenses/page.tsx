import { redirect } from "next/navigation";

export default function LegacyTreasuryExpensesPage() {
  redirect("/treasury/operating-expenses/expenses");
}
