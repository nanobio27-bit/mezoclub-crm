export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  is_active: boolean;
  is_ai: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
