'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getTheme, setTheme, type ThemeMode } from '@/lib/theme';

export function ThemeToggle() {
    const [mode, setMode] = useState<ThemeMode>('dark');

    useEffect(() => {
        setMode(getTheme());
    }, []);

    const isDark = mode === 'dark';

    return (
        <button
            type="button"
            onClick={() => {
                const next: ThemeMode = isDark ? 'light' : 'dark';
                setTheme(next);
                setMode(next);
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
        >
            {isDark ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : <Moon className="w-4 h-4" strokeWidth={1.5} />}
            <span className="hidden sm:inline">{isDark ? 'Açık tema' : 'Koyu tema'}</span>
        </button>
    );
}

