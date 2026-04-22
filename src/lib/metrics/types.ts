export interface MetricCoverage {
  transactionCount?: number;
  selectedYearTransactionCount?: number;
  accountCount?: number;
  activeAccountCount?: number;
  goalCount?: number;
  activeGoalCount?: number;
  importRunCount?: number;
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
