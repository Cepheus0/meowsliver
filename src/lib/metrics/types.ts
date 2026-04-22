export interface MetricCoverage {
  transactionCount?: number;
  selectedYearTransactionCount?: number;
  activeAccountCount?: number;
  activeGoalCount?: number;
  generatedFrom: string[];
  caveats: string[];
}

export interface MetricPacket<TMetrics, TEvidence = unknown> {
  scope: string;
  period?: string;
  metrics: TMetrics;
  evidence?: TEvidence;
  generatedAt: string;
  coverage: MetricCoverage;
}

