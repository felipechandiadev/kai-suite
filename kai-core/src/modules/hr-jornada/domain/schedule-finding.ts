import { FindingCategory, FindingSeverity } from './hr-jornada.enums';

export type ScheduleFinding = {
  ruleCode: string;
  severity: FindingSeverity;
  category: FindingCategory;
  message: string;
  context?: Record<string, unknown>;
};

export function worstSeverity(
  findings: ScheduleFinding[],
): FindingSeverity {
  if (findings.some((f) => f.severity === FindingSeverity.CRITICAL)) {
    return FindingSeverity.CRITICAL;
  }
  if (findings.some((f) => f.severity === FindingSeverity.WARNING)) {
    return FindingSeverity.WARNING;
  }
  return FindingSeverity.OK;
}
