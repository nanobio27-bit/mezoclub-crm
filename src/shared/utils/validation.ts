// src/shared/utils/validation.ts
// Хелперы валидации запросов

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { AppError } from '../middleware/error-handler';

/**
 * Конвертация snake_case → camelCase
 * Пример: client_id → clientId, discount_percent → discountPercent
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Рекурсивная трансформация ключей объекта из snake_case в camelCase
 */
function transformKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(transformKeys);
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[snakeToCamel(key)] = transformKeys(value);
    }
    return result;
  }
  return obj;
}

/**
 * Middleware валидации тела запроса через Zod-схему.
 * Автоматически преобразует snake_case ключи в camelCase перед валидацией.
 * Использование: router.post('/', validate(createClientSchema), handler)
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Преобразуем snake_case → camelCase перед валидацией
    const transformed = transformKeys(req.body);
    const result = schema.safeParse(transformed);
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
