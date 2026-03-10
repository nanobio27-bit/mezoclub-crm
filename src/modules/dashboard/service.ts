import { query } from '../../shared/database/pool';

export async function getStats() {
  const [clients, orders, revenue, products] = await Promise.all([
    query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'new') as new FROM clients WHERE deleted_at IS NULL"),
    query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'new') as new, COUNT(*) FILTER (WHERE status = 'completed') as completed FROM orders WHERE deleted_at IS NULL"),
    query("SELECT COALESCE(SUM(total_amount), 0) as total_revenue, COALESCE(SUM(total_amount) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0) as monthly_revenue FROM orders WHERE deleted_at IS NULL AND status != 'cancelled'"),
    query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE stock_quantity <= min_stock_level) as low_stock FROM products WHERE deleted_at IS NULL AND is_active = true"),
  ]);

  return {
    clients: clients.rows[0],
    orders: orders.rows[0],
    revenue: revenue.rows[0],
    products: products.rows[0],
  };
}

export async function getRecentOrders(limit = 10) {
  const result = await query(
    `SELECT o.*, c.name as client_name
     FROM orders o
     LEFT JOIN clients c ON c.id = o.client_id
     WHERE o.deleted_at IS NULL
     ORDER BY o.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function getTopClients(limit = 10) {
  const result = await query(
    `SELECT c.id, c.name, c.company, c.segment,
            COUNT(o.id) as order_count,
            COALESCE(SUM(o.total_amount), 0) as total_spent
     FROM clients c
     LEFT JOIN orders o ON o.client_id = c.id AND o.deleted_at IS NULL AND o.status != 'cancelled'
     WHERE c.deleted_at IS NULL
     GROUP BY c.id, c.name, c.company, c.segment
     ORDER BY total_spent DESC
     LIMIT $1`,
    [limit]
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
