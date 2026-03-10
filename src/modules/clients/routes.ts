// src/modules/clients/routes.ts
// Маршруты клиентов

import { Router, Request, Response, NextFunction } from 'express';
import { ClientService } from './service';
import { ClientRepository } from './repository';
import { createClientSchema, updateClientSchema } from './types';
import { authMiddleware } from '../../shared/middleware/auth';
import { validate, parsePagination } from '../../shared/utils/validation';
import pool from '../../shared/database/pool';

const router = Router();
const repo = new ClientRepository(pool);
const service = new ClientService(repo);

// Все маршруты клиентов требуют авторизации
router.use(authMiddleware);

/**
 * @openapi
 * /api/clients:
 *   get:
 *     tags: [Clients]
 *     summary: Список клиентов с пагинацией и фильтрами
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
 *         description: Поиск по имени, компании, email, телефону, городу
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, active, inactive, lost]
 *       - in: query
 *         name: clientType
 *         schema:
 *           type: string
 *           enum: [clinic, cosmetologist, distributor]
 *       - in: query
 *         name: managerId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Список клиентов
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const result = await service.getAll({
      ...pagination,
      tenantId: req.user!.tenantId,
      status: req.query.status ? String(req.query.status) : undefined,
      clientType: req.query.clientType ? String(req.query.clientType) : undefined,
      managerId: req.query.managerId ? parseInt(String(req.query.managerId), 10) : undefined,
    });
    res.json({ data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/clients/{id}:
 *   get:
 *     tags: [Clients]
 *     summary: Получить клиента по ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Данные клиента
 *       404:
 *         description: Клиент не найден
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = await service.getById(parseInt(String(req.params.id), 10), req.user!.tenantId);
    res.json({ data: client });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/clients:
 *   post:
 *     tags: [Clients]
 *     summary: Создать клиента
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Клиника Красота"
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               company:
 *                 type: string
 *               clientType:
 *                 type: string
 *                 enum: [clinic, cosmetologist, distributor]
 *               city:
 *                 type: string
 *               managerId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Клиент создан
 */
router.post('/', validate(createClientSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = await service.create(req.body, req.user!.tenantId);
    res.status(201).json({ data: client });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/clients/{id}:
 *   put:
 *     tags: [Clients]
 *     summary: Обновить клиента
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
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [new, active, inactive, lost]
 *               city:
 *                 type: string
 *     responses:
 *       200:
 *         description: Клиент обновлён
 *       404:
 *         description: Клиент не найден
 */
router.put('/:id', validate(updateClientSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = await service.update(parseInt(String(req.params.id), 10), req.body, req.user!.tenantId);
    res.json({ data: client });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/clients/{id}:
 *   delete:
 *     tags: [Clients]
 *     summary: Удалить клиента (мягкое удаление)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Клиент удалён
 *       404:
 *         description: Клиент не найден
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.delete(parseInt(String(req.params.id), 10), req.user!.tenantId);
    res.json({ data: { message: 'Клиент удалён' } });
  } catch (err) {
    next(err);
  }
});

export { router as clientRoutes };
