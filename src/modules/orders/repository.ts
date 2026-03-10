// src/modules/orders/repository.ts
// Репозиторий заказов — работа с orders и order_items

import { Pool } from 'pg';
import { BaseRepository } from '../../shared/database/base-repository';
import { Order, OrderItem, PaginationMeta } from '../../shared/types/common';
import { OrderListParams } from './types';

export class OrderRepository extends BaseRepository<Order> {
  constructor(pool: Pool) {
    super(pool, 'orders', true);
  }

  /** Получить список заказов с JOIN на клиента и менеджера */
  async findAllWithRelations(
    params: OrderListParams
  ): Promise<{ data: Order[]; meta: PaginationMeta }> {
    const {
      tenantId,
      page = 1,
      limit = 20,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
      status,
      clientId,
      managerId,
      paymentStatus,
    } = params;

    const offset = (page - 1) * limit;
    const values: unknown[] = [];
    const conditions: string[] = ['o.deleted_at IS NULL'];

    if (tenantId) {
      values.push(tenantId);
      conditions.push(`o.tenant_id = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(o.order_number ILIKE $${values.length} OR c.name ILIKE $${values.length})`
      );
    }

    if (status) {
      values.push(status);
      conditions.push(`o.status = $${values.length}`);
    }
    if (clientId) {
      values.push(clientId);
      conditions.push(`o.client_id = $${values.length}`);
    }
    if (managerId) {
      values.push(managerId);
      conditions.push(`o.manager_id = $${values.length}`);
    }
    if (paymentStatus) {
      values.push(paymentStatus);
      conditions.push(`o.payment_status = $${values.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const allowedSort = ['id', 'created_at', 'updated_at', 'status', 'total_amount', 'order_number'];
    const safeSortBy = allowedSort.includes(sortBy) ? `o.${sortBy}` : 'o.created_at';
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM orders o
       LEFT JOIN clients c ON o.client_id = c.id
       ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await this.pool.query(
      `SELECT o.*, c.name as client_name, u.name as manager_name
       FROM orders o
       LEFT JOIN clients c ON o.client_id = c.id
       LEFT JOIN users u ON o.manager_id = u.id
       ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortOrder}
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return {
      data: dataResult.rows,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /** Получить заказ по ID с позициями, клиентом и менеджером */
  async findByIdWithDetails(id: number, tenantId: number): Promise<Order | null> {
    const orderResult = await this.pool.query(
      `SELECT o.*, c.name as client_name, u.name as manager_name
       FROM orders o
       LEFT JOIN clients c ON o.client_id = c.id
       LEFT JOIN users u ON o.manager_id = u.id
       WHERE o.id = $1 AND o.tenant_id = $2 AND o.deleted_at IS NULL`,
      [id, tenantId]
    );

    if (orderResult.rows.length === 0) return null;

    const order = orderResult.rows[0];

    // Получаем позиции заказа
    const itemsResult = await this.pool.query(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id',
      [id]
    );
    order.items = itemsResult.rows;

    return order;
  }

  /** Создать заказ (без order_number — триггер БД сгенерирует) */
  async createOrder(data: {
    tenantId: number;
    clientId: number;
    managerId?: number;
    subtotal: number;
    discountAmount: number;
    totalAmount: number;
    deliveryType?: string;
    deliveryAddress?: string;
    deliveryCity?: string;
    notes?: string;
  }): Promise<Order> {
    const result = await this.pool.query(
      `INSERT INTO orders (tenant_id, client_id, manager_id, subtotal, discount_amount, total_amount,
         delivery_type, delivery_address, delivery_city, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.tenantId, data.clientId, data.managerId || null,
        data.subtotal, data.discountAmount, data.totalAmount,
        data.deliveryType || null, data.deliveryAddress || null,
        data.deliveryCity || null, data.notes || null,
      ]
    );
    return result.rows[0];
  }

  /** Добавить позиции заказа */
  async createOrderItems(items: {
    orderId: number;
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    totalPrice: number;
  }[]): Promise<OrderItem[]> {
    if (items.length === 0) return [];

    const valuesSql: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    for (const item of items) {
      valuesSql.push(
        `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6})`
      );
      values.push(
        item.orderId, item.productId, item.productName,
        item.quantity, item.unitPrice, item.discountPercent, item.totalPrice
      );
      paramIdx += 7;
    }

    const result = await this.pool.query(
      `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, discount_percent, total_price)
       VALUES ${valuesSql.join(', ')}
       RETURNING *`,
      values
    );
    return result.rows;
  }

  /** Обновить статус заказа */
  async updateStatus(id: number, status: string, extraFields?: Record<string, unknown>): Promise<Order | null> {
    const sets = ['status = $1', 'updated_at = NOW()'];
    const values: unknown[] = [status];

    if (extraFields) {
      for (const [key, value] of Object.entries(extraFields)) {
        values.push(value);
        sets.push(`${key} = $${values.length}`);
      }
    }

    values.push(id);
    const result = await this.pool.query(
      `UPDATE orders SET ${sets.join(', ')} WHERE id = $${values.length} AND deleted_at IS NULL RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  /** Получить последние N заказов */
  async findRecent(tenantId: number, limit: number = 10): Promise<Order[]> {
    const result = await this.pool.query(
      `SELECT o.*, c.name as client_name, u.name as manager_name
       FROM orders o
       LEFT JOIN clients c ON o.client_id = c.id
       LEFT JOIN users u ON o.manager_id = u.id
       WHERE o.tenant_id = $1 AND o.deleted_at IS NULL
       ORDER BY o.created_at DESC
       LIMIT $2`,
      [tenantId, limit]
    );
    return result.rows;
  }

  /** Удалить позиции заказа */
  async deleteOrderItems(orderId: number): Promise<void> {
    await this.pool.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
  }
}
