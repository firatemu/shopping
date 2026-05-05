'use client';

import * as React from 'react';

type ThemeMode = 'dark' | 'light';
const STORAGE_KEY = 'textilepos-theme';

function applyTheme(mode: ThemeMode) {
    const root = document.documentElement;
    if (mode === 'dark') root.classList.remove('light');
    else root.classList.add('light');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    React.useEffect(() => {
        try {
            const saved = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? null;
            if (saved === 'dark' || saved === 'light') {
                applyTheme(saved);
                return;
            }
            // default: dark (matches current CSS variables)
            applyTheme('dark');
        } catch {
            applyTheme('dark');
        }
    }, []);

    return <>{children}</>;
}

