import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { orderRepository } from './repository';
import * as orderService from './service';
import { authenticate } from '../auth/middleware';

const router = Router();
router.use(authenticate);

const createOrderSchema = z.object({
  client_id: z.number().int().positive(),
  discount_amount: z.number().min(0).optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })).min(1),
});

/**
 * @swagger
 * /api/orders:
 *   get:
 *     tags: [Orders]
 *     summary: List orders (with filters and pagination)
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [new, processing, completed, cancelled] }
 *       - in: query
 *         name: payment_status
 *         schema: { type: string, enum: [pending, paid, refunded] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200: { description: Paginated order list }
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, payment_status, page = '1', limit = '50' } = req.query;
    const filters: Record<string, any> = {};
    if (status) filters.status = status;
    if (payment_status) filters.payment_status = payment_status;

    const result = await orderRepository.findAll(filters, {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get order with items
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       404: { description: Not found }
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await orderService.getOrderWithItems(parseInt(req.params.id, 10));
    if (!order) return res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create order with items (transactional, decreases stock)
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [client_id, items]
 *             properties:
 *               client_id: { type: integer }
 *               discount_amount: { type: number }
 *               notes: { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [product_id, quantity]
 *                   properties:
 *                     product_id: { type: integer }
 *                     quantity: { type: integer }
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createOrderSchema.parse(req.body);
    const order = await orderService.createOrder(req.user!.userId, input);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Update order status
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [new, processing, completed, cancelled] }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       404: { description: Not found }
 */
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status required', code: 'VALIDATION_ERROR' });
    const order = await orderService.updateOrderStatus(parseInt(req.params.id, 10), status);
    if (!order) return res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     tags: [Orders]
 *     summary: Soft-delete order
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await orderRepository.delete(parseInt(req.params.id, 10));
    if (!deleted) return res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
