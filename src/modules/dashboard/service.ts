import { query } from '../../shared/database/pool';

function periodToInterval(period: string): string {
  switch (period) {
    case 'day': return "NOW() - INTERVAL '1 day'";
    case 'week': return "NOW() - INTERVAL '7 days'";
    case 'month': return "date_trunc('month', NOW())";
    case 'year': return "date_trunc('year', NOW())";
    default: return "NOW() - INTERVAL '100 years'";
  }
}

export async function getStats(period?: string) {
  const since = period ? periodToInterval(period) : "NOW() - INTERVAL '100 years'";
  const periodFilter = `AND created_at >= ${since}`;

  const [clients, orders, revenue, products] = await Promise.all([
    query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'new') as new FROM clients WHERE deleted_at IS NULL ${periodFilter}`),
    query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'new') as new, COUNT(*) FILTER (WHERE status = 'completed') as completed FROM orders WHERE deleted_at IS NULL ${periodFilter}`),
    query(`SELECT COALESCE(SUM(total_amount), 0) as total_revenue, COALESCE(SUM(total_amount) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0) as monthly_revenue FROM orders WHERE deleted_at IS NULL AND status != 'cancelled' ${periodFilter}`),
    query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE stock_quantity <= min_stock_level) as low_stock FROM products WHERE deleted_at IS NULL AND is_active = true"),
  ]);

  return {
    clients: clients.rows[0],
    orders: orders.rows[0],
    revenue: revenue.rows[0],
    products: products.rows[0],
  };
}

export async function getRecentOrders(limit = 10, period?: string) {
  const since = period ? periodToInterval(period) : "NOW() - INTERVAL '100 years'";
  const result = await query(
    `SELECT o.*, c.name as client_name
     FROM orders o
     LEFT JOIN clients c ON c.id = o.client_id
     WHERE o.deleted_at IS NULL AND o.created_at >= ${since}
     ORDER BY o.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function getTopClients(limit = 10, period?: string) {
  const since = period ? periodToInterval(period) : "NOW() - INTERVAL '100 years'";
  const result = await query(
    `SELECT c.id, c.name, c.company, c.segment,
            COUNT(o.id) as order_count,
            COALESCE(SUM(o.total_amount), 0) as total_spent
     FROM clients c
     LEFT JOIN orders o ON o.client_id = c.id AND o.deleted_at IS NULL AND o.status != 'cancelled' AND o.created_at >= ${since}
     WHERE c.deleted_at IS NULL
     GROUP BY c.id, c.name, c.company, c.segment
     ORDER BY total_spent DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function getRevenueChart(period?: string) {
  let step: string;
  let since: string;
  let dateFmt: string;

  switch (period) {
    case 'day':
      step = '1 hour';
      since = "NOW() - INTERVAL '23 hours'";
      dateFmt = 'HH24:00';
      break;
    case 'week':
      step = '1 day';
      since = "NOW() - INTERVAL '6 days'";
      dateFmt = 'DD.MM';
      break;
    case 'year':
      step = '1 month';
      since = "date_trunc('year', NOW())";
      dateFmt = 'Mon';
      break;
    case 'month':
    default:
      step = '1 day';
      since = "NOW() - INTERVAL '29 days'";
      dateFmt = 'DD.MM';
      break;
  }

  const trunc = step === '1 hour' ? 'hour' : step === '1 month' ? 'month' : 'day';

  const result = await query(
    `SELECT
       to_char(s.t, '${dateFmt}') as date,
       COALESCE(SUM(o.total_amount), 0)::numeric as revenue,
       COUNT(o.id)::int as orders
     FROM generate_series(
       date_trunc('${trunc}', ${since}),
       date_trunc('${trunc}', NOW()),
       '${step}'::interval
     ) AS s(t)
     LEFT JOIN orders o
       ON date_trunc('${trunc}', o.created_at) = s.t
       AND o.deleted_at IS NULL
       AND o.status != 'cancelled'
     GROUP BY s.t
     ORDER BY s.t`
  );
  return result.rows;
}

export async function getLowStockProducts() {
  const result = await query(
    `SELECT * FROM products
     WHERE deleted_at IS NULL AND is_active = true
       AND stock_quantity <= min_stock_level
     ORDER BY stock_quantity ASC`
  );
  return result.rows;
}
