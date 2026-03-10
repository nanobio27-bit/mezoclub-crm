// src/shared/utils/validation.ts
// Хелперы валидации запросов

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { AppError } from '../middleware/error-handler';

/**
 * Middleware валидации тела запроса через Zod-схему.
 * Использование: router.post('/', validate(createClientSchema), handler)
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const path = err.path.join('.');
        details[path] = err.message;
      });
      throw new AppError(400, 'VALIDATION_ERROR', 'Ошибка валидации данных', details);
    }
    req.body = result.data;
    next();
  };
}

/**
 * Парсинг параметров пагинации из query string
 */
export function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10) || 20));
  const search = query.search ? String(query.search) : undefined;
  const sortBy = query.sortBy ? String(query.sortBy) : 'created_at';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' as const : 'desc' as const;

  return { page, limit, search, sortBy, sortOrder };
}
