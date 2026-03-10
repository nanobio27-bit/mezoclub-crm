// src/modules/auth/service.ts
// Бизнес-логика авторизации: логин, регистрация, refresh, logout

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { AuthRepository } from './repository';
import { AppError } from '../../shared/middleware/error-handler';
import { JwtPayload, AuthResponse, UserRole } from '../../shared/types/common';

const SALT_ROUNDS = 12;

export class AuthService {
  constructor(private repo: AuthRepository) {}

  /** Вход по email + пароль → access + refresh токены */
  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.repo.findUserByEmail(email);
    if (!user) {
      throw new AppError(401, 'AUTH_INVALID_CREDENTIALS', 'Неверный email или пароль');
    }

    if (!user.is_active) {
      throw new AppError(403, 'AUTH_ACCOUNT_DISABLED', 'Аккаунт деактивирован');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AppError(401, 'AUTH_INVALID_CREDENTIALS', 'Неверный email или пароль');
    }

    // Получаем тенант пользователя
    const tenantInfo = await this.repo.getDefaultTenant(user.id);
    if (!tenantInfo) {
      throw new AppError(403, 'AUTH_NO_TENANT', 'Пользователь не привязан к организации');
    }

    // Генерация токенов
    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      roles: user.roles as UserRole[],
      accountType: user.account_type,
      tenantId: tenantInfo.tenant_id,
    });

    const refreshToken = await this.generateRefreshToken(user.id);

    // Обновляем время последнего входа
    await this.repo.updateLastLogin(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles as UserRole[],
        accountType: user.account_type as 'internal' | 'external',
        phone: user.phone || undefined,
        avatarUrl: user.avatar_url || undefined,
        isActive: user.is_active,
        lastLoginAt: user.last_login_at || undefined,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      accessToken,
      refreshToken,
    };
  }

  /** Регистрация нового пользователя (только owner/admin может) */
  async register(data: {
    email: string;
    password: string;
    name: string;
    roles?: string[];
    phone?: string;
  }, creatorTenantId: number): Promise<AuthResponse> {
    // Проверяем уникальность email
    const existing = await this.repo.findUserByEmail(data.email);
    if (existing) {
      throw new AppError(409, 'AUTH_EMAIL_EXISTS', 'Пользователь с таким email уже существует');
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Создаём пользователя
    const roles = data.roles || ['sales'];
    const user = await this.repo.createUser({
      email: data.email,
      passwordHash,
      name: data.name,
      roles,
      phone: data.phone,
    });

    // Привязываем к тенанту создателя
    await this.repo.linkUserToTenant(user.id, creatorTenantId, roles);

    // Генерация токенов
    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      roles: user.roles as UserRole[],
      accountType: user.account_type,
      tenantId: creatorTenantId,
    });

    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles as UserRole[],
        accountType: user.account_type as 'internal' | 'external',
        phone: user.phone || undefined,
        avatarUrl: user.avatar_url || undefined,
        isActive: user.is_active,
        lastLoginAt: user.last_login_at || undefined,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      accessToken,
      refreshToken,
    };
  }

  /** Обновление access token через refresh token (ротация) */
  async refreshToken(refreshTokenValue: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = this.hashToken(refreshTokenValue);
    const storedToken = await this.repo.findRefreshToken(tokenHash);

    if (!storedToken) {
      throw new AppError(401, 'AUTH_REFRESH_INVALID', 'Невалидный или истёкший refresh token');
    }

    // Получаем пользователя
    const user = await this.repo.findUserById(storedToken.user_id);
    if (!user || !user.is_active) {
      await this.repo.revokeTokenFamily(storedToken.family_id);
      throw new AppError(401, 'AUTH_ACCOUNT_DISABLED', 'Аккаунт деактивирован');
    }

    // Получаем тенант
    const tenantInfo = await this.repo.getDefaultTenant(user.id);
    if (!tenantInfo) {
      throw new AppError(403, 'AUTH_NO_TENANT', 'Пользователь не привязан к организации');
    }

    // Ротация: отзываем старый, создаём новый
    const newRefreshToken = await this.generateRefreshToken(user.id, storedToken.family_id);
    
    // Находим новый токен для получения его ID
    const newTokenHash = this.hashToken(newRefreshToken);
    const newStoredToken = await this.repo.findRefreshToken(newTokenHash);
    
    await this.repo.revokeRefreshToken(storedToken.id, newStoredToken?.id);

    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      roles: user.roles as UserRole[],
      accountType: user.account_type,
      tenantId: tenantInfo.tenant_id,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  /** Получить текущего пользователя по ID из JWT */
  async getMe(userId: number) {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'Пользователь не найден');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles as UserRole[],
      accountType: user.account_type as 'internal' | 'external',
      phone: user.phone || undefined,
      avatarUrl: user.avatar_url || undefined,
      isActive: user.is_active,
      lastLoginAt: user.last_login_at || undefined,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  /** Выход — отзыв refresh token */
  async logout(refreshTokenValue: string): Promise<void> {
    const tokenHash = this.hashToken(refreshTokenValue);
    const storedToken = await this.repo.findRefreshToken(tokenHash);
    if (storedToken) {
      await this.repo.revokeRefreshToken(storedToken.id);
    }
  }

  // === Приватные методы ===

  /** Генерация JWT access token (15 мин) */
  private generateAccessToken(payload: JwtPayload): string {
    const secret = process.env.JWT_SECRET || 'default_secret';
    return jwt.sign(payload as object, secret, {
      expiresIn: '15m',
    });
  }

  /** Генерация refresh token (7 дней), сохранение хеша в БД */
  private async generateRefreshToken(userId: number, familyId?: string): Promise<string> {
    const token = uuidv4() + '-' + crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.repo.saveRefreshToken({
      userId,
      tokenHash,
      familyId: familyId || uuidv4(),
      expiresAt,
    });

    return token;
  }

  /** SHA-256 хеш токена для хранения в БД */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
