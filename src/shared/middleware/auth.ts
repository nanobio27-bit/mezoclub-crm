// src/shared/middleware/auth.ts
// Middleware авторизации: проверка JWT и ролей

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../types/common';
import { AppError } from './error-handler';

/** Расширяем Request типом пользователя из JWT */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * authMiddleware — проверяет JWT токен из заголовка Authorization.
 * Подставляет req.user с tenantId, userId, roles.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, 'AUTH_TOKEN_REQUIRED', 'Токен авторизации не предоставлен');
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET || 'default_secret';
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = payload;
    next();
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'AUTH_TOKEN_EXPIRED', 'Токен авторизации истёк');
    }
    throw new AppError(401, 'AUTH_TOKEN_INVALID', 'Невалидный токен авторизации');
  }
}

/**
 * roleMiddleware — проверяет, что у пользователя есть одна из указанных ролей.
 * Использовать после authMiddleware.
 */
export function roleMiddleware(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, 'AUTH_TOKEN_REQUIRED', 'Необходима авторизация');
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      throw new AppError(403, 'AUTH_FORBIDDEN', 'Недостаточно прав для выполнения операции');
    }

    next();
  };
}
