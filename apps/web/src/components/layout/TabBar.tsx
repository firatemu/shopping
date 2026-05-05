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
    const addTab = useTabStore((s) => s.addTab);

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
        <div className="flex items-center h-8 border-b border-border bg-background overflow-x-auto">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id, tab.path)}
                    className={cn(
                        'group flex items-center gap-1.5 px-3 h-8 text-xs whitespace-nowrap border-r border-border transition-colors',
                        activeTabId === tab.id
                            ? 'bg-card text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                    )}
                >
                    <span className="truncate max-w-[120px]">{tab.title}</span>
                    {tab.closable && (
                        <span
                            onClick={(e) => handleClose(e, tab.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted transition-opacity"
                        >
                            <X className="w-3 h-3" />
                        </span>
                    )}
                </button>
            ))}

            {tabs.length < 6 && (
                <button
                    className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="Yeni sekme (Ctrl+T)"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}
