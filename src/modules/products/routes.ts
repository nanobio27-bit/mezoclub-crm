// src/modules/products/routes.ts
// Маршруты товаров

import { Router, Request, Response, NextFunction } from 'express';
import { ProductService } from './service';
import { ProductRepository } from './repository';
import { createProductSchema, updateProductSchema } from './types';
import { authMiddleware } from '../../shared/middleware/auth';
import { validate, parsePagination } from '../../shared/utils/validation';
import pool from '../../shared/database/pool';

const router = Router();
const repo = new ProductRepository(pool);
const service = new ProductService(repo);

router.use(authMiddleware);

/**
 * @openapi
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Список товаров с пагинацией и фильтрами
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
 *         description: Поиск по названию, артикулу, бренду
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Список товаров
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const result = await service.getAll({
      ...pagination,
      tenantId: req.user!.tenantId,
      category: req.query.category ? String(req.query.category) : undefined,
      brand: req.query.brand ? String(req.query.brand) : undefined,
      isActive: req.query.isActive !== undefined ? String(req.query.isActive) === 'true' : undefined,
    });
    res.json({ data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/products/low-stock:
 *   get:
 *     tags: [Products]
 *     summary: Товары с низким остатком
 *     responses:
 *       200:
 *         description: Список товаров с остатком ниже минимального
 */
router.get('/low-stock', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await service.getLowStock(req.user!.tenantId);
    res.json({ data: products });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Получить товар по ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Данные товара
 *       404:
 *         description: Товар не найден
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await service.getById(parseInt(String(req.params.id), 10), req.user!.tenantId);
    res.json({ data: product });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Создать товар
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "AESSOA Fine"
 *               sku:
 *                 type: string
 *                 example: "AES-FINE-01"
 *               brand:
 *                 type: string
 *                 example: "AESSOA"
 *               category:
 *                 type: string
 *                 example: "filler"
 *               price:
 *                 type: number
 *                 example: 2500
 *               stockQuantity:
 *                 type: integer
 *                 example: 50
 *     responses:
 *       201:
 *         description: Товар создан
 */
router.post('/', validate(createProductSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await service.create(req.body, req.user!.tenantId);
    res.status(201).json({ data: product });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Обновить товар
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
 *               price:
 *                 type: number
 *               stockQuantity:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Товар обновлён
 *       404:
 *         description: Товар не найден
 */
router.put('/:id', validate(updateProductSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await service.update(parseInt(String(req.params.id), 10), req.body, req.user!.tenantId);
    res.json({ data: product });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Удалить товар (мягкое удаление)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Товар удалён
 *       404:
 *         description: Товар не найден
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.delete(parseInt(String(req.params.id), 10), req.user!.tenantId);
    res.json({ data: { message: 'Товар удалён' } });
  } catch (err) {
    next(err);
  }
});

export { router as productRoutes };
