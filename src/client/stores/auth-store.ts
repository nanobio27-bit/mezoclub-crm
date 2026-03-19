// Zustand store для авторизации
import { create } from 'zustand';
import apiClient from '../services/api-client';

interface User {
  id: number;
  email: string;
  name: string;
  roles: string[];
  accountType: string;
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: unknown) {
      const errorCode =
        (err as { response?: { data?: { code?: string } } }).response?.data?.code || 'INTERNAL_ERROR';
      set({ error: errorCode, isLoading: false });
    }
  },

  logout: () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      apiClient.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ isAuthenticated: false });
      return;
    }
    try {
      const { data } = await apiClient.get('/auth/me');
      set({ user: data.data, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },
}));
