import { listAutomationRulesForPage } from "@/features/automation/actions/automation.action";
import { AutomationRulesCollection } from "./ui/AutomationRulesCollection";

export default async function AccountingAutomationPage() {
  const initialRules = await listAutomationRulesForPage();
  return <AutomationRulesCollection initialRules={initialRules} />;
}

