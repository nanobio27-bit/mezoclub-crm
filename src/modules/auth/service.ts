import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../shared/database/pool';
import { ApiError } from '../../shared/types/api-error';
import { User, TokenPair, JwtPayload, RegisterInput, LoginInput } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const ACCESS_TTL = '15m';
const REFRESH_TTL_DAYS = 7;

function generateAccessToken(user: User): string {
  const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL });
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createRefreshToken(userId: number, familyId?: string): Promise<string> {
  const token = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(token);
  const family = familyId || uuidv4();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at) VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, family, expiresAt]
  );

  return token;
}

export async function register(input: RegisterInput): Promise<TokenPair> {
  const existing = await query('SELECT id FROM users WHERE email = $1', [input.email]);
  if (existing.rows.length > 0) {
    throw ApiError.conflict('Email already registered');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const result = await query(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *',
    [input.email, passwordHash, input.name]
  );
  const user: User = result.rows[0];

  return {
    accessToken: generateAccessToken(user),
    refreshToken: await createRefreshToken(user.id),
  };
}

export async function login(input: LoginInput): Promise<TokenPair> {
  const result = await query('SELECT * FROM users WHERE email = $1 AND is_active = true', [input.email]);
  const user: User | undefined = result.rows[0];

  if (!user || !(await bcrypt.compare(input.password, user.password_hash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  return {
    accessToken: generateAccessToken(user),
    refreshToken: await createRefreshToken(user.id),
  };
}

export async function refreshTokens(oldToken: string): Promise<TokenPair> {
  const tokenHash = hashToken(oldToken);

  const result = await query(
    'SELECT * FROM refresh_tokens WHERE token_hash = $1',
    [tokenHash]
  );
  const stored = result.rows[0];

  if (!stored) {
    throw ApiError.unauthorized('Invalid refresh token', 'AUTH_TOKEN_EXPIRED');
  }

  // Reuse detection: if token already revoked, invalidate entire family
  if (stored.is_revoked) {
    await query('UPDATE refresh_tokens SET is_revoked = true WHERE family_id = $1', [stored.family_id]);
    throw ApiError.unauthorized('Refresh token reuse detected — all sessions revoked', 'AUTH_TOKEN_EXPIRED');
  }

  if (new Date(stored.expires_at) < new Date()) {
    throw ApiError.unauthorized('Refresh token expired', 'AUTH_TOKEN_EXPIRED');
  }

  // Revoke old token
  await query('UPDATE refresh_tokens SET is_revoked = true WHERE id = $1', [stored.id]);

  const userResult = await query('SELECT * FROM users WHERE id = $1 AND is_active = true', [stored.user_id]);
  const user: User | undefined = userResult.rows[0];
  if (!user) {
    throw ApiError.unauthorized('User not found or inactive');
  }

  const newRefresh = await createRefreshToken(user.id, stored.family_id);

  return {
    accessToken: generateAccessToken(user),
    refreshToken: newRefresh,
  };
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  const result = await query('SELECT family_id FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
  if (result.rows[0]) {
    await query('UPDATE refresh_tokens SET is_revoked = true WHERE family_id = $1', [result.rows[0].family_id]);
  }
}

export async function getProfile(userId: number): Promise<Omit<User, 'password_hash'> | null> {
  const result = await query(
    'SELECT id, email, name, role, is_active, created_at, updated_at FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

export async function listUsers(): Promise<Omit<User, 'password_hash'>[]> {
  const result = await query(
    'SELECT id, email, name, role, is_active, created_at, updated_at FROM users ORDER BY id'
  );
  return result.rows;
}

export async function createUser(input: {
  email: string;
  password: string;
  name: string;
  role?: string;
}): Promise<Omit<User, 'password_hash'>> {
  const existing = await query('SELECT id FROM users WHERE email = $1', [input.email]);
  if (existing.rows.length > 0) {
    throw ApiError.conflict('Email already registered');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const result = await query(
    'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, is_active, created_at, updated_at',
    [input.email, passwordHash, input.name, input.role || 'manager']
  );
  return result.rows[0];
}

export async function updateUser(
  userId: number,
  updates: { name?: string; email?: string; role?: string; is_active?: boolean }
): Promise<Omit<User, 'password_hash'>> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(updates.email);
  }
  if (updates.role !== undefined) {
    fields.push(`role = $${paramIndex++}`);
    values.push(updates.role);
  }
  if (updates.is_active !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(updates.is_active);
  }

  if (fields.length === 0) {
    throw ApiError.badRequest('No fields to update');
  }

  fields.push(`updated_at = NOW()`);
  values.push(userId);

  const result = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, name, role, is_active, created_at, updated_at`,
    values
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('User not found');
  }

  return result.rows[0];
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) {
    throw ApiError.notFound('User not found');
  }

  const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!valid) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
    newHash,
    userId,
  ]);
}
