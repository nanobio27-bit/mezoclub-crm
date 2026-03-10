import { Router, Request, Response, NextFunction } from 'express';
import * as dashboardService from './service';
import { authenticate } from '../auth/middleware';

const router = Router();
router.use(authenticate);

router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await dashboardService.getStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

router.get('/recent-orders', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await dashboardService.getRecentOrders();
    res.json({ data: orders });
  } catch (err) {
    next(err);
  }
});

router.get('/top-clients', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const clients = await dashboardService.getTopClients();
    res.json({ data: clients });
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
