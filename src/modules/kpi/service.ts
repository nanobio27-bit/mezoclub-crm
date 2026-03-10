import { query } from '../../shared/database/pool';
import { ApiError } from '../../shared/types/api-error';
import { KpiSummary, KpiTarget } from './types';

// Get current month date range
function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const startDay = new Date(y, m, 1);
  const endDay = new Date(y, m + 1, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    start: `${y}-${pad(m + 1)}-01`,
    end: `${y}-${pad(m + 1)}-${pad(endDay.getDate())}`,
  };
}

// Get KPI summary for a user
export async function getKpiSummary(userId: number): Promise<KpiSummary> {
  const { start, end } = getCurrentMonthRange();

  // Get user name
  const userRes = await query('SELECT name FROM users WHERE id = $1', [userId]);
  if (userRes.rows.length === 0) throw ApiError.notFound('User not found');
  const userName = userRes.rows[0].name;

  // Get targets
  const targetsRes = await query(
    'SELECT metric, target_value FROM kpi_targets WHERE user_id = $1 AND period = $2',
    [userId, 'monthly']
  );
  const targets: Record<string, number> = {};
  for (const t of targetsRes.rows) {
    targets[t.metric] = parseFloat(t.target_value);
  }

  // Get KPI records for current month
  const recordsRes = await query(
    `SELECT type, SUM(count) as total FROM kpi_records
     WHERE user_id = $1 AND date >= $2 AND date <= $3
     GROUP BY type`,
    [userId, start, end]
  );
  const recordTotals: Record<string, number> = {};
  for (const r of recordsRes.rows) {
    recordTotals[r.type] = parseInt(r.total, 10);
  }

  // Get revenue from orders for this month (user is the manager)
  const revenueRes = await query(
    `SELECT COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as orders_count,
            CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(total_amount), 0) / COUNT(*) ELSE 0 END as avg_check
     FROM orders
     WHERE user_id = $1 AND deleted_at IS NULL
       AND created_at >= $2 AND created_at <= ($3::date + interval '1 day')`,
    [userId, start, end]
  );
  const revenue = parseFloat(revenueRes.rows[0].revenue) || 0;
  const ordersCount = parseInt(revenueRes.rows[0].orders_count, 10) || 0;
  const avgCheck = parseFloat(revenueRes.rows[0].avg_check) || 0;

  const meetings = recordTotals['meeting'] || 0;
  const calls = recordTotals['call'] || 0;
  const seminars = recordTotals['seminar'] || 0;
  const leads = recordTotals['lead'] || 0;

  // Calculate GinCoin breakdown
  // Leads: +200 GC for every 10 leads
  const leadsGC = Math.floor(leads / 10) * 200;

  // Meetings: 100 GC each, BUT if <15 total in month, all burn (0)
  const meetingsGC = meetings >= 15 ? meetings * 100 : 0;

  // Seminars: 500 GC each if >2 in month (else 0)
  const seminarsGC = seminars > 2 ? seminars * 500 : 0;

  // Streak: simplified - check weekly revenue targets (200 GC per consecutive week)
  // For now, count weeks where daily records exist
  const streakWeeks = 0; // TODO: implement proper streak calculation
  const streakGC = streakWeeks * 200;

  return {
    user_id: userId,
    user_name: userName,
    period_start: start,
    period_end: end,
    targets,
    actuals: {
      revenue,
      avg_check: Math.round(avgCheck),
      orders_count: ordersCount,
      meetings,
      calls,
      seminars,
      leads,
      streak_weeks: streakWeeks,
    },
    gincoin_breakdown: {
      leads: leadsGC,
      meetings: meetingsGC,
      seminars: seminarsGC,
      streak: streakGC,
      total: leadsGC + meetingsGC + seminarsGC + streakGC,
    },
  };
}

// Increment a KPI record
export async function incrementKpi(
  userId: number,
  type: string
): Promise<{ type: string; count: number; date: string }> {
  const validTypes = ['meeting', 'call', 'seminar', 'lead'];
  if (!validTypes.includes(type)) {
    throw ApiError.badRequest(
      `Invalid KPI type: ${type}. Valid: ${validTypes.join(', ')}`
    );
  }

  const today = new Date().toISOString().split('T')[0];

  // Insert a new row each time with count=1
  // The SUM in getKpiSummary will aggregate correctly
  await query(
    `INSERT INTO kpi_records (user_id, type, count, date) VALUES ($1, $2, 1, $3)`,
    [userId, type, today]
  );

  // Get today's total for this type
  const totalRes = await query(
    `SELECT SUM(count) as total FROM kpi_records WHERE user_id = $1 AND type = $2 AND date = $3`,
    [userId, type, today]
  );

  return { type, count: parseInt(totalRes.rows[0].total, 10), date: today };
}

// Get targets for a user
export async function getTargets(userId: number): Promise<KpiTarget[]> {
  const result = await query(
    'SELECT * FROM kpi_targets WHERE user_id = $1 ORDER BY metric',
    [userId]
  );
  return result.rows;
}

// Set a target for a user
export async function setTarget(
  userId: number,
  metric: string,
  targetValue: number
): Promise<KpiTarget> {
  const result = await query(
    `INSERT INTO kpi_targets (user_id, metric, target_value, period)
     VALUES ($1, $2, $3, 'monthly')
     ON CONFLICT (user_id, metric, period)
     DO UPDATE SET target_value = $3, updated_at = NOW()
     RETURNING *`,
    [userId, metric, targetValue]
  );
  return result.rows[0];
}

// Get all managers (for admin)
export async function getAllManagers(): Promise<
  { id: number; name: string; email: string; role: string }[]
> {
  const result = await query(
    "SELECT id, name, email, role FROM users WHERE role IN ('manager', 'admin') AND is_active = true ORDER BY name"
  );
  return result.rows;
}
