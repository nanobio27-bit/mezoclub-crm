// src/modules/auth/types.ts
// Типы модуля авторизации

import { z } from 'zod';

/** Схема валидации логина */
export const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Пароль обязателен'),
});

/** Схема валидации регистрации */
export const registerSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(8, 'Пароль должен содержать минимум 8 символов'),
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  roles: z.array(z.string()).optional(),
  phone: z.string().optional(),
});

/** Схема валидации refresh token */
export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token обязателен'),
});

/** Строка из БД для пользователя */
export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  roles: string[];
  account_type: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  preferred_language: string;
  last_login_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** Строка refresh_token из БД */
export interface RefreshTokenRow {
  id: number;
  user_id: number;
  token_hash: string;
  family_id: string;
  is_revoked: boolean;
  expires_at: Date;
  replaced_by: number | null;
  created_at: Date;
}
