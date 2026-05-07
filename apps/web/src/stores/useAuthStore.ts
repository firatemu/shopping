'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCartStore } from '@/stores/useCartStore';
import { useTabStore } from '@/stores/useTabStore';

interface User {
    id: string;
    tenantId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            isAuthenticated: false,

            setAuth: (user, token) => set({ user, accessToken: token, isAuthenticated: true }),
            logout: () => {
                useTabStore.getState().resetTabs();
                useCartStore.getState().clearCart();
                set({ user: null, accessToken: null, isAuthenticated: false });
            },
        }),
        { name: 'textilepos-auth' },
    ),
);
