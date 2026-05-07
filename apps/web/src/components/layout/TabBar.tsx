'use client';

import { useRouter } from 'next/navigation';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTabStore } from '@/stores/useTabStore';
import { useEffect } from 'react';

export function TabBar() {
    const router = useRouter();
    const tabs = useTabStore((s) => s.tabs);
    const activeTabId = useTabStore((s) => s.activeTabId);
    const setActiveTab = useTabStore((s) => s.setActiveTab);
    const closeTab = useTabStore((s) => s.closeTab);
    const handleTabClick = (id: string, path: string) => {
        setActiveTab(id);
        router.push(path);
    };

    const handleClose = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const tab = tabs.find((t) => t.id === id);
        if (!tab?.closable) return;
        closeTab(id);
        const remaining = tabs.filter((t) => t.id !== id);
        if (activeTabId === id && remaining.length > 0) {
            router.push(remaining[remaining.length - 1].path);
        }
    };

    // Keyboard shortcuts: Ctrl+T (new tab), Ctrl+W (close tab)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                // no-op: new tab opens from sidebar nav
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
                e.preventDefault();
                if (activeTabId) closeTab(activeTabId);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [activeTabId, closeTab]);

    return (
        <div className="flex items-stretch min-h-9 border-b border-border/80 bg-gradient-to-b from-muted/55 to-muted/25 dark:from-muted/35 dark:to-muted/15 overflow-x-auto">
            {tabs.map((tab) => {
                const active = activeTabId === tab.id;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleTabClick(tab.id, tab.path)}
                        className={cn(
                            'group relative flex items-center gap-1.5 px-3.5 min-h-9 text-xs whitespace-nowrap border-r border-border/60',
                            'transition-[color,background-color,box-shadow] duration-200 ease-out',
                            active
                                ? 'bg-background text-primary font-semibold shadow-[0_-1px_0_0_hsl(var(--background)),inset_0_1px_0_0_hsl(var(--border))] dark:bg-card dark:text-primary dark:shadow-[0_1px_0_0_hsl(var(--card))]'
                                : 'text-muted-foreground hover:text-foreground hover:bg-primary/12 dark:hover:bg-primary/20 hover:shadow-sm',
                            active &&
                                'after:pointer-events-none after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-t-sm after:bg-primary after:shadow-[0_0_12px_hsl(var(--primary)/0.45)]',
                        )}
                    >
                        <span className={cn('truncate max-w-[140px]', active && 'tracking-tight')}>{tab.title}</span>
                        {tab.closable && (
                            <span
                                role="presentation"
                                onClick={(e) => handleClose(e, tab.id)}
                                className={cn(
                                    'shrink-0 p-0.5 rounded-md transition-colors',
                                    active
                                        ? 'text-primary/70 opacity-80 hover:opacity-100 hover:bg-primary/15 hover:text-primary'
                                        : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-destructive/15 hover:text-destructive',
                                )}
                            >
                                <X className="w-3.5 h-3.5" strokeWidth={2} />
                            </span>
                        )}
                    </button>
                );
            })}

            {tabs.length < 6 && (
                <button
                    type="button"
                    className="flex items-center justify-center min-w-9 min-h-9 px-2 text-muted-foreground hover:text-primary hover:bg-primary/12 dark:hover:bg-primary/20 border-l border-border/40 transition-colors duration-200"
                    title="Yeni sekme (Ctrl+T)"
                >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
            )}
        </div>
    );
}
