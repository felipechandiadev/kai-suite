import { listLaborUnitsAction } from "@/features/hr-labor-units/actions/labor-unit.action";
import { listEmployeesForGridAction } from "@/features/hr-employees/actions/employee.action";
import { HcmReportsWorkspace } from "@/features/hcm-reports/ui/HcmReportsWorkspace";

export default async function HcmReportsPage() {
  const [unitsRes, employees] = await Promise.all([
    listLaborUnitsAction({ includeInactive: false }),
    listEmployeesForGridAction({}),
  ]);

  const laborUnits = unitsRes.success
    ? (unitsRes.data ?? []).map((u) => ({ id: u.id, name: u.name }))
    : [];

  const employeeOpts = (employees ?? []).map((e) => {
    const person = e.person;
    const label =
      person
        ? `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() ||
          person.businessName ||
          e.id
        : e.id;
    return {
      id: e.id,
      label,
      laborUnitId: e.laborUnitId ?? null,
    };
  });

  return (
    <div
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col"
      data-test-id="hcm-reports-page-root"
    >
      <HcmReportsWorkspace laborUnits={laborUnits} employees={employeeOpts} />
    </div>
  );
}
