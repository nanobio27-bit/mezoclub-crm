// src/modules/auth/repository.ts
// Репозиторий авторизации — работа с users и refresh_tokens

import { Pool } from 'pg';
import { UserRow, RefreshTokenRow } from './types';

export class AuthRepository {
  constructor(private pool: Pool) {}

  /** Найти пользователя по email */
  async findUserByEmail(email: string): Promise<UserRow | null> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    return result.rows[0] || null;
  }

  /** Найти пользователя по ID */
  async findUserById(id: number): Promise<UserRow | null> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0] || null;
  }

  /** Создать нового пользователя */
  async createUser(data: {
    email: string;
    passwordHash: string;
    name: string;
    roles: string[];
    phone?: string;
  }): Promise<UserRow> {
    const result = await this.pool.query(
      `INSERT INTO users (email, password_hash, name, roles, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.email, data.passwordHash, data.name, data.roles, data.phone || null]
    );
    return result.rows[0];
  }

  /** Привязать пользователя к тенанту */
  async linkUserToTenant(userId: number, tenantId: number, roles: string[]): Promise<void> {
    await this.pool.query(
      `INSERT INTO user_tenants (user_id, tenant_id, roles, is_default)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (user_id, tenant_id) DO NOTHING`,
      [userId, tenantId, roles]
    );
  }

  /** Получить тенант пользователя по умолчанию */
  async getDefaultTenant(userId: number): Promise<{ tenant_id: number; roles: string[] } | null> {
    const result = await this.pool.query(
      `SELECT tenant_id, roles FROM user_tenants 
       WHERE user_id = $1 AND is_default = true
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  /** Сохранить refresh token */
  async saveRefreshToken(data: {
    userId: number;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
  }): Promise<RefreshTokenRow> {
    const result = await this.pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.userId, data.tokenHash, data.familyId, data.expiresAt]
    );
    return result.rows[0];
  }

  /** Найти refresh token по хешу */
  async findRefreshToken(tokenHash: string): Promise<RefreshTokenRow | null> {
    const result = await this.pool.query(
      `SELECT * FROM refresh_tokens 
       WHERE token_hash = $1 AND is_revoked = false AND expires_at > NOW()`,
      [tokenHash]
    );
    return result.rows[0] || null;
  }

  /** Отозвать refresh token */
  async revokeRefreshToken(id: number, replacedBy?: number): Promise<void> {
    await this.pool.query(
      `UPDATE refresh_tokens SET is_revoked = true, replaced_by = $2 WHERE id = $1`,
      [id, replacedBy || null]
    );
  }

  /** Отозвать все токены семейства (при подозрении на кражу) */
  async revokeTokenFamily(familyId: string): Promise<void> {
    await this.pool.query(
      'UPDATE refresh_tokens SET is_revoked = true WHERE family_id = $1',
      [familyId]
    );
  }

  /** Обновить время последнего входа */
  async updateLastLogin(userId: number): Promise<void> {
    await this.pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [userId]
    );
  }
}
