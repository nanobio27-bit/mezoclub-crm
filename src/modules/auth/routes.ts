// src/modules/auth/routes.ts
// Маршруты авторизации

import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from './service';
import { AuthRepository } from './repository';
import { loginSchema, registerSchema, refreshSchema } from './types';
import { authMiddleware, roleMiddleware } from '../../shared/middleware/auth';
import { validate } from '../../shared/utils/validation';
import pool from '../../shared/database/pool';

const router = Router();
const repo = new AuthRepository(pool);
const service = new AuthService(repo);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Вход в систему
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: owner@mezoclub.com
 *               password:
 *                 type: string
 *                 example: MezoClub2026!
 *     responses:
 *       200:
 *         description: Успешный вход
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Неверные учётные данные
 */
router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await service.login(email, password);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Регистрация нового пользователя (только owner/admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:
 *                 type: string
 *                 example: manager@mezoclub.com
 *               password:
 *                 type: string
 *                 example: SecurePass123!
 *               name:
 *                 type: string
 *                 example: Иван Петренко
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [manager]
 *               phone:
 *                 type: string
 *                 example: "+380501234567"
 *     responses:
 *       200:
 *         description: Пользователь создан
 *       403:
 *         description: Недостаточно прав
 *       409:
 *         description: Email уже занят
 */
router.post(
  '/register',
  authMiddleware,
  roleMiddleware('owner', 'admin'),
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await service.register(req.body, req.user!.tenantId);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Обновить access token через refresh token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Новая пара токенов
 *       401:
 *         description: Невалидный refresh token
 */
router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    const result = await service.refreshToken(refreshToken);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Получить текущего пользователя
 *     responses:
 *       200:
 *         description: Данные пользователя
 *       401:
 *         description: Не авторизован
 */
router.get('/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await service.getMe(req.user!.userId);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Выход из системы (отзыв refresh token)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успешный выход
 */
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await service.logout(refreshToken);
    }
    res.json({ data: { message: 'Выход выполнен успешно' } });
  } catch (err) {
    next(err);
  }
});

export { router as authRoutes };
