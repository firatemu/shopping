import { create } from 'zustand';
import { api } from '../lib/api';
import { authStorage } from '../lib/storage';
import type { AuthResponse, AuthUser, LoginPayload } from '../types/auth';

type AuthState = {
  user: AuthUser | null;
  tenantId: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  hydrate: () => void;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenantId: null,
  isAuthenticated: false,
  isHydrated: false,

  hydrate: () => {
    const accessToken = authStorage.getAccessToken();
    const user = authStorage.getUser();
    const tenantId = authStorage.getTenantId();

    set({
      user,
      tenantId,
      isAuthenticated: Boolean(accessToken && user && tenantId),
      isHydrated: true,
    });
  },

  login: async (payload) => {
    const response = await api.post<AuthResponse>('/auth/login', payload);
    const { accessToken, refreshToken, user } = response.data;

    authStorage.setAccessToken(accessToken);
    authStorage.setRefreshToken(refreshToken);
    authStorage.setTenantId(user.tenantId);
    authStorage.setUser(user);

    set({
      user,
      tenantId: user.tenantId,
      isAuthenticated: true,
      isHydrated: true,
    });
  },

  logout: () => {
    authStorage.clear();
    set({
      user: null,
      tenantId: null,
      isAuthenticated: false,
      isHydrated: true,
    });
  },
}));
