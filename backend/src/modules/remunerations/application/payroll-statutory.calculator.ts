import { Injectable } from '@nestjs/common';
import {
  PayrollDeductionTypeId,
  PayrollEarningTypeId,
  PayrollLineCategory,
} from '../domain/payroll-line-type.enum';
import {
  isPayrollEarningImponible,
  type PayrollEmployerCost,
  type PayrollStatutorySuggestionLine,
} from '../domain/payroll-imponible';
import {
  resolvePayrollPeriodParams,
  type PayrollPeriodParams,
} from '../domain/payroll-period-params';
import { EmploymentLaborType } from '@modules/employees/domain/employment-contract.enums';
import { HealthContributionMode } from '@modules/employees/domain/employment-contract.enums';

export type StatutoryContractInput = {
  laborType?: string | null;
  afpContributionPercent?: string | null;
  healthSystem?: string | null;
  healthContributionMode?: string | null;
  healthContributionValue?: string | null;
  mutualName?: string | null;
  mealAllowance?: string | null;
  transportAllowance?: string | null;
  baseSalary?: string | null;
};

export type StatutoryEarningLineInput = {
  typeId: string;
  amount: number;
};

export type PayrollStatutoryResult = {
  params: PayrollPeriodParams;
  totalImponible: number;
  totalNoImponible: number;
  taxableBase: number;
  suggestedDeductions: PayrollStatutorySuggestionLine[];
  employerCosts: PayrollEmployerCost[];
  totalEmployerCost: number;
  /** Prefill haberes desde contrato (colación/movilización) si no vienen en input. */
  suggestedAllowances: PayrollStatutorySuggestionLine[];
};

function money(n: number): number {
  return Math.max(0, Math.round(n));
}

