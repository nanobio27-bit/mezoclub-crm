// src/modules/dashboard/routes.ts
// Маршруты дашборда

import { Router, Request, Response, NextFunction } from 'express';
import { DashboardService } from './service';
import { DashboardRepository } from './repository';
import { authMiddleware } from '../../shared/middleware/auth';
import pool from '../../shared/database/pool';

const router = Router();
const repo = new DashboardRepository(pool);
const service = new DashboardService(repo);

router.use(authMiddleware);

/**
 * @openapi
 * /api/dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Сводные данные для главного экрана
 *     description: |
 *       Возвращает агрегированные метрики:
 *       todayRevenue, activeOrders, activeClients, lowStockProducts,
 *       recentOrders (10), topProducts (5), ordersByStatus
 *     responses:
 *       200:
 *         description: Данные дашборда
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     todayRevenue:
 *                       type: number
 *                       example: 125000
 *                     todayRevenueChange:
 *                       type: number
 *                       example: 15.5
 *                     activeOrders:
 *                       type: integer
 *                       example: 12
 *                     activeClients:
 *                       type: integer
 *                       example: 45
 *                     lowStockProducts:
 *                       type: integer
 *                       example: 3
 *       401:
 *         description: Не авторизован
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.getDashboardData(req.user!.tenantId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export { router as dashboardRoutes };
