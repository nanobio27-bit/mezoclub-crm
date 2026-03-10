import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../shared/swagger';
import { apiLimiter } from '../shared/middleware/rate-limiter';
import { errorHandler } from '../shared/middleware/error-handler';
import authRoutes from '../modules/auth/routes';
import clientRoutes from '../modules/clients/routes';
import productRoutes from '../modules/products/routes';
import orderRoutes from '../modules/orders/routes';
import dashboardRoutes from '../modules/dashboard/routes';
import gincoinRoutes from '../modules/gincoin/routes';
import ratingRoutes from '../modules/rating/routes';
import kpiRoutes from '../modules/kpi/routes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/gincoin', gincoinRoutes);
app.use('/api/rating', ratingRoutes);
app.use('/api/kpi', kpiRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
