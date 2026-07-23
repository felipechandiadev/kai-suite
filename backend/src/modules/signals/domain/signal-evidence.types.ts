import type { SignalCtaDto, SignalSeverity } from './signal.types';

export type SignalEvidenceKind =
  | 'timeseries'
  | 'comparison'
  | 'ranking'
  | 'breakdown';

export type SignalEvidencePoint = {
  x: string;
  y: number;
  /** Destacar (p.ej. mismo día de semana). */
  highlight?: boolean;
};

export type SignalEvidenceThresholdLine = {
  label: string;
  y: number;
};

export type SignalEvidenceSeries = {
  label: string;
  points: SignalEvidencePoint[];
  thresholdLines?: SignalEvidenceThresholdLine[];
};

export type SignalEvidenceComparison = {
  bars: Array<{ label: string; value: number }>;
  thresholdLines?: SignalEvidenceThresholdLine[];
};

export type SignalEvidenceRanking = {
  rows: Array<{
    label: string;
    sublabel?: string;
    value: number;
    valueLabel?: string;
  }>;
};

export type SignalEvidenceBreakdown = {
  slices: Array<{ label: string; value: number }>;
};

export type SignalEvidenceThresholds = {
  watch?: number;
  critical?: number;
  unit?: string;
};

export type SignalEvidenceDto = {
  signalId: string;
  title: string;
  severity: SignalSeverity;
  headline: string;
  methodology: string;
  kind: SignalEvidenceKind;
  series?: SignalEvidenceSeries;
  comparison?: SignalEvidenceComparison;
  ranking?: SignalEvidenceRanking;
  breakdown?: SignalEvidenceBreakdown;
  thresholds?: SignalEvidenceThresholds;
  cta?: SignalCtaDto;
  computedAt: string;
};
