import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../auth/middleware';
import { query } from '../../shared/database/pool';

const router = Router();
router.use(authenticate);

router.get('/managers', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role,
              COALESCE(w.balance, 0) as balance,
              COALESCE(w.total_earned, 0) as total_earned,
              COALESCE(w.level, 'newcomer') as level,
              COALESCE(monthly.earned, 0) as monthly_earned
       FROM users u
       LEFT JOIN gincoin_wallets w ON w.user_id = u.id
       LEFT JOIN (
         SELECT w2.user_id, SUM(t.amount) as earned
         FROM gincoin_transactions t
         JOIN gincoin_wallets w2 ON w2.id = t.wallet_id
         WHERE t.type = 'earn' AND t.created_at >= date_trunc('month', NOW())
         GROUP BY w2.user_id
       ) monthly ON monthly.user_id = u.id
       WHERE u.is_active = true
       ORDER BY COALESCE(w.total_earned, 0) DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/my', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const result = await query(
      `SELECT rank FROM (
         SELECT u.id,
                RANK() OVER (ORDER BY COALESCE(w.total_earned, 0) DESC) as rank
         FROM users u
         LEFT JOIN gincoin_wallets w ON w.user_id = u.id
         WHERE u.is_active = true
       ) ranked
       WHERE ranked.id = $1`,
      [userId]
    );
    const rank = result.rows.length > 0 ? parseInt(String(result.rows[0].rank), 10) : null;
    res.json({ userId, rank });
  } catch (err) {
    next(err);
  }
});

export default router;
