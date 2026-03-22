import { Router, Request, Response, NextFunction } from 'express';
import * as dashboardService from './service';
import { authenticate } from '../auth/middleware';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get overall CRM statistics
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/DashboardStats' }
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period } = req.query;
    const stats = await dashboardService.getStats(period as string | undefined);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/dashboard/recent-orders:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get 10 most recent orders
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Recent orders list }
 */
router.get('/recent-orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period } = req.query;
    const orders = await dashboardService.getRecentOrders(10, period as string | undefined);
    res.json({ data: orders });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/dashboard/top-clients:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get top 10 clients by revenue
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Top clients list }
 */
router.get('/top-clients', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period } = req.query;
    const clients = await dashboardService.getTopClients(10, period as string | undefined);
    res.json({ data: clients });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/dashboard/low-stock:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get products with low stock levels
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Low stock products }
 */
router.get('/revenue-chart', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period } = req.query;
    const data = await dashboardService.getRevenueChart(period as string | undefined);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.get('/low-stock', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await dashboardService.getLowStockProducts();
    res.json({ data: products });
  } catch (err) {
    next(err);
  }
});

export default router;
