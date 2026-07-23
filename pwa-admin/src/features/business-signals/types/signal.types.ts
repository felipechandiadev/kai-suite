export type SignalSeverity = "OK" | "WATCH" | "CRITICAL" | "INFO";

export type SignalCta = {
  label: string;
  href: string;
};

export type SignalSubject = {
  name: string;
  attributes?: string | null;
  sku?: string | null;
};

export type SignalCard = {
  id: string;
  title: string;
  severity: SignalSeverity;
  headline: string;
  context: string;
  insight: string;
  cta?: SignalCta;
  computedAt: string;
  subject?: SignalSubject;
  meta?: Record<string, unknown>;
};

export type SignalsBoard = {
  signals: SignalCard[];
  computedAt: string;
};

export type SignalEvidenceKind = "timeseries" | "comparison" | "ranking" | "breakdown";

export type SignalEvidencePoint = {
  x: string;
  y: number;
  highlight?: boolean;
};

export type SignalEvidenceThresholdLine = {
  label: string;
  y: number;
};

export type SignalEvidenceDto = {
  signalId: string;
  title: string;
  severity: SignalSeverity;
  headline: string;
  methodology: string;
  kind: SignalEvidenceKind;
  series?: {
    label: string;
    points: SignalEvidencePoint[];
    thresholdLines?: SignalEvidenceThresholdLine[];
  };
  comparison?: {
    bars: Array<{ label: string; value: number }>;
    thresholdLines?: SignalEvidenceThresholdLine[];
  };
  ranking?: {
    rows: Array<{
      label: string;
      sublabel?: string;
      value: number;
      valueLabel?: string;
    }>;
  };
  breakdown?: {
    slices: Array<{ label: string; value: number }>;
  };
  thresholds?: {
    watch?: number;
    critical?: number;
    unit?: string;
  };
  cta?: SignalCta;
  computedAt: string;
};
