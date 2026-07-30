import { redirect } from "next/navigation";
import { HCM_WORK_SCHEDULES_SHIFTS } from "@/navigation/hcm-routes";

/** Legacy: turnos por UL viven en Jornadas → Turnos UL. */
export default function LegacyHrShiftsPage() {
  redirect(HCM_WORK_SCHEDULES_SHIFTS);
}
