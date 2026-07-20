export const EMPLOYEE_DETAIL_SECTION_IDS = [
  "identity",
  "employment",
  "contract",
  "shift",
  "remunerations",
  "bankAccounts",
  "timeline",
] as const;

export type EmployeeDetailSectionId =
  (typeof EMPLOYEE_DETAIL_SECTION_IDS)[number];

export type EmployeeDetailTabItem = {
  id: EmployeeDetailSectionId;
  label: string;
};

export const EMPLOYEE_DETAIL_TABS: EmployeeDetailTabItem[] = [
  { id: "identity", label: "Identidad" },
  { id: "employment", label: "Organización" },
  { id: "contract", label: "Contrato" },
  { id: "shift", label: "Turno" },
  { id: "remunerations", label: "Liquidaciones" },
  { id: "bankAccounts", label: "Cuentas bancarias" },
  { id: "timeline", label: "Historial" },
];

export function isEmployeeDetailSectionId(
  value: string,
): value is EmployeeDetailSectionId {
  return (EMPLOYEE_DETAIL_SECTION_IDS as readonly string[]).includes(value);
}

export function employeeDetailSectionFromHash(
  hash: string,
): EmployeeDetailSectionId | null {
  const id = hash.replace(/^#/, "").trim();
  return id && isEmployeeDetailSectionId(id) ? id : null;
}
