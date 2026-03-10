// src/shared/middleware/error-handler.ts
// Централизованная обработка ошибок API

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types/common';

/** Класс ошибки приложения с кодом и статусом HTTP */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, string>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Middleware обработки ошибок — последний в цепочке */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[ERROR]', err.message, err.stack);

  if (err instanceof AppError) {
    const body: ApiError = {
      error: err.message,
      code: err.code,
      details: err.details,
    };
    res.status(err.statusCode).json(body);
    return;
  }

  // Ошибки валидации express
  if (err.name === 'ValidationError') {
    const body: ApiError = {
      error: err.message,
      code: 'VALIDATION_ERROR',
    };
    res.status(400).json(body);
    return;
  }

  // Неизвестная ошибка
  const body: ApiError = {
    error: process.env.NODE_ENV === 'production'
      ? 'Внутренняя ошибка сервера'
      : err.message,
    code: 'INTERNAL_ERROR',
  };
  res.status(500).json(body);
}
