import { Alert } from "@kai/ui";
import { listEmployeeShiftsAction } from "@/features/hr-jornada/actions/jornada.action";
import { listEmployeesForGridAction } from "@/features/hr-employees/actions/employee.action";
import { employeeDisplayName } from "@/features/hr-employees/types/employee.types";
import { HrShiftsDataGrid } from "./ui/HrShiftsDataGrid";

export const dynamic = "force-dynamic";

export default async function HrShiftsPage() {
  const [shiftsRes, employees] = await Promise.all([
    listEmployeeShiftsAction(),
    listEmployeesForGridAction(),
  ]);
  if (!shiftsRes.success) {
    return <Alert variant="error">{shiftsRes.message}</Alert>;
  }
  const names: Record<string, string> = {};
  for (const e of employees) {
    names[e.id] = employeeDisplayName(e);
  }
  return (
    <div className="min-h-0 p-0" data-test-id="hr-shifts-page">
      <HrShiftsDataGrid shifts={shiftsRes.data} employeeNames={names} />
    </div>
  );
}
