import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../auth/middleware';
import * as gincoinService from './service';

const router = Router();
router.use(authenticate);

router.get('/balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wallet = await gincoinService.getBalance(req.user!.userId);
    res.json(wallet);
  } catch (err) {
    next(err);
  }
});

router.get('/transactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const result = await gincoinService.getTransactions(req.user!.userId, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/exchange', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, quantity } = req.body;
    const result = await gincoinService.exchangeForProduct(req.user!.userId, productId, quantity);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/withdraw', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount } = req.body;
    const result = await gincoinService.withdrawToCash(req.user!.userId, amount);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
