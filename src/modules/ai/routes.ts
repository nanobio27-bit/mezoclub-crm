import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../auth/middleware';
import { getRecommendation } from './service';

const router = Router();
router.use(authenticate);

router.post('/recommend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { client_id, question } = req.body;
    if (!client_id) return res.status(400).json({ error: 'client_id required' });

    const recommendation = await getRecommendation(client_id, question);
    res.json({ recommendation });
  } catch (err) {
    next(err);
  }
});

export default router;
