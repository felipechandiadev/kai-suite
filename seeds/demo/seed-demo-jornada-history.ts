import { randomUUID } from 'crypto';
import type { DataSource } from 'typeorm';
import { Between, In, IsNull } from 'typeorm';
import { HrJornadaConfig } from '@modules/hr-jornada/domain/hr-jornada-config.entity';
import { HrLaborUnitShift } from '@modules/hr-jornada/domain/hr-labor-unit-shift.entity';
import {
  HrLaborUnitShiftMember,
  LaborUnitShiftMemberStatus,
} from '@modules/hr-jornada/domain/hr-labor-unit-shift-member.entity';
import { HrShiftInstance } from '@modules/hr-jornada/domain/hr-shift-instance.entity';
import { HrShiftAssignment } from '@modules/hr-jornada/domain/hr-shift-assignment.entity';
import { classifyShiftSlot } from '@modules/hr-jornada/domain/rules/night-window.util';
import { seedHistoricalDateFromDaysAgo } from './seed-demo-historical-dates.util';
import { HORIZON_DAYS } from './seed-demo-sales-plan';

/** Monday=0 … Sunday=6 (alineado a scheduleJson de turnos UL). */
function weekdayIndexMon0(isoDate: string): number {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const js = d.getUTCDay();
  return js === 0 ? 6 : js - 1;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isShiftEffectiveOn(
  shift: HrLaborUnitShift,
  workDate: string,
): boolean {
  if (shift.effectiveFrom && workDate < shift.effectiveFrom) return false;
  if (shift.effectiveTo && workDate > shift.effectiveTo) return false;
  return true;
}

/**
 * Materializa instancias + asignaciones de jornada para el mismo horizonte
 * que ventas/compras (HORIZON_DAYS), expandiendo turnos UL activos y miembros.
 * Idempotente: reemplaza planes con laborUnitShiftId en el rango.
 */
export async function seedDemoJornadaHistory(ctx: {
  dataSource: DataSource;
  companyId: string;
}): Promise<void> {
  const { dataSource, companyId } = ctx;

  const dateTo = seedHistoricalDateFromDaysAgo(0);
  const dateFrom = seedHistoricalDateFromDaysAgo(HORIZON_DAYS);

  console.log(
    `🗓️  Seed jornada: expandiendo turnos UL ${dateFrom} → ${dateTo} (${HORIZON_DAYS}d)`,
  );

  const config =
    (await dataSource.getRepository(HrJornadaConfig).findOne({
      where: { companyId },
    })) ?? null;
  const nightStart = config?.nightStart ?? '21:00';
  const nightEnd = config?.nightEnd ?? '07:00';

  const shiftRepo = dataSource.getRepository(HrLaborUnitShift);
  const memberRepo = dataSource.getRepository(HrLaborUnitShiftMember);
  const instanceRepo = dataSource.getRepository(HrShiftInstance);
  const assignmentRepo = dataSource.getRepository(HrShiftAssignment);

  const ulShifts = await shiftRepo.find({
    where: {
      companyId,
      isActive: true,
      deletedAt: IsNull(),
    },
  });

  if (!ulShifts.length) {
    console.log('⚠️  Seed jornada: sin turnos UL activos; se omite.');
    return;
  }

  const shiftIds = ulShifts.map((s) => s.id);
  const members = await memberRepo.find({
    where: {
      companyId,
      shiftId: In(shiftIds),
      status: LaborUnitShiftMemberStatus.ACTIVE,
    },
  });
  const membersByShift = new Map<string, string[]>();
  for (const m of members) {
    const list = membersByShift.get(m.shiftId) ?? [];
    list.push(m.employeeId);
    membersByShift.set(m.shiftId, list);
  }

  const existing = await instanceRepo.find({
    where: {
      companyId,
      workDate: Between(dateFrom, dateTo),
    },
  });
  const seededExisting = existing.filter((i) => !!i.laborUnitShiftId);
  if (seededExisting.length) {
    const ids = seededExisting.map((i) => i.id);
    await assignmentRepo.softDelete({ instanceId: In(ids) } as never);
    await instanceRepo.softDelete(ids);
    console.log(
      `♻️  Seed jornada: reemplazando ${seededExisting.length} instancia(s) UL previas`,
    );
  }

  const instances: Array<{
    id: string;
    companyId: string;
    templateId: null;
    laborUnitShiftId: string;
    workDate: string;
    startTime: string;
    endTime: string;
    timezone: string;
    isNight: boolean;
    isNightOutgoing: boolean;
  }> = [];
  const assignments: Array<{
    id: string;
    companyId: string;
    instanceId: string;
    employeeId: string;
    startTime: string;
    endTime: string;
    plannedOvertimeMinutes: number;
    notes: null;
  }> = [];

  let dayCursor = dateFrom;
  while (dayCursor <= dateTo) {
    const dayIdx = weekdayIndexMon0(dayCursor);
    for (const shift of ulShifts) {
      if (!isShiftEffectiveOn(shift, dayCursor)) continue;
      const employeeIds = membersByShift.get(shift.id) ?? [];
      if (!employeeIds.length || !shift.scheduleJson) continue;
      const slot = shift.scheduleJson[String(dayIdx)];
      if (!slot?.start || !slot?.end) continue;

      const night = classifyShiftSlot(
        slot.start,
        slot.end,
        nightStart,
        nightEnd,
      );
      const instanceId = randomUUID();
      instances.push({
        id: instanceId,
        companyId,
        templateId: null,
        laborUnitShiftId: shift.id,
        workDate: dayCursor,
        startTime: slot.start,
        endTime: slot.end,
        timezone: shift.timezone ?? 'America/Santiago',
        isNight: night.isNight,
        isNightOutgoing: night.isNightOutgoing,
      });
      for (const employeeId of employeeIds) {
        assignments.push({
          id: randomUUID(),
          companyId,
          instanceId,
          employeeId,
          startTime: slot.start,
          endTime: slot.end,
          plannedOvertimeMinutes: 0,
          notes: null,
        });
      }
    }
    dayCursor = addDaysIso(dayCursor, 1);
  }

  if (instances.length) {
    await instanceRepo.save(
      instances.map((row) => instanceRepo.create(row)),
      { chunk: 200 },
    );
  }
  if (assignments.length) {
    await assignmentRepo.save(
      assignments.map((row) => assignmentRepo.create(row)),
      { chunk: 200 },
    );
  }

  console.log(
    `✅ Seed jornada: ${instances.length} instancia(s), ${assignments.length} asignación(es) · ${ulShifts.length} turno(s) UL`,
  );
}
