import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { productRepository } from './repository';
import { authenticate } from '../auth/middleware';

const router = Router();
router.use(authenticate);

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive(),
  cost_price: z.number().optional(),
  stock_quantity: z.number().int().min(0).optional(),
  min_stock_level: z.number().int().min(0).optional(),
  brand: z.string().optional(),
  is_active: z.boolean().optional(),
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: List products (with search, filter, pagination)
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: brand
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200: { description: Paginated product list }
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, brand, page = '1', limit = '50' } = req.query;

    if (search) {
      const results = await productRepository.search(search as string);
      return res.json({ data: results, total: results.length });
    }

    const filters: Record<string, any> = {};
    if (brand) filters.brand = brand;

    const result = await productRepository.findAll(filters, {
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
 * /api/products/low-stock:
 *   get:
 *     tags: [Products]
 *     summary: Get products with low stock
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Low stock products }
 */
router.get('/low-stock', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await productRepository.getLowStock();
    res.json({ data: products, total: products.length });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get product by ID
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
 *             schema: { $ref: '#/components/schemas/Product' }
 *       404: { description: Not found }
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productRepository.findById(parseInt(req.params.id, 10));
    if (!product) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Product' }
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Product' }
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = productSchema.parse(req.body);
    const product = await productRepository.create(data);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Update product
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Product' }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Product' }
 *       404: { description: Not found }
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = productSchema.partial().parse(req.body);
    const product = await productRepository.update(parseInt(req.params.id, 10), data);
    if (!product) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Soft-delete product
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
    const deleted = await productRepository.delete(parseInt(req.params.id, 10));
    if (!deleted) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
