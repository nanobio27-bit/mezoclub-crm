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

router.get('/low-stock', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await productRepository.getLowStock();
    res.json({ data: products, total: products.length });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productRepository.findById(parseInt(req.params.id, 10));
    if (!product) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = productSchema.parse(req.body);
    const product = await productRepository.create(data);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

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
