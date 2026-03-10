// src/shared/config/swagger.ts
// Конфигурация Swagger/OpenAPI документации

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MezoClub CRM API',
      version: '1.0.0',
      description: 'API для CRM дистрибьютора профессиональной косметики MezoClub',
      contact: {
        name: 'MezoClub',
        url: 'https://mezoclub.com.ua',
        email: 'support@mezoclub.com.ua',
      },
    },
    servers: [
      {
        url: process.env.PUBLIC_URL || 'http://localhost:3001',
        description: process.env.PUBLIC_URL ? 'Публичный сервер' : 'Локальный сервер разработки',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT токен авторизации. Получить через POST /api/auth/login',
        },
      },
      schemas: {
        ApiError: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Человекочитаемое сообщение ошибки' },
            code: { type: 'string', description: 'Машинный код ошибки (AUTH_FORBIDDEN, NOT_FOUND...)' },
            details: { type: 'object', description: 'Детали ошибки (поля валидации)' },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            total: { type: 'integer', description: 'Общее количество записей' },
            page: { type: 'integer', description: 'Текущая страница' },
            limit: { type: 'integer', description: 'Записей на странице' },
            pages: { type: 'integer', description: 'Всего страниц' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/*/routes.ts', './src/server/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
