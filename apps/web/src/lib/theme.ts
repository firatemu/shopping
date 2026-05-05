export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'textilepos-theme';

export function getTheme(): ThemeMode {
    if (typeof document === 'undefined') return 'dark';
    const root = document.documentElement;
    return root.classList.contains('light') ? 'light' : 'dark';
}

export function setTheme(mode: ThemeMode) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (mode === 'dark') root.classList.remove('light');
    else root.classList.add('light');
    try {
        localStorage.setItem(STORAGE_KEY, mode);
    } catch {
        // ignore
    }
}

