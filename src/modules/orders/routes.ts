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

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await orderService.getOrderWithItems(parseInt(req.params.id, 10));
    if (!order) return res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createOrderSchema.parse(req.body);
    const order = await orderService.createOrder(req.user!.userId, input);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

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
