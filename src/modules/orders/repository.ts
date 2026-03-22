import { BaseRepository, PaginationParams, PaginatedResult } from '../../shared/database/base-repository';
import { query } from '../../shared/database/pool';
import { Order } from './types';

class OrderRepository extends BaseRepository<Order> {
  constructor() {
    super('orders', true);
  }

  async findAll(
    filters: Record<string, any> = {},
    pagination?: PaginationParams
  ): Promise<PaginatedResult<any>> {
    const conditions: string[] = ['orders.deleted_at IS NULL'];
    const values: any[] = [];
    let paramIdx = 1;

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        conditions.push(`orders.${key} = $${paramIdx}`);
        values.push(value);
        paramIdx++;
      }
    }

    const where = conditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) FROM orders WHERE ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT orders.*,
              json_build_object('name', clients.name) AS client,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'product_name', p.name,
                  'quantity', oi.quantity,
                  'unit_price', oi.unit_price,
                  'total_price', oi.total_price
                ) ORDER BY oi.id)
                 FROM order_items oi
                 JOIN products p ON p.id = oi.product_id
                 WHERE oi.order_id = orders.id),
                '[]'::json
              ) AS items
       FROM orders
       LEFT JOIN clients ON clients.id = orders.client_id
       WHERE ${where}
       ORDER BY orders.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...values, limit, offset]
    );

    return { data: result.rows, total, page, limit };
  }
}

export const orderRepository = new OrderRepository();
