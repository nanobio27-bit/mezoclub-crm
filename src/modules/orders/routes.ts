// src/modules/orders/routes.ts
// Маршруты заказов

import { Router, Request, Response, NextFunction } from 'express';
import { OrderService } from './service';
import { OrderRepository } from './repository';
import { createOrderSchema, updateOrderSchema, changeStatusSchema } from './types';
import { authMiddleware } from '../../shared/middleware/auth';
import { validate, parsePagination } from '../../shared/utils/validation';
import pool from '../../shared/database/pool';

const router = Router();
const repo = new OrderRepository(pool);
const service = new OrderService(repo);

router.use(authMiddleware);

/**
 * @openapi
 * /api/orders:
 *   get:
 *     tags: [Orders]
 *     summary: Список заказов с пагинацией и фильтрами
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по номеру заказа или имени клиента
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, confirmed, in_production, ready, shipped, delivered, completed, cancelled, returned]
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: managerId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, partial, paid, overdue]
 *     responses:
 *       200:
 *         description: Список заказов
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const result = await service.getAll({
      ...pagination,
      tenantId: req.user!.tenantId,
      status: req.query.status ? String(req.query.status) : undefined,
      clientId: req.query.clientId ? parseInt(String(req.query.clientId), 10) : undefined,
      managerId: req.query.managerId ? parseInt(String(req.query.managerId), 10) : undefined,
      paymentStatus: req.query.paymentStatus ? String(req.query.paymentStatus) : undefined,
    });
    res.json({ data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Получить заказ по ID с позициями
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Заказ с позициями
 *       404:
 *         description: Заказ не найден
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await service.getById(parseInt(String(req.params.id), 10), req.user!.tenantId);
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/orders:
 *   post:
 *     tags: [Orders]
 *     summary: Создать заказ
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, items]
 *             properties:
 *               clientId:
 *                 type: integer
 *                 example: 1
 *               managerId:
 *                 type: integer
 *               deliveryType:
 *                 type: string
 *                 example: nova_poshta
 *               deliveryAddress:
 *                 type: string
 *               deliveryCity:
 *                 type: string
 *               notes:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       example: 5
 *                     discountPercent:
 *                       type: number
 *                       example: 10
 *     responses:
 *       201:
 *         description: Заказ создан
 *       400:
 *         description: Недостаточно товара на складе
 */
router.post('/', validate(createOrderSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await service.create(req.body, req.user!.tenantId);
    res.status(201).json({ data: order });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/orders/{id}:
 *   put:
 *     tags: [Orders]
 *     summary: Обновить заказ (доставка, заметки, оплата)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deliveryType:
 *                 type: string
 *               deliveryAddress:
 *                 type: string
 *               trackingNumber:
 *                 type: string
 *               notes:
 *                 type: string
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, partial, paid, overdue]
 *               paidAmount:
 *                 type: number
 *               discountAmount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Заказ обновлён
 *       404:
 *         description: Заказ не найден
 */
router.put('/:id', validate(updateOrderSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await service.update(parseInt(String(req.params.id), 10), req.body, req.user!.tenantId);
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/orders/{id}/status:
 *   put:
 *     tags: [Orders]
 *     summary: Изменить статус заказа
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [new, confirmed, in_production, ready, shipped, delivered, completed, cancelled, returned]
 *                 example: confirmed
 *     responses:
 *       200:
 *         description: Статус изменён
 *       400:
 *         description: Недопустимый переход статуса
 *       404:
 *         description: Заказ не найден
 */
router.put('/:id/status', validate(changeStatusSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await service.changeStatus(
      parseInt(String(req.params.id), 10),
      req.body.status,
      req.user!.tenantId
    );
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/orders/{id}:
 *   delete:
 *     tags: [Orders]
 *     summary: Отменить заказ (мягкое удаление)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Заказ отменён
 *       404:
 *         description: Заказ не найден
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.delete(parseInt(String(req.params.id), 10), req.user!.tenantId);
    res.json({ data: { message: 'Заказ отменён' } });
  } catch (err) {
    next(err);
  }
});

export { router as orderRoutes };
