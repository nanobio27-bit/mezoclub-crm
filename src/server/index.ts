// src/server/index.ts
// Точка входа Express-приложения MezoClub CRM

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../shared/config/swagger';
import { errorHandler } from '../shared/middleware/error-handler';
import pool from '../shared/database/pool';

// Модули
import { authRoutes } from '../modules/auth';
import { clientRoutes } from '../modules/clients';
import { productRoutes } from '../modules/products';
import { orderRoutes } from '../modules/orders';
import { dashboardRoutes } from '../modules/dashboard';

const app = express();
const PORT = process.env.PORT || 3001;

// === Middleware ===
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting для авторизации
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 50,
  message: { error: 'Слишком много попыток. Попробуйте через 15 минут.', code: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
});

// === Swagger документация ===
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MezoClub CRM API',
}));

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Проверка состояния сервера
 *     security: []
 *     responses:
 *       200:
 *         description: Сервер работает
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                 version:
 *                   type: string
 */
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      database: 'connected',
    });
  } catch {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

// === API маршруты ===
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);

// === Обработка ошибок ===
app.use(errorHandler);

// === Запуск сервера ===
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`\n🚀 MezoClub CRM API запущен: http://localhost:${PORT}`);
  console.log(`📚 Swagger документация: http://localhost:${PORT}/api-docs`);
  console.log(`💊 Health check: http://localhost:${PORT}/health\n`);
});

export default app;
