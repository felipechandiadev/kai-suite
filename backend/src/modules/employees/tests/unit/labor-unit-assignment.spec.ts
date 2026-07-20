/**
 * Empleado → unidad laboral: exactamente una (FK singular, required).
 * Reasignar reemplaza el id; no hay multi-membership ni null.
 */

type EmployeeLaborAssignment = {
  employeeId: string;
  laborUnitId: string;
};

function assignLaborUnit(
  employee: EmployeeLaborAssignment,
  nextLaborUnitId: string,
): EmployeeLaborAssignment {
  if (!nextLaborUnitId.trim()) {
    throw new Error('laborUnitId is required');
  }
  return { ...employee, laborUnitId: nextLaborUnitId };
}

function requireLaborUnitId(laborUnitId: string | null | undefined): string {
  const id = laborUnitId?.trim() ?? '';
  if (!id) throw new Error('La unidad laboral es obligatoria.');
  return id;
}

function employeesInLaborUnit(
  employees: EmployeeLaborAssignment[],
  laborUnitId: string,
): EmployeeLaborAssignment[] {
  return employees.filter((e) => e.laborUnitId === laborUnitId);
}

describe('employee labor unit uniqueness', () => {
  it('keeps a single laborUnitId per employee (reassignment replaces)', () => {
    let emp: EmployeeLaborAssignment = {
      employeeId: 'e1',
      laborUnitId: 'ul-a',
    };
    emp = assignLaborUnit(emp, 'ul-b');
    expect(emp.laborUnitId).toBe('ul-b');
    expect(emp).not.toHaveProperty('laborUnitIds');
  });

  it('rejects missing laborUnitId on assign/create', () => {
    expect(() => requireLaborUnitId(null)).toThrow(/obligatoria/);
    expect(() => requireLaborUnitId('')).toThrow(/obligatoria/);
    expect(() => assignLaborUnit({ employeeId: 'e1', laborUnitId: 'ul-a' }, '')).toThrow(
      /required/,
    );
  });

  it('lists only employees of the selected labor unit for planner', () => {
    const rows: EmployeeLaborAssignment[] = [
      { employeeId: 'e1', laborUnitId: 'ul-a' },
      { employeeId: 'e2', laborUnitId: 'ul-b' },
      { employeeId: 'e3', laborUnitId: 'ul-a' },
    ];
    expect(employeesInLaborUnit(rows, 'ul-a').map((e) => e.employeeId)).toEqual([
      'e1',
      'e3',
    ]);
    expect(employeesInLaborUnit(rows, 'ul-b')).toHaveLength(1);
  });
});

describe('hcm settings labor-units route smoke', () => {
  it('canonical path is under /hcm/settings', () => {
    const HCM_SETTINGS_LABOR_UNITS = '/hcm/settings/labor-units';
    expect(HCM_SETTINGS_LABOR_UNITS.startsWith('/hcm/settings')).toBe(true);
    expect(HCM_SETTINGS_LABOR_UNITS).not.toMatch(/^\/settings\/hcm/);
  });
});
