import { query, pool } from '../../shared/database/pool';
import { ApiError } from '../../shared/types/api-error';
import { CreateOrderInput, Order, OrderItem } from './types';

export async function createOrder(userId: number, input: CreateOrderInput): Promise<Order & { items: OrderItem[] }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch product prices and validate stock
    const items: { product_id: number; quantity: number; unit_price: number; total_price: number }[] = [];
    let totalAmount = 0;

    for (const item of input.items) {
      const productRes = await client.query(
        'SELECT id, price, stock_quantity FROM products WHERE id = $1 AND deleted_at IS NULL',
        [item.product_id]
      );
      const product = productRes.rows[0];
      if (!product) throw ApiError.notFound(`Product ${item.product_id} not found`);
      if (product.stock_quantity < item.quantity) {
        throw ApiError.badRequest(`Insufficient stock for product ${item.product_id}`);
      }

      const unitPrice = parseFloat(product.price);
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;
      items.push({ product_id: item.product_id, quantity: item.quantity, unit_price: unitPrice, total_price: totalPrice });
    }

    const discount = input.discount_amount || 0;
    const finalAmount = totalAmount - discount;

    // Create order
    const orderRes = await client.query(
      `INSERT INTO orders (client_id, user_id, total_amount, discount_amount, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [input.client_id, userId, finalAmount, discount, input.notes || null]
    );
    const order: Order = orderRes.rows[0];

    // Create order items + decrease stock
    const orderItems: OrderItem[] = [];
    for (const item of items) {
      const itemRes = await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [order.id, item.product_id, item.quantity, item.unit_price, item.total_price]
      );
      orderItems.push(itemRes.rows[0]);

      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query('COMMIT');
    return { ...order, items: orderItems };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getOrderWithItems(orderId: number): Promise<(Order & { items: OrderItem[] }) | null> {
  const orderRes = await query(
    'SELECT * FROM orders WHERE id = $1 AND deleted_at IS NULL',
    [orderId]
  );
  if (orderRes.rows.length === 0) return null;

  const itemsRes = await query(
    'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id',
    [orderId]
  );

  return { ...orderRes.rows[0], items: itemsRes.rows };
}

export async function updateOrderStatus(orderId: number, status: string): Promise<Order | null> {
  const result = await query(
    `UPDATE orders SET status = $1, updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL RETURNING *`,
    [status, orderId]
  );
  return result.rows[0] || null;
}
