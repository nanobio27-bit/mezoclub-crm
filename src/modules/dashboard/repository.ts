// src/modules/dashboard/repository.ts
// Репозиторий дашборда — агрегирующие SQL-запросы

import { Pool } from 'pg';

export class DashboardRepository {
  constructor(private pool: Pool) {}

  /** Выручка за сегодня */
  async getTodayRevenue(tenantId: number): Promise<number> {
    const result = await this.pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as revenue
       FROM orders
       WHERE tenant_id = $1
         AND created_at >= CURRENT_DATE
         AND deleted_at IS NULL
         AND status NOT IN ('cancelled', 'returned')`,
      [tenantId]
    );
    return parseFloat(result.rows[0].revenue);
  }

  /** Выручка за вчера (для расчёта % изменения) */
  async getYesterdayRevenue(tenantId: number): Promise<number> {
    const result = await this.pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as revenue
       FROM orders
       WHERE tenant_id = $1
         AND created_at >= CURRENT_DATE - INTERVAL '1 day'
         AND created_at < CURRENT_DATE
         AND deleted_at IS NULL
         AND status NOT IN ('cancelled', 'returned')`,
      [tenantId]
    );
    return parseFloat(result.rows[0].revenue);
  }

  /** Количество активных заказов (не завершённые и не отменённые) */
  async getActiveOrdersCount(tenantId: number): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count
       FROM orders
       WHERE tenant_id = $1
         AND status NOT IN ('completed', 'cancelled', 'returned')
         AND deleted_at IS NULL`,
      [tenantId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /** Количество активных клиентов (с заказами за последние 30 дней) */
  async getActiveClientsCount(tenantId: number): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(DISTINCT client_id) as count
       FROM orders
       WHERE tenant_id = $1
         AND created_at >= NOW() - INTERVAL '30 days'
         AND deleted_at IS NULL`,
      [tenantId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /** Количество товаров с низким остатком */
  async getLowStockCount(tenantId: number): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count
       FROM products
       WHERE tenant_id = $1
         AND stock_quantity <= min_stock_level
         AND is_active = true
         AND deleted_at IS NULL`,
      [tenantId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /** Последние 10 заказов */
  async getRecentOrders(tenantId: number) {
    const result = await this.pool.query(
      `SELECT o.*, c.name as client_name, u.name as manager_name
       FROM orders o
       LEFT JOIN clients c ON o.client_id = c.id
       LEFT JOIN users u ON o.manager_id = u.id
       WHERE o.tenant_id = $1 AND o.deleted_at IS NULL
       ORDER BY o.created_at DESC
       LIMIT 10`,
      [tenantId]
    );
    return result.rows;
  }

  /** Топ-5 товаров по продажам за 30 дней */
  async getTopProducts(tenantId: number) {
    const result = await this.pool.query(
      `SELECT 
         p.id, p.name, p.sku, p.brand, p.category, p.price,
         p.stock_quantity, p.min_stock_level, p.unit, p.is_active,
         p.image_url, p.created_at, p.updated_at,
         COALESCE(SUM(oi.quantity), 0)::integer as total_sold,
         COALESCE(SUM(oi.total_price), 0)::numeric as total_revenue
       FROM products p
       LEFT JOIN order_items oi ON p.id = oi.product_id
       LEFT JOIN orders o ON oi.order_id = o.id
         AND o.created_at >= NOW() - INTERVAL '30 days'
         AND o.deleted_at IS NULL
         AND o.status NOT IN ('cancelled', 'returned')
       WHERE p.tenant_id = $1 AND p.deleted_at IS NULL
       GROUP BY p.id
       ORDER BY total_revenue DESC
       LIMIT 5`,
      [tenantId]
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      product: {
        id: row.id,
        name: row.name,
        sku: row.sku,
        brand: row.brand,
        category: row.category,
        price: parseFloat(String(row.price)),
        stockQuantity: parseInt(String(row.stock_quantity), 10),
        minStockLevel: parseInt(String(row.min_stock_level), 10),
        unit: row.unit,
        isActive: row.is_active,
        imageUrl: row.image_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      totalSold: parseInt(String(row.total_sold), 10),
      totalRevenue: parseFloat(String(row.total_revenue)),
    }));
  }

  /** Распределение заказов по статусам */
  async getOrdersByStatus(tenantId: number) {
    const result = await this.pool.query(
      `SELECT status, COUNT(*)::integer as count
       FROM orders
       WHERE tenant_id = $1 AND deleted_at IS NULL
       GROUP BY status
       ORDER BY count DESC`,
      [tenantId]
    );
    return result.rows;
  }
}