function parseMoney(raw: string | null | undefined): number {
  if (raw == null || String(raw).trim() === '') return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function parsePercent(raw: string | null | undefined): number {
  if (raw == null || String(raw).trim() === '') return 0;
  const n = Number(String(raw).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

@Injectable()
export class PayrollStatutoryCalculator {
  calculate(input: {
    earnings: StatutoryEarningLineInput[];
    contract?: StatutoryContractInput | null;
    paramsOverride?: Partial<PayrollPeriodParams> | null;
    /** Si true, agrega sugerencias de colación/movilización desde contrato. */
    includeContractAllowances?: boolean;
  }): PayrollStatutoryResult {
    const params = resolvePayrollPeriodParams(input.paramsOverride);
    const contract = input.contract ?? null;

    let totalImponible = 0;
    let totalNoImponible = 0;
    for (const line of input.earnings) {
      const amount = money(line.amount);
      if (amount <= 0) continue;
      if (isPayrollEarningImponible(line.typeId)) {
        totalImponible += amount;
      } else {
        totalNoImponible += amount;
      }
    }

    const suggestedAllowances: PayrollStatutorySuggestionLine[] = [];
    if (input.includeContractAllowances && contract) {
      const meal = parseMoney(contract.mealAllowance);
      const transport = parseMoney(contract.transportAllowance);
      if (meal > 0) {
        suggestedAllowances.push({
          typeId: PayrollEarningTypeId.ALLOWANCE,
          amount: meal,
          label: 'Colación',
        });
        totalNoImponible += meal;
      }
      if (transport > 0) {
        suggestedAllowances.push({
          typeId: PayrollEarningTypeId.ALLOWANCE,
          amount: transport,
          label: 'Movilización',
        });
        totalNoImponible += transport;
      }
    }

    const taxableBase = Math.min(totalImponible, params.taxableCapClp);
    const suggestedDeductions: PayrollStatutorySuggestionLine[] = [];

    // AFP 10%
    const afpMandatory = money((taxableBase * params.afpMandatoryPercent) / 100);
    if (afpMandatory > 0) {
      suggestedDeductions.push({
        typeId: PayrollDeductionTypeId.AFP,
        amount: afpMandatory,
        ratePercent: params.afpMandatoryPercent,
        base: taxableBase,
        label: 'AFP (10% obligatorio)',
      });
    }

    // Comisión AFP (contrato)
    const feePct = parsePercent(contract?.afpContributionPercent);
    const afpFee = money((taxableBase * feePct) / 100);
    if (afpFee > 0) {
      suggestedDeductions.push({
        typeId: PayrollDeductionTypeId.AFP_COMMISSION,
        amount: afpFee,
        ratePercent: feePct,
        base: taxableBase,
        label: 'Comisión AFP',
      });
    }

    // Salud
    const healthSystem = String(contract?.healthSystem ?? 'FONASA').toUpperCase();
    let healthAmount = 0;
    let healthRate = params.fonasaPercent;
    if (healthSystem === 'ISAPRE') {
      const mode = String(contract?.healthContributionMode ?? '').toUpperCase();
      const value = parsePercent(contract?.healthContributionValue);
      if (mode === HealthContributionMode.FIXED || mode === 'FIXED') {
        healthAmount = money(Number(contract?.healthContributionValue) || 0);
        healthRate = taxableBase > 0 ? (healthAmount / taxableBase) * 100 : 0;
      } else {
        // PERCENT: al menos 7% legal
        healthRate = Math.max(params.fonasaPercent, value || params.fonasaPercent);
        healthAmount = money((taxableBase * healthRate) / 100);
      }
    } else {
      healthAmount = money((taxableBase * params.fonasaPercent) / 100);
    }
    if (healthAmount > 0) {
      suggestedDeductions.push({
        typeId: PayrollDeductionTypeId.HEALTH_INSURANCE,
        amount: healthAmount,
        ratePercent: healthRate,
        base: taxableBase,
        label: healthSystem === 'ISAPRE' ? 'Salud (Isapre)' : 'Salud (Fonasa 7%)',
      });
    }

    // AFC trabajador
    const isFixedTerm =
      contract?.laborType === EmploymentLaborType.FIXED_TERM ||
      String(contract?.laborType ?? '').toUpperCase() === 'FIXED_TERM';
    const afcEmpPct = isFixedTerm
      ? params.afcEmployeeFixedTermPercent
      : params.afcEmployeeIndefinitePercent;
    const afcEmployee = money((taxableBase * afcEmpPct) / 100);
    if (afcEmployee > 0) {
      suggestedDeductions.push({
        typeId: PayrollDeductionTypeId.UNEMPLOYMENT_INSURANCE,
        amount: afcEmployee,
        ratePercent: afcEmpPct,
        base: taxableBase,
        label: 'AFC trabajador',
      });
    }

    // IUSC: stub — no auto-calc tramos en v1

    const employerCosts: PayrollEmployerCost[] = [];
    const pushEmployer = (
      code: PayrollEmployerCost['code'],
      label: string,
      ratePercent: number,
    ) => {
      const amount = money((taxableBase * ratePercent) / 100);
      if (amount <= 0) return;
      employerCosts.push({ code, label, ratePercent, base: taxableBase, amount });
    };

    pushEmployer('SIS', 'Seguro de invalidez y sobrevivencia (SIS)', params.sisEmployerPercent);
    pushEmployer(
      'AFC_EMPLOYER',
      isFixedTerm ? 'AFC empleador (plazo fijo)' : 'AFC empleador (indefinido)',
      isFixedTerm
        ? params.afcEmployerFixedTermPercent
        : params.afcEmployerIndefinitePercent,
    );
    const mutualLabel = contract?.mutualName
      ? `Mutual / ISL (${contract.mutualName})`
      : 'Mutual de seguridad';
    pushEmployer('MUTUAL', mutualLabel, params.mutualBasePercent);
    pushEmployer(
      'LEY_21735',
      'Cotización seguro social (Ley 21.735)',
      params.socialSecurityEmployerPercent,
    );

    const totalEmployerCost = employerCosts.reduce((s, c) => s + c.amount, 0);

    return {
      params,
      totalImponible,
      totalNoImponible,
      taxableBase,
      suggestedDeductions,
      employerCosts,
      totalEmployerCost,
      suggestedAllowances,
    };
  }

  /** Mezcla haberes del usuario + sugerencias legales (sin duplicar typeIds legales ya presentes). */
  mergeSuggestedDeductions(
    existingLines: Array<{ typeId: string; amount: number }>,
    suggested: PayrollStatutorySuggestionLine[],
  ): Array<{ typeId: string; amount: number }> {
    const statutoryIds = new Set(suggested.map((s) => s.typeId));
    const kept = existingLines.filter((l) => !statutoryIds.has(l.typeId as never));
    return [
      ...kept,
      ...suggested.map((s) => ({ typeId: s.typeId, amount: s.amount })),
    ];
  }
}
