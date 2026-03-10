export interface KpiTarget {
  id: number;
  user_id: number;
  metric: string;
  target_value: number;
  period: string;
  created_at: Date;
  updated_at: Date;
}

export interface KpiRecord {
  id: number;
  user_id: number;
  type: string;
  count: number;
  date: string;
  created_at: Date;
}

export interface KpiSummary {
  user_id: number;
  user_name: string;
  period_start: string;
  period_end: string;
  targets: Record<string, number>;
  actuals: {
    revenue: number;
    avg_check: number;
    orders_count: number;
    meetings: number;
    calls: number;
    seminars: number;
    leads: number;
    streak_weeks: number;
  };
  gincoin_breakdown: {
    leads: number;
    meetings: number;
    seminars: number;
    streak: number;
    total: number;
  };
}
