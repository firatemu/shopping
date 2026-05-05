'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Tab {
    id: string;
    title: string;
    path: string;
    icon?: string;
    closable: boolean;
}

interface TabState {
    tabs: Tab[];
    activeTabId: string | null;
    addTab: (tab: Omit<Tab, 'id'>) => void;
    closeTab: (id: string) => void;
    setActiveTab: (id: string) => void;
    closeOtherTabs: (id: string) => void;
}

const MAX_TABS = 6;

export const useTabStore = create<TabState>()(
    persist(
        (set, get) => ({
            tabs: [{ id: 'dashboard', title: 'Dashboard', path: '/dashboard', closable: false }],
            activeTabId: 'dashboard',

            addTab: (tab) => {
                const { tabs } = get();
                const existing = tabs.find((t) => t.path === tab.path);
                if (existing) {
                    set({ activeTabId: existing.id });
                    return;
                }
                if (tabs.length >= MAX_TABS) return;
                const id = `tab-${Date.now()}`;
                set({ tabs: [...tabs, { ...tab, id }], activeTabId: id });
            },

            closeTab: (id) => {
                const { tabs, activeTabId } = get();
                const tab = tabs.find((t) => t.id === id);
                if (!tab?.closable) return;
                const filtered = tabs.filter((t) => t.id !== id);
                const newActive = activeTabId === id
                    ? filtered[filtered.length - 1]?.id ?? null
                    : activeTabId;
                set({ tabs: filtered, activeTabId: newActive });
            },

            setActiveTab: (id) => set({ activeTabId: id }),

            closeOtherTabs: (id) => {
                const { tabs } = get();
                set({ tabs: tabs.filter((t) => t.id === id || !t.closable), activeTabId: id });
            },
        }),
        { name: 'textilepos-tabs' },
    ),
);
