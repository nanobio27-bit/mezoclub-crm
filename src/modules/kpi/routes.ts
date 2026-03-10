import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../auth/middleware';
import * as kpiService from './service';

const router = Router();
router.use(authenticate);

// GET /api/kpi/my - current user's KPI
router.get('/my', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await kpiService.getKpiSummary(req.user!.userId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// GET /api/kpi/managers - list of managers (admin only)
router.get(
  '/managers',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const managers = await kpiService.getAllManagers();
      res.json(managers);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/kpi/user/:id - specific user's KPI (admin only)
router.get(
  '/user/:id',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const summary = await kpiService.getKpiSummary(userId);
      res.json(summary);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/kpi/increment - increment KPI counter
router.post(
  '/increment',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;
      const result = await kpiService.incrementKpi(req.user!.userId, type);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/kpi/targets/:userId - get targets for user
router.get(
  '/targets/:userId',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      const targets = await kpiService.getTargets(userId);
      res.json(targets);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/kpi/targets/:userId - set target for user (admin)
router.put(
  '/targets/:userId',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      const { metric, target_value } = req.body;
      const target = await kpiService.setTarget(userId, metric, target_value);
      res.json(target);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
